-- Épica 2: Validaciones de "Crear partido" (BUG-004, BUG-005)
-- Correr en el SQL Editor de Supabase, después de 002_partidos.sql.
--
-- Contexto: al probar "Crear partido" a mano se detectó que las dos
-- validaciones del formulario (fecha a futuro, cantidad de jugadores)
-- solo existían en el frontend -- alguien podía saltearlas insertando
-- directo contra la API de Supabase (mismo tipo de gap que ya se vio en
-- la Épica 1). Estas dos correcciones las llevan a la base.

-- =========================================================
-- BUG-004: cantidad_jugadores sin tope superior (aceptaba, ej., 1000)
-- =========================================================
-- Decisión (2026-09-05, confirmada por el usuario): tope MVP en 4
-- (dobles estándar de pádel). El campo se mantiene variable entre 2 y 4
-- en vez de fijo en 4 para no perder la flexibilidad ya decidida en
-- historias-usuario-mvp.md (soporta singles=2); formatos más grandes
-- (americano, torneos) quedan fuera del MVP.
-- Limpieza previa: el partido de prueba creado al reproducir BUG-004
-- (cantidad_jugadores = 1000) viola la constraint nueva antes de poder
-- crearla. Es dato de prueba, no de un usuario real -- se borra para
-- poder aplicar el tope. Se borra primero `partido_jugadores` (la fila
-- del organizador que el trigger `trg_agregar_organizador` crea sola) por
-- la foreign key. Si en el futuro hay partidos reales fuera de rango por
-- otro motivo, revisar antes de correr este DELETE de nuevo.
delete from public.partido_jugadores
where partido_id in (
  select id from public.partidos where cantidad_jugadores not between 2 and 4
);

delete from public.partidos where cantidad_jugadores not between 2 and 4;

alter table public.partidos
  drop constraint if exists partidos_cantidad_jugadores_check;

alter table public.partidos
  add constraint partidos_cantidad_jugadores_check
  check (cantidad_jugadores between 2 and 4);

-- =========================================================
-- BUG-005: fecha_hora en el pasado no se validaba en el servidor
-- =========================================================
-- No se usa un CHECK constraint acá a propósito: un CHECK se
-- reevalúa en cada UPDATE, no solo en el INSERT, así que un partido
-- creado a futuro que luego se cancela (UPDATE) después de que su fecha
-- ya pasó rompería el UPDATE si comparáramos contra now() en un CHECK.
-- Un trigger BEFORE INSERT valida solo en el momento de la creación.
create or replace function public.validar_fecha_futura_partido()
returns trigger as $$
begin
  if new.fecha_hora <= now() then
    raise exception 'La fecha y hora del partido tienen que ser a futuro.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validar_fecha_futura_partido
before insert on public.partidos
for each row execute function public.validar_fecha_futura_partido();
