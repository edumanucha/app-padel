-- Épica 7: US-7.4 (mensajería directa entre jugadores).
-- Decisiones (2026-09-06, a pedido del usuario): tiempo real vía Supabase
-- Realtime (mismo patrón que el marcador en vivo, US-2.7); moderación
-- básica -- un reporte solo queda registrado para que el superusuario
-- (rol de US-2.9) lo revise, sin ningún bloqueo automático.

create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  remitente_id uuid not null references public.perfiles(id),
  destinatario_id uuid not null references public.perfiles(id),
  contenido text not null check (char_length(contenido) between 1 and 1000),
  leido boolean not null default false,
  creado_en timestamptz not null default now(),
  check (remitente_id <> destinatario_id)
);

create index idx_mensajes_conversacion on public.mensajes (least(remitente_id, destinatario_id), greatest(remitente_id, destinatario_id), creado_en);

grant select, insert, update (leido) on public.mensajes to authenticated;

alter table public.mensajes enable row level security;

create policy "Ver mis mensajes" on public.mensajes
  for select to authenticated
  using (remitente_id = auth.uid() or destinatario_id = auth.uid());

create policy "Enviar un mensaje" on public.mensajes
  for insert to authenticated
  with check (remitente_id = auth.uid());

-- Solo puedo marcar como leído un mensaje que ME llegó a mí.
create policy "Marcar un mensaje como leído" on public.mensajes
  for update to authenticated
  using (destinatario_id = auth.uid())
  with check (destinatario_id = auth.uid());

-- IMPORTANTE (paso manual fuera de SQL): en el dashboard de Supabase, ir
-- a Database → Replication y habilitar la tabla `mensajes` para que
-- Realtime pueda notificar mensajes nuevos en vivo (mismo paso que ya se
-- pidió para `resultados_partido` en US-2.7).

-- Sumar 'mensaje_nuevo' a los tipos de notificación válidos (US-3.4).
alter table public.notificaciones
  drop constraint if exists notificaciones_tipo_check;

alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in ('invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado', 'lugar_disponible', 'mensaje_nuevo'));

-- Enviar un mensaje: valida longitud/remitente vía RLS de la tabla, y de
-- paso genera la notificación al destinatario (mismo mecanismo que ya
-- usa el resto de US-3.4).
create or replace function public.enviar_mensaje(p_destinatario_id uuid, p_contenido text)
returns void
language plpgsql
security definer
as $$
declare
  v_remitente_nombre text;
  v_notif_activas boolean;
begin
  insert into public.mensajes (remitente_id, destinatario_id, contenido)
  values (auth.uid(), p_destinatario_id, p_contenido);

  select coalesce(notificaciones_activas, true) into v_notif_activas
  from public.perfiles where id = p_destinatario_id;

  if coalesce(v_notif_activas, true) then
    select nombre into v_remitente_nombre from public.perfiles where id = auth.uid();
    insert into public.notificaciones (jugador_id, tipo, mensaje)
    values (p_destinatario_id, 'mensaje_nuevo', coalesce(v_remitente_nombre, 'Un jugador') || ' te envió un mensaje.');
  end if;
end;
$$;

grant execute on function public.enviar_mensaje(uuid, text) to authenticated;

-- Marca como leídos todos los mensajes de una conversación puntual.
create or replace function public.marcar_conversacion_leida(p_otro_id uuid)
returns void
language sql
security definer
as $$
  update public.mensajes
  set leido = true
  where remitente_id = p_otro_id and destinatario_id = auth.uid() and leido = false;
$$;

grant execute on function public.marcar_conversacion_leida(uuid) to authenticated;

-- Lista de conversaciones (una fila por persona con la que hablé), con
-- último mensaje y cantidad de no leídos -- para la bandeja de "Mensajes".
create or replace function public.listar_conversaciones()
returns table (
  jugador_id uuid,
  nombre text,
  avatar_url text,
  ultimo_mensaje text,
  ultimo_mensaje_en timestamptz,
  no_leidos integer
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    otro.id,
    otro.nombre,
    otro.avatar_url,
    ultimo.contenido,
    ultimo.creado_en,
    coalesce(nl.cnt, 0)::integer
  from (
    select distinct
      case when remitente_id = auth.uid() then destinatario_id else remitente_id end as otro_id
    from public.mensajes
    where remitente_id = auth.uid() or destinatario_id = auth.uid()
  ) pares
  join public.perfiles otro on otro.id = pares.otro_id
  left join lateral (
    select contenido, creado_en
    from public.mensajes m
    where (m.remitente_id = auth.uid() and m.destinatario_id = otro.id)
       or (m.remitente_id = otro.id and m.destinatario_id = auth.uid())
    order by creado_en desc
    limit 1
  ) ultimo on true
  left join lateral (
    select count(*) as cnt
    from public.mensajes m
    where m.remitente_id = otro.id and m.destinatario_id = auth.uid() and m.leido = false
  ) nl on true
  order by ultimo.creado_en desc nulls last;
end;
$$;

grant execute on function public.listar_conversaciones() to authenticated;

-- =========================================================
-- Moderación básica (solo registro, sin bloqueo automático).
-- =========================================================
create table public.reportes_mensajes (
  id uuid primary key default gen_random_uuid(),
  reportado_por uuid not null references public.perfiles(id),
  reportado_id uuid not null references public.perfiles(id),
  motivo text not null,
  creado_en timestamptz not null default now()
);

grant select, insert on public.reportes_mensajes to authenticated;

alter table public.reportes_mensajes enable row level security;

create policy "Crear un reporte" on public.reportes_mensajes
  for insert to authenticated
  with check (reportado_por = auth.uid());

-- El superusuario (rol de US-2.9) es quien revisa los reportes.
create policy "Superusuario ve los reportes" on public.reportes_mensajes
  for select to authenticated
  using (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );
