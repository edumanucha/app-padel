-- Épica 2: US-2.4 (confirmar / cancelar asistencia)
-- Correr en el SQL Editor de Supabase, después de 006_us2_3_invitar_jugadores.sql.
--
-- No hace falta tocar RLS para "confirmar asistencia" (UPDATE a
-- "confirmado") ni para el cálculo de completo/abierto -- ya funcionan
-- con lo que existe desde 002/005 (política "Actualizar mi propia
-- participación" + `recalcular_estado_partido`).
--
-- Lo que sí es nuevo: la decisión del usuario de que salir de un partido
-- (anotado o confirmado) solo se permite hasta 1 hora antes de la fecha
-- del partido -- evita bajas de último momento que dejan al resto sin
-- poder reemplazarlo a tiempo, sea cual sea el estado del jugador. No
-- aplica a rechazar una invitación (estado "invitado"): ahí nunca hubo
-- un lugar realmente ocupado, así que no hay nada que "liberar tarde".
create or replace function public.validar_cancelacion_confirmado()
returns trigger as $$
declare
  v_fecha_hora timestamptz;
begin
  if old.estado in ('anotado', 'confirmado') then
    select fecha_hora into v_fecha_hora
    from public.partidos where id = old.partido_id;

    if v_fecha_hora - now() < interval '1 hour' then
      raise exception 'Ya no podés salir del partido: falta menos de 1 hora para el partido.';
    end if;
  end if;

  return old;
end;
$$ language plpgsql;

create trigger trg_validar_cancelacion_confirmado
before delete on public.partido_jugadores
for each row execute function public.validar_cancelacion_confirmado();
