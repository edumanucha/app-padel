-- Notificaciones push al celu (2026-10-07, pedido del usuario): además de la
-- campana del Inicio, los avisos importantes llegan como notificación del
-- celu aunque la app esté cerrada.
--
-- Cómo funciona:
--   1. El celu, con permiso de la persona, se suscribe y la app guarda la
--      suscripción en push_suscripciones (guardar_suscripcion_push).
--   2. Cuando se crea una notificación de un tipo importante, el trigger
--      enviar_push_notificacion llama (con pg_net) a la ruta /api/push de la
--      app con las suscripciones de esa persona y una clave compartida.
--   3. /api/push firma y manda la notificación (web-push, claves VAPID en
--      Vercel). Si una suscripción ya no existe, la borra con
--      borrar_suscripcion_vencida.
--
-- La dirección de /api/push y la clave compartida van en push_config y se
-- cargan aparte con 084_push_config.privado.sql (no va al repo).
-- Correr en el SQL Editor de Supabase, después de 083.

create extension if not exists pg_net;

-- 1. Suscripciones ------------------------------------------------------
create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.perfiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);
create index if not exists idx_push_suscripciones_jugador on public.push_suscripciones(jugador_id);

alter table public.push_suscripciones enable row level security;
grant select, delete on public.push_suscripciones to authenticated;

drop policy if exists "Ver mis suscripciones push" on public.push_suscripciones;
create policy "Ver mis suscripciones push" on public.push_suscripciones
  for select to authenticated using (jugador_id = auth.uid());

drop policy if exists "Borrar mis suscripciones push" on public.push_suscripciones;
create policy "Borrar mis suscripciones push" on public.push_suscripciones
  for delete to authenticated using (jugador_id = auth.uid());

-- Guarda (o pasa a mi cuenta) la suscripción de este celu.
create or replace function public.guardar_suscripcion_push(p_endpoint text, p_p256dh text, p_auth text)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'no_autenticado';
  end if;
  if length(p_endpoint) > 1000 or p_endpoint not like 'https://%' then
    raise exception 'suscripcion_invalida';
  end if;
  insert into public.push_suscripciones (jugador_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set jugador_id = excluded.jugador_id, p256dh = excluded.p256dh, auth = excluded.auth, creado_en = now();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.guardar_suscripcion_push(text, text, text) to authenticated;

-- 2. Configuración privada (sin acceso desde la app) ----------------------
create table if not exists public.push_config (
  id integer primary key default 1 check (id = 1),
  url text not null,
  secreto text not null
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

-- /api/push borra las suscripciones que el servicio de push dio por vencidas.
create or replace function public.borrar_suscripcion_vencida(p_endpoint text, p_secreto text)
returns void as $$
begin
  if not exists (select 1 from public.push_config where secreto = p_secreto) then
    raise exception 'no_permitido';
  end if;
  delete from public.push_suscripciones where endpoint = p_endpoint;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.borrar_suscripcion_vencida(text, text) to anon, authenticated;

-- 3. Aviso nuevo: te invitaron a un partido ------------------------------
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in (
    'invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado', 'lugar_disponible',
    'mensaje_nuevo', 'saldo_gastos', 'sugerencia_grupo', 'dupla_vinculada',
    'partido_cargado', 'resultado_corregido', 'no_jugo',
    'marcadorcito_nuevo',
    'usuario_nuevo',
    'invitacion_partido'
  ));

create or replace function public.avisar_invitacion_partido()
returns trigger as $$
declare
  v_partido record;
  v_nombre text;
begin
  if new.estado <> 'invitado' then
    return new;
  end if;
  if not exists (select 1 from public.perfiles where id = new.jugador_id and coalesce(notificaciones_activas, true)) then
    return new;
  end if;
  select p.organizador_id, p.cancha, p.fecha_hora into v_partido from public.partidos p where p.id = new.partido_id;
  if v_partido.organizador_id is null or v_partido.organizador_id = new.jugador_id then
    return new;
  end if;
  select nombre into v_nombre from public.perfiles where id = v_partido.organizador_id;
  insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
  values (
    new.jugador_id, 'invitacion_partido',
    coalesce(v_nombre, 'Alguien') || ' te invitó a jugar en ' || v_partido.cancha || ' el '
      || to_char(v_partido.fecha_hora at time zone 'America/Argentina/Mendoza', 'DD/MM "a las" HH24:MI'),
    new.partido_id
  );
  return new;
exception when others then
  -- el aviso nunca frena la invitación
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_avisar_invitacion_partido on public.partido_jugadores;
create trigger trg_avisar_invitacion_partido
  after insert on public.partido_jugadores
  for each row execute function public.avisar_invitacion_partido();

-- 4. Mandar el push cuando se crea una notificación importante ------------
create or replace function public.enviar_push_notificacion()
returns trigger as $$
declare
  v_config record;
  v_subs jsonb;
  v_titulo text;
  v_url text;
begin
  v_titulo := case new.tipo
    when 'marcadorcito_nuevo' then 'Empezó tu partido'
    when 'mensaje_nuevo' then 'Mensaje nuevo'
    when 'invitacion_partido' then 'Te invitaron a jugar'
    when 'partido_cargado' then 'Cargaron un partido tuyo'
    when 'resultado_corregido' then 'Corrigieron un resultado'
    when 'partido_cancelado' then 'Partido cancelado'
    else null
  end;
  if v_titulo is null then
    return new;
  end if;

  select url, secreto into v_config from public.push_config where id = 1;
  if v_config.url is null then
    return new;
  end if;

  select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
    into v_subs
    from public.push_suscripciones s
   where s.jugador_id = new.jugador_id;
  if v_subs is null then
    return new;
  end if;

  v_url := case
    when new.tipo = 'mensaje_nuevo' then '/mensajes'
    when new.tipo = 'invitacion_partido' then '/invitaciones'
    when new.tipo = 'marcadorcito_nuevo' and new.partido_id is not null then '/partido/' || new.partido_id || '/marcador'
    when new.partido_id is not null then '/partido/' || new.partido_id
    else '/'
  end;

  perform net.http_post(
    url := v_config.url,
    body := jsonb_build_object(
      'suscripciones', v_subs,
      'titulo', v_titulo,
      'cuerpo', new.mensaje,
      'url', v_url,
      'etiqueta', new.tipo || coalesce(':' || new.partido_id::text, '')
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secreto', v_config.secreto),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  -- el push nunca frena la notificación de la campana
  return new;
end;
$$ language plpgsql security definer set search_path = public, net;

drop trigger if exists trg_enviar_push_notificacion on public.notificaciones;
create trigger trg_enviar_push_notificacion
  after insert on public.notificaciones
  for each row execute function public.enviar_push_notificacion();
