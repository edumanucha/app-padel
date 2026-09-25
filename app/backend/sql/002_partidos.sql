-- Épica 2: Gestión de Partidos
-- Correr completo en el SQL Editor de Supabase (mismo proyecto app-padel).
-- Nota: la tabla `perfiles` (Épica 1) no tiene su SQL guardado en este
-- repo porque se corrió antes de adoptar esta carpeta -- a partir de acá,
-- toda tabla nueva guarda su script acá para que quede reproducible.

-- =========================================================
-- Tabla: partidos
-- =========================================================
create table public.partidos (
  id uuid primary key default gen_random_uuid(),
  organizador_id uuid not null references public.perfiles(id),
  fecha_hora timestamptz not null,
  cancha text not null,
  -- Decisión (2026-09-05, "Crear la app"): la cantidad de jugadores es
  -- VARIABLE, la especifica el organizador al crear el partido (no fija en
  -- 4) -- así se puede usar para singles, dobles o formatos tipo americano
  -- sin modelar un tipo de partido aparte. Resuelve la pregunta abierta de
  -- US-2.1 en historias-usuario-mvp.md.
  cantidad_jugadores integer not null check (cantidad_jugadores >= 2),
  estado text not null default 'abierto'
    check (estado in ('abierto', 'completo', 'cancelado', 'jugado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_partidos_updated_at
before update on public.partidos
for each row execute function public.set_updated_at();

-- Recordatorio de la Épica 1: el CREATE TABLE no alcanza, Postgres exige
-- además este GRANT básico para el rol `authenticated` (si no, "permission
-- denied" aunque las políticas de RLS estén bien).
grant select, insert, update on public.partidos to authenticated;

alter table public.partidos enable row level security;

-- Cualquier usuario autenticado puede ver los partidos (para el listado de
-- "abiertos" de US-2.2) -- esta tabla no tiene datos sensibles en sí misma;
-- lo sensible (teléfono) vive en `perfiles` y se protege aparte.
create policy "Ver partidos" on public.partidos
  for select to authenticated
  using (true);

-- Crear un partido: solo como uno mismo de organizador.
create policy "Crear partido propio" on public.partidos
  for insert to authenticated
  with check (organizador_id = auth.uid());

-- Solo el organizador puede tocar su partido, y por ahora la única
-- transición que se permite hacer directamente desde el cliente es
-- cancelarlo (US-2.5). Los pasos a "completo" (todos confirmaron) y a
-- "jugado" (la fecha ya pasó) los maneja el sistema (triggers/función más
-- abajo), no el cliente directamente -- así un jugador no puede forzar por
-- API que un partido pase a "completo" antes de tiempo.
create policy "Organizador cancela su partido" on public.partidos
  for update to authenticated
  using (organizador_id = auth.uid())
  with check (organizador_id = auth.uid() and estado = 'cancelado');

-- =========================================================
-- Tabla: partido_jugadores
-- =========================================================
create table public.partido_jugadores (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos(id),
  jugador_id uuid not null references public.perfiles(id),
  estado text not null default 'anotado'
    check (estado in ('invitado', 'anotado', 'confirmado', 'rechazado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partido_id, jugador_id) -- no puedo sumarme dos veces al mismo partido (US-2.2)
);

create trigger trg_partido_jugadores_updated_at
before update on public.partido_jugadores
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.partido_jugadores to authenticated;

alter table public.partido_jugadores enable row level security;

-- Veo las filas de un partido si yo participo en él (como jugador o
-- organizador) -- así veo el resto del plantel de cualquier partido que
-- comparto (US-1.4/US-2.2), pero no el de partidos ajenos.
create policy "Ver participantes de mis partidos" on public.partido_jugadores
  for select to authenticated
  using (
    jugador_id = auth.uid()
    or exists (
      select 1 from public.partido_jugadores pj2
      where pj2.partido_id = partido_jugadores.partido_id
        and pj2.jugador_id = auth.uid()
    )
    or exists (
      select 1 from public.partidos pa
      where pa.id = partido_jugadores.partido_id
        and pa.organizador_id = auth.uid()
    )
  );

-- Dos formas de sumar una fila, y ambas las inicia el interesado, nunca en
-- nombre de otro salvo la invitación del organizador:
--  a) Sumarme yo mismo a un partido abierto (US-2.2): estado 'anotado'.
--  b) El organizador invita a otro jugador (US-2.3): estado 'invitado'.
-- El organizador NO se inserta a sí mismo acá -- eso lo hace
-- automáticamente el trigger de más abajo al crear el partido.
create policy "Sumarme o ser invitado" on public.partido_jugadores
  for insert to authenticated
  with check (
    (jugador_id = auth.uid() and estado = 'anotado')
    or (
      estado = 'invitado'
      and exists (
        select 1 from public.partidos pa
        where pa.id = partido_id and pa.organizador_id = auth.uid()
      )
    )
  );

-- Actualizar mi propia fila: aceptar invitación (invitado -> anotado),
-- confirmar asistencia (anotado -> confirmado). Rechazar invitación y
-- cancelar asistencia se hacen con DELETE (más abajo), no con UPDATE, para
-- no dejar estados intermedios raros.
create policy "Actualizar mi propia participación" on public.partido_jugadores
  for update to authenticated
  using (jugador_id = auth.uid())
  with check (jugador_id = auth.uid());

-- Salir de un partido (cancelar mi asistencia) o rechazar una invitación:
-- ambos casos son "sacar mi propia fila", libera el lugar para otros.
create policy "Salir de un partido o rechazar invitación" on public.partido_jugadores
  for delete to authenticated
  using (jugador_id = auth.uid());

-- =========================================================
-- Automatismos del estado del partido (SECURITY DEFINER: corren con más
-- permisos que el usuario que disparó la acción, para poder tocar la fila
-- de `partidos` aunque quien confirmó su asistencia no sea el organizador)
-- =========================================================

-- Al crear un partido, el organizador queda automáticamente anotado y
-- confirmado (US-2.1) -- lo hace el sistema, no un INSERT aparte del
-- cliente (evita tener que permitir por RLS que cualquiera se inserte a sí
-- mismo como "confirmado" directamente).
create or replace function public.agregar_organizador_como_confirmado()
returns trigger as $$
begin
  insert into public.partido_jugadores (partido_id, jugador_id, estado)
  values (new.id, new.organizador_id, 'confirmado');
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_agregar_organizador
after insert on public.partidos
for each row execute function public.agregar_organizador_como_confirmado();

-- Cada vez que cambia una fila de partido_jugadores (alguien confirma,
-- cancela, se suma, sale), recalculamos si el partido pasa a "completo" o
-- vuelve a "abierto" (US-2.4) -- así ningún cliente fuerza ese estado
-- directamente, lo calcula siempre el sistema a partir de los confirmados.
create or replace function public.recalcular_estado_partido()
returns trigger as $$
declare
  v_partido_id uuid := coalesce(new.partido_id, old.partido_id);
  v_cantidad integer;
  v_estado_actual text;
  v_confirmados integer;
begin
  select cantidad_jugadores, estado into v_cantidad, v_estado_actual
  from public.partidos where id = v_partido_id;

  select count(*) into v_confirmados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado = 'confirmado';

  if v_estado_actual = 'abierto' and v_confirmados >= v_cantidad then
    update public.partidos set estado = 'completo' where id = v_partido_id;
  elsif v_estado_actual = 'completo' and v_confirmados < v_cantidad then
    update public.partidos set estado = 'abierto' where id = v_partido_id;
  end if;

  return null;
end;
$$ language plpgsql security definer;

create trigger trg_recalcular_estado_partido
after insert or update or delete on public.partido_jugadores
for each row execute function public.recalcular_estado_partido();

-- Transición a "jugado" (US-2.5): no hay infraestructura de cron en este
-- proyecto, así que se recalcula "perezosamente" -- el frontend llama a
-- esta función (RPC) al cargar el listado/detalle de partidos, y acá se
-- marcan como jugados los que ya pasaron de fecha.
create or replace function public.marcar_partidos_jugados()
returns void as $$
begin
  update public.partidos
  set estado = 'jugado'
  where estado = 'completo' and fecha_hora < now();
end;
$$ language plpgsql security definer;

grant execute on function public.marcar_partidos_jugados() to authenticated;
