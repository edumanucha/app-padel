-- Épica 3: US-3.4 (notificaciones de actividad en mis partidos).
-- Decisiones (2026-09-05, a pedido del usuario, preguntas abiertas de la
-- historia): solo dentro de la app (sin push del navegador); no se avisa
-- a nadie por "partido nuevo creado" (evita spam sin un criterio de
-- relevancia real todavía); sí se guarda historial con leída/no leída.

alter table public.perfiles
  add column if not exists notificaciones_activas boolean not null default true;

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.perfiles(id),
  tipo text not null check (tipo in ('invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado')),
  mensaje text not null,
  partido_id uuid references public.partidos(id),
  leida boolean not null default false,
  creado_en timestamptz not null default now()
);

create index if not exists idx_notificaciones_jugador on public.notificaciones(jugador_id, creado_en desc);

grant select, update on public.notificaciones to authenticated;

alter table public.notificaciones enable row level security;

drop policy if exists "Ver mis notificaciones" on public.notificaciones;
create policy "Ver mis notificaciones" on public.notificaciones
  for select to authenticated
  using (jugador_id = auth.uid());

-- Solo puedo tocar `leida` de mis propias notificaciones.
drop policy if exists "Marcar mis notificaciones como leídas" on public.notificaciones;
create policy "Marcar mis notificaciones como leídas" on public.notificaciones
  for update to authenticated
  using (jugador_id = auth.uid())
  with check (jugador_id = auth.uid());

-- =========================================================
-- Avisar al organizador cuando responden su invitación.
-- =========================================================
create or replace function public.notificar_respuesta_invitacion()
returns trigger
language plpgsql
security definer
as $$
declare
  v_organizador uuid;
  v_notif_activas boolean;
  v_nombre_jugador text;
  v_cancha text;
begin
  select p.organizador_id, p.cancha into v_organizador, v_cancha
  from public.partidos p where p.id = coalesce(new.partido_id, old.partido_id);

  select notificaciones_activas into v_notif_activas from public.perfiles where id = v_organizador;
  if not coalesce(v_notif_activas, true) or v_organizador is null then
    return coalesce(new, old);
  end if;

  select nombre into v_nombre_jugador from public.perfiles where id = coalesce(new.jugador_id, old.jugador_id);

  if tg_op = 'UPDATE' and old.estado = 'invitado' and new.estado = 'anotado' then
    insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
    values (v_organizador, 'invitacion_aceptada', coalesce(v_nombre_jugador, 'Un jugador') || ' aceptó tu invitación a ' || v_cancha || '.', new.partido_id);
  elsif tg_op = 'DELETE' and old.estado = 'invitado' then
    insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
    values (v_organizador, 'invitacion_rechazada', coalesce(v_nombre_jugador, 'Un jugador') || ' rechazó tu invitación a ' || v_cancha || '.', old.partido_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_notificar_respuesta_invitacion on public.partido_jugadores;

create trigger trg_notificar_respuesta_invitacion
after update or delete on public.partido_jugadores
for each row execute function public.notificar_respuesta_invitacion();

-- =========================================================
-- Avisar a los participantes cuando el organizador cancela el partido.
-- =========================================================
create or replace function public.notificar_partido_cancelado()
returns trigger
language plpgsql
security definer
as $$
declare
  v_jugador record;
begin
  if old.estado <> 'cancelado' and new.estado = 'cancelado' then
    for v_jugador in
      select pj.jugador_id
      from public.partido_jugadores pj
      where pj.partido_id = new.id
        and pj.jugador_id is not null
        and pj.jugador_id <> new.organizador_id
        and pj.estado in ('anotado', 'confirmado')
    loop
      if coalesce((select notificaciones_activas from public.perfiles where id = v_jugador.jugador_id), true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (v_jugador.jugador_id, 'partido_cancelado', 'Se canceló el partido en ' || new.cancha || '.', new.id);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notificar_partido_cancelado on public.partidos;

create trigger trg_notificar_partido_cancelado
after update on public.partidos
for each row execute function public.notificar_partido_cancelado();

-- =========================================================
-- Listar mis notificaciones (más recientes primero).
-- =========================================================
create or replace function public.listar_notificaciones()
returns table (
  id uuid,
  tipo text,
  mensaje text,
  partido_id uuid,
  leida boolean,
  creado_en timestamptz
)
language sql
security definer
stable
as $$
  select id, tipo, mensaje, partido_id, leida, creado_en
  from public.notificaciones
  where jugador_id = auth.uid()
  order by creado_en desc
  limit 50;
$$;

grant execute on function public.listar_notificaciones() to authenticated;

create or replace function public.marcar_todas_notificaciones_leidas()
returns void
language sql
security definer
as $$
  update public.notificaciones set leida = true where jugador_id = auth.uid() and leida = false;
$$;

grant execute on function public.marcar_todas_notificaciones_leidas() to authenticated;
