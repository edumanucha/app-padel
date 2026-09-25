-- Épica 6: Gestión Avanzada de Partidos (post-MVP).
-- US-6.3: rango de nivel opcional al crear un partido (informativo, no
-- bloqueante -- decisión del usuario, 2026-09-06).
alter table public.partidos
  add column if not exists nivel_min integer check (nivel_min between 1 and 7),
  add column if not exists nivel_max integer check (nivel_max between 1 and 7);

-- US-6.4: lista de espera -- nuevo estado de partido_jugadores que NO
-- ocupa cupo (lugares_ocupados solo cuenta 'anotado'/'confirmado', ver
-- 005_us2_2_listado_y_cupo.sql, así que 'en_espera' queda afuera de ese
-- conteo sin tocar esa lógica).
alter table public.partido_jugadores
  drop constraint if exists partido_jugadores_estado_check;

alter table public.partido_jugadores
  add constraint partido_jugadores_estado_check
  check (estado in ('invitado', 'anotado', 'confirmado', 'rechazado', 'en_espera'));

-- Evita re-notificar a la misma persona de la lista de espera muchas
-- veces si el trigger de recálculo corre de nuevo antes de que confirme.
alter table public.partido_jugadores
  add column if not exists avisado_lista_espera boolean not null default false;

-- US-6.5: no-show -- marcado por el organizador, solo informativo (no
-- afecta ranking ni bloquea nada, decisión del usuario 2026-09-06).
alter table public.partido_jugadores
  add column if not exists no_show boolean not null default false;

-- Sumar 'lugar_disponible' a los tipos de notificación válidos (US-3.4).
alter table public.notificaciones
  drop constraint if exists notificaciones_tipo_check;

alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in ('invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado', 'lugar_disponible'));

-- Extiende el trigger de recálculo de cupo/estado (ya existente) para
-- avisar al primero de la lista de espera cuando se libera un lugar.
create or replace function public.recalcular_estado_partido()
returns trigger as $$
declare
  v_partido_id uuid := coalesce(new.partido_id, old.partido_id);
  v_cantidad integer;
  v_estado_actual text;
  v_confirmados integer;
  v_ocupados integer;
  v_en_espera record;
  v_notif_activas boolean;
begin
  select cantidad_jugadores, estado into v_cantidad, v_estado_actual
  from public.partidos where id = v_partido_id;

  select count(*) into v_confirmados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado = 'confirmado';

  select count(*) into v_ocupados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado in ('anotado', 'confirmado');

  update public.partidos set lugares_ocupados = v_ocupados where id = v_partido_id;

  if v_estado_actual = 'abierto' and v_confirmados >= v_cantidad then
    update public.partidos set estado = 'completo' where id = v_partido_id;
  elsif v_estado_actual = 'completo' and v_confirmados < v_cantidad then
    update public.partidos set estado = 'abierto' where id = v_partido_id;
  end if;

  -- US-6.4: si hay lugar y alguien en la lista de espera sin avisar
  -- todavía, le avisamos (uno solo, el más antiguo).
  if v_ocupados < v_cantidad then
    select * into v_en_espera
    from public.partido_jugadores
    where partido_id = v_partido_id and estado = 'en_espera' and avisado_lista_espera = false
    order by created_at asc
    limit 1;

    if v_en_espera.id is not null then
      select coalesce(notificaciones_activas, true) into v_notif_activas
      from public.perfiles where id = v_en_espera.jugador_id;

      if coalesce(v_notif_activas, true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (v_en_espera.jugador_id, 'lugar_disponible', 'Se liberó un lugar en un partido de tu lista de espera. Confirmá tu lugar antes de que se lo lleve otro.', v_partido_id);
      end if;

      update public.partido_jugadores set avisado_lista_espera = true where id = v_en_espera.id;
    end if;
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- US-6.5: sumar `no_show` al plantel que ya muestra el detalle de
-- partido (US-2.6), para que el organizador pueda marcarlo/desmarcarlo.
drop function if exists public.ver_participantes_partido(uuid);

create or replace function public.ver_participantes_partido(p_partido_id uuid)
returns table (
  jugador_id uuid,
  nombre text,
  nivel integer,
  mano_habil text,
  posicion text,
  estado text,
  telefono text,
  no_show boolean
)
language plpgsql
security definer
stable
as $$
begin
  if not exists (
    select 1 from public.partido_jugadores pj
    where pj.partido_id = p_partido_id and pj.jugador_id = auth.uid()
  ) and not exists (
    select 1 from public.partidos pa
    where pa.id = p_partido_id and pa.organizador_id = auth.uid()
  ) then
    return;
  end if;

  return query
  select
    pe.id,
    pe.nombre,
    pe.nivel::integer,
    pe.mano_habil,
    pe.posicion,
    pj.estado,
    case when pj.estado = 'confirmado' then pe.telefono else null end,
    pj.no_show
  from public.partido_jugadores pj
  join public.perfiles pe on pe.id = pj.jugador_id
  where pj.partido_id = p_partido_id
  order by (pj.estado = 'confirmado') desc, pe.nombre asc;
end;
$$;

grant execute on function public.ver_participantes_partido(uuid) to authenticated;

-- US-6.5: el organizador necesita poder tocar la fila de OTRO jugador
-- (marcar no-show) -- la política existente ("Actualizar mi propia
-- participación") solo permite tocar la fila propia.
drop policy if exists "Organizador marca no-show" on public.partido_jugadores;

create policy "Organizador marca no-show" on public.partido_jugadores
  for update to authenticated
  using (
    exists (
      select 1 from public.partidos pa
      where pa.id = partido_jugadores.partido_id and pa.organizador_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.partidos pa
      where pa.id = partido_jugadores.partido_id and pa.organizador_id = auth.uid()
    )
  );
