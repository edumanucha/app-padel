-- =========================================================
-- 100 · Me falta uno / Estoy disponible (2026-10-11, MEJ-025 + MEJ-023)
-- =========================================================
-- La cancha del Inicio (D-48): siempre está y cambia según lo que pasa.
--   1. Publicaste "Me falta gente"         -> "Te falta 1" + Compartir
--   2. Alguien de tus grupos busca jugador   -> "A Juli le falta 1" + Me sumo
--   3. No pasa nada                          -> Estoy disponible / Me falta gente
--   4. Avisaste que estás disponible         -> te ves en la cancha esperando
--
-- Versión simple aprobada por el usuario: los pedidos y el "disponible" los
-- ven SOLO tus grupos de Padelito (069), más un link para WhatsApp (/p/<id>).
-- Nada por provincia todavía (hasta que haya más gente por provincia).
--
-- Cambios:
--   a. partidos: busca_jugador, tipo_partido, falta_sexo, hora_a_definir,
--      cancha_a_definir y lugares_reservados (los que ya están pero no
--      tienen Padelito: el organizador dice "me falta 1" y los otros dos
--      lugares quedan reservados). lugares_ocupados pasa a contar a los
--      anotados/confirmados MÁS los reservados, así el resto de la app
--      (lista de partidos, link público, cupo) sigue andando sin cambios.
--   b. disponibles: "estoy disponible" por hoy.
--   c. Funciones: publicar_pedido, sumarme_a_partido, estoy_disponible,
--      ya_no_disponible, cancha_inicio.
--   d. Avisos nuevos: pedido_jugador (a tus grupos) y se_sumo_partido (al
--      que armó), con push.
--
-- Correr una vez en el SQL Editor de Supabase, después del 099.

-- ---------------------------------------------------------
-- a. Columnas nuevas en partidos
-- ---------------------------------------------------------
alter table public.partidos add column if not exists busca_jugador boolean not null default false;
alter table public.partidos add column if not exists tipo_partido text
  check (tipo_partido in ('femenino', 'masculino', 'mixto'));
alter table public.partidos add column if not exists falta_sexo text
  check (falta_sexo in ('femenino', 'masculino'));
alter table public.partidos add column if not exists hora_a_definir boolean not null default false;
alter table public.partidos add column if not exists cancha_a_definir boolean not null default false;
alter table public.partidos add column if not exists lugares_reservados integer not null default 0
  check (lugares_reservados >= 0);

create index if not exists partidos_busca_jugador_idx
  on public.partidos (fecha_hora) where busca_jugador and estado = 'abierto';

-- Cupo: igual que el 044, contando también los lugares reservados.
create or replace function public.validar_cupo_para_anotarse()
returns trigger as $$
declare
  v_cantidad integer;
  v_reservados integer;
  v_ocupados integer;
  v_debe_chequear boolean;
begin
  if tg_op = 'INSERT' then
    v_debe_chequear := (new.estado = 'anotado');
  else
    v_debe_chequear := (new.estado = 'anotado' and old.estado is distinct from 'anotado');
  end if;

  if v_debe_chequear then
    select cantidad_jugadores, lugares_reservados into v_cantidad, v_reservados
    from public.partidos where id = new.partido_id;

    select count(*) into v_ocupados
    from public.partido_jugadores
    where partido_id = new.partido_id and estado in ('anotado', 'confirmado');

    if v_ocupados + coalesce(v_reservados, 0) >= v_cantidad then
      raise exception 'El partido ya no tiene lugares disponibles.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Igual que el 045, sumando los lugares reservados.
create or replace function public.recalcular_estado_partido()
returns trigger as $$
declare
  v_partido_id uuid := coalesce(new.partido_id, old.partido_id);
  v_cantidad integer;
  v_reservados integer;
  v_estado_actual text;
  v_confirmados integer;
  v_ocupados integer;
  v_en_espera record;
  v_notif_activas boolean;
begin
  select cantidad_jugadores, estado, coalesce(lugares_reservados, 0)
    into v_cantidad, v_estado_actual, v_reservados
  from public.partidos where id = v_partido_id;

  select count(*) into v_confirmados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado = 'confirmado';

  select count(*) into v_ocupados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado in ('anotado', 'confirmado');

  v_confirmados := v_confirmados + v_reservados;
  v_ocupados := v_ocupados + v_reservados;

  update public.partidos set lugares_ocupados = v_ocupados where id = v_partido_id;

  if v_estado_actual = 'abierto' and v_confirmados >= v_cantidad then
    update public.partidos set estado = 'completo' where id = v_partido_id;
  elsif v_estado_actual = 'completo' and v_confirmados < v_cantidad then
    update public.partidos set estado = 'abierto' where id = v_partido_id;
  end if;

  if v_ocupados < v_cantidad and pg_trigger_depth() <= 1 then
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

-- Recalcula cupo y estado cuando cambian los reservados (no pasa por el
-- trigger de partido_jugadores).
create or replace function public._recalcular_cupo_partido(p_partido uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p record;
  v_confirmados integer;
  v_ocupados integer;
begin
  select cantidad_jugadores, estado, coalesce(lugares_reservados, 0) as reservados
    into v_p from public.partidos where id = p_partido;
  select count(*) filter (where estado = 'confirmado'),
         count(*) filter (where estado in ('anotado', 'confirmado'))
    into v_confirmados, v_ocupados
  from public.partido_jugadores where partido_id = p_partido;

  update public.partidos
     set lugares_ocupados = v_ocupados + v_p.reservados,
         estado = case
           when v_p.estado = 'abierto' and v_confirmados + v_p.reservados >= v_p.cantidad_jugadores then 'completo'
           when v_p.estado = 'completo' and v_confirmados + v_p.reservados < v_p.cantidad_jugadores then 'abierto'
           else v_p.estado
         end
   where id = p_partido;
end;
$$;
revoke all on function public._recalcular_cupo_partido(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------
-- b. Disponibles por hoy
-- ---------------------------------------------------------
create table if not exists public.disponibles (
  jugador_id uuid primary key references public.perfiles(id) on delete cascade,
  dia date not null,
  desde time,
  created_at timestamptz not null default now()
);
alter table public.disponibles enable row level security;
-- Sin políticas: se lee y se escribe solo con las funciones de abajo.

-- ---------------------------------------------------------
-- Ayudas
-- ---------------------------------------------------------
create or replace function public._hoy_ar()
returns date
language sql
stable
as $$ select (now() at time zone 'America/Argentina/Buenos_Aires')::date; $$;

-- "hoy 20:00", "mañana, hora a definir", "sáb 18/10 19:30"
create or replace function public._texto_cuando(p_fecha timestamptz, p_hora_a_definir boolean)
returns text
language sql
stable
as $$
  select case
           when (p_fecha at time zone 'America/Argentina/Buenos_Aires')::date = public._hoy_ar() then 'hoy'
           when (p_fecha at time zone 'America/Argentina/Buenos_Aires')::date = public._hoy_ar() + 1 then 'mañana'
           else to_char(p_fecha at time zone 'America/Argentina/Buenos_Aires', 'DD/MM')
         end
         || case when p_hora_a_definir then ', hora a definir'
                 else ' ' || to_char(p_fecha at time zone 'America/Argentina/Buenos_Aires', 'HH24:MI') end;
$$;

-- ¿Este jugador encaja en el pedido? (sexo y categoría)
create or replace function public._encaja_en_pedido(p_partido public.partidos, p_sexo text, p_nivel integer)
returns boolean
language sql
immutable
as $$
  select (p_partido.tipo_partido is null
          or (p_partido.tipo_partido = 'femenino' and p_sexo = 'femenino')
          or (p_partido.tipo_partido = 'masculino' and p_sexo = 'masculino')
          or (p_partido.tipo_partido = 'mixto' and (p_partido.falta_sexo is null or p_partido.falta_sexo = p_sexo)))
     and (p_nivel is null
          or ((p_partido.nivel_min is null or p_nivel >= p_partido.nivel_min)
              and (p_partido.nivel_max is null or p_nivel <= p_partido.nivel_max)));
$$;

-- Lugares libres de verdad (cantidad menos anotados, confirmados y reservados).
create or replace function public._lugares_libres(p_partido uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, p.cantidad_jugadores - coalesce(p.lugares_reservados, 0)
         - (select count(*) from public.partido_jugadores pj
             where pj.partido_id = p.id and pj.estado in ('anotado', 'confirmado'))::integer)
  from public.partidos p where p.id = p_partido;
$$;
revoke all on function public._lugares_libres(uuid) from public, anon;

-- Los que juegan en un partido (para dibujar la cancha): nombre e inicial.
create or replace function public._jugadores_cancha(p_partido uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pj.jugador_id,
           'nombre', split_part(btrim(coalesce(pe.nombre, pj.invitado_nombre, '')), ' ', 1),
           'avatar_url', pe.avatar_url
         ) order by (pj.jugador_id = p.organizador_id) desc, pj.created_at), '[]'::jsonb)
  from public.partido_jugadores pj
  join public.partidos p on p.id = pj.partido_id
  left join public.perfiles pe on pe.id = pj.jugador_id
  where pj.partido_id = p_partido and pj.estado in ('anotado', 'confirmado');
$$;
revoke all on function public._jugadores_cancha(uuid) from public, anon;

-- ---------------------------------------------------------
-- d. Avisos nuevos
-- ---------------------------------------------------------
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in (
    'invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado', 'lugar_disponible',
    'mensaje_nuevo', 'saldo_gastos', 'sugerencia_grupo', 'dupla_vinculada',
    'partido_cargado', 'resultado_corregido', 'no_jugo',
    'marcadorcito_nuevo',
    'usuario_nuevo',
    'invitacion_partido',
    'pedido_jugador',
    'se_sumo_partido'
  ));

-- Igual que el 098, más pedido_jugador y se_sumo_partido.
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
    when 'usuario_nuevo' then 'Usuario nuevo en Padelito'
    when 'pedido_jugador' then 'Falta uno para jugar'
    when 'se_sumo_partido' then 'Se sumaron a tu partido'
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
    when new.tipo = 'usuario_nuevo' then '/admin/estadisticas'
    when new.tipo = 'pedido_jugador' and new.partido_id is not null then '/p/' || new.partido_id
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
  return new;
end;
$$ language plpgsql security definer set search_path = public, net;

-- ---------------------------------------------------------
-- c. Funciones
-- ---------------------------------------------------------

-- Publicar "me falta gente". Con p_partido: tu partido ya creado (estado 1
-- de la cancha). Sin p_partido: arma uno nuevo de 4 (estado 3, "Me falta
-- gente"). Avisa a tus grupos la primera vez. Devuelve el id del partido.
create or replace function public.publicar_pedido(
  p_partido uuid,
  p_faltan integer,
  p_tipo text,
  p_falta_sexo text,
  p_nivel_min integer,
  p_nivel_max integer,
  p_fecha_hora timestamptz,
  p_hora_a_definir boolean,
  p_cancha text,
  p_cancha_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := p_partido;
  v_p public.partidos;
  v_reales integer;
  v_ya_buscaba boolean := false;
  v_nombre text;
  v_tipo_txt text;
  v_cat_txt text;
  v_msg text;
begin
  if v_uid is null then raise exception 'Tenés que iniciar sesión.'; end if;
  if p_faltan is null or p_faltan not between 1 and 3 then
    raise exception 'Elegí cuántos te faltan.';
  end if;
  if p_tipo is not null and p_tipo not in ('femenino', 'masculino', 'mixto') then
    raise exception 'Tipo de partido inválido.';
  end if;
  if p_nivel_min is not null and p_nivel_max is not null
     and (p_nivel_max < p_nivel_min or p_nivel_max - p_nivel_min > 1) then
    raise exception 'Elegí hasta 2 categorías seguidas.';
  end if;

  if v_id is null then
    if p_fecha_hora is null then raise exception 'Elegí el día.'; end if;
    insert into public.partidos (organizador_id, fecha_hora, cancha, cancha_id, cantidad_jugadores,
                                 hora_a_definir, cancha_a_definir)
    values (v_uid, p_fecha_hora,
            coalesce(nullif(btrim(p_cancha), ''), 'A definir'), p_cancha_id, 4,
            coalesce(p_hora_a_definir, false), nullif(btrim(p_cancha), '') is null)
    returning id into v_id;
  else
    select busca_jugador into v_ya_buscaba from public.partidos
     where id = v_id and organizador_id = v_uid and estado in ('abierto', 'completo');
    if not found then raise exception 'Ese partido no es tuyo o ya no está abierto.'; end if;
  end if;

  select count(*) into v_reales from public.partido_jugadores
   where partido_id = v_id and estado in ('anotado', 'confirmado');

  update public.partidos
     set busca_jugador = true,
         tipo_partido = p_tipo,
         falta_sexo = case when p_tipo = 'mixto' then p_falta_sexo else null end,
         nivel_min = p_nivel_min,
         nivel_max = coalesce(p_nivel_max, p_nivel_min),
         lugares_reservados = greatest(0, cantidad_jugadores - v_reales - p_faltan)
   where id = v_id
  returning * into v_p;

  perform public._recalcular_cupo_partido(v_id);

  -- Aviso a los de tus grupos que encajan (solo la primera vez).
  if not coalesce(v_ya_buscaba, false) then
    select split_part(btrim(nombre), ' ', 1) into v_nombre from public.perfiles where id = v_uid;
    v_tipo_txt := case p_tipo when 'femenino' then ' · Femenino' when 'masculino' then ' · Masculino'
                              when 'mixto' then ' · Mixto' else '' end;
    v_cat_txt := case when v_p.nivel_min is null then ''
                      when v_p.nivel_max is null or v_p.nivel_max = v_p.nivel_min then ' · ' || v_p.nivel_min || 'ª'
                      else ' · ' || v_p.nivel_min || 'ª-' || v_p.nivel_max || 'ª' end;
    v_msg := 'A ' || coalesce(v_nombre, 'alguien de tu grupo') || ' le falta' || case when p_faltan > 1 then 'n ' else ' ' end
             || p_faltan || v_tipo_txt || v_cat_txt || ' · ' || public._texto_cuando(v_p.fecha_hora, v_p.hora_a_definir)
             || case when v_p.cancha_a_definir then ', cancha a definir' else ' en ' || v_p.cancha end
             || '. Tocá para sumarte.';

    insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
    select distinct pe.id, 'pedido_jugador', v_msg, v_id
      from public.grupo_miembros yo
      join public.grupo_miembros gm on gm.grupo_id = yo.grupo_id and gm.jugador_id <> v_uid
      join public.perfiles pe on pe.id = gm.jugador_id
     where yo.jugador_id = v_uid
       and coalesce(pe.notificaciones_activas, true)
       and coalesce(pe.activo, true)
       and not coalesce(pe.es_demo, false)
       and public._encaja_en_pedido(v_p, pe.sexo, pe.nivel)
       and not exists (select 1 from public.partido_jugadores pj
                        where pj.partido_id = v_id and pj.jugador_id = pe.id
                          and pj.estado in ('anotado', 'confirmado'));
  end if;

  return v_id;
end;
$$;
revoke all on function public.publicar_pedido(uuid, integer, text, text, integer, integer, timestamptz, boolean, text, uuid) from public, anon;
grant execute on function public.publicar_pedido(uuid, integer, text, text, integer, integer, timestamptz, boolean, text, uuid) to authenticated;

-- Ya no busco (o "ya estamos"): deja de buscar y completa los lugares.
create or replace function public.dejar_de_buscar(p_partido uuid, p_completar boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reales integer;
begin
  if not exists (select 1 from public.partidos where id = p_partido and organizador_id = auth.uid()) then
    raise exception 'Ese partido no es tuyo.';
  end if;
  select count(*) into v_reales from public.partido_jugadores
   where partido_id = p_partido and estado in ('anotado', 'confirmado');
  update public.partidos
     set busca_jugador = false,
         lugares_reservados = case when p_completar then greatest(0, cantidad_jugadores - v_reales)
                                   else lugares_reservados end
   where id = p_partido;
  perform public._recalcular_cupo_partido(p_partido);
end;
$$;
revoke all on function public.dejar_de_buscar(uuid, boolean) from public, anon;
grant execute on function public.dejar_de_buscar(uuid, boolean) to authenticated;

-- "Me sumo": entra directo, confirmado. Avisa al que armó.
create or replace function public.sumarme_a_partido(p_partido uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_p public.partidos;
  v_yo record;
  v_org record;
  v_fila record;
  v_libres integer;
begin
  if v_uid is null then raise exception 'Tenés que iniciar sesión.'; end if;

  select * into v_p from public.partidos where id = p_partido for update;
  if not found then raise exception 'No encontramos ese partido.'; end if;
  if v_p.estado not in ('abierto', 'completo') or v_p.fecha_hora <= now() then
    raise exception 'Este partido ya no está abierto.';
  end if;
  if v_p.organizador_id = v_uid then raise exception 'Es tu propio partido.'; end if;

  select nombre, sexo, nivel into v_yo from public.perfiles where id = v_uid;
  if v_p.busca_jugador and not public._encaja_en_pedido(v_p, v_yo.sexo, null) then
    raise exception 'Este partido busca otro tipo de jugador.';
  end if;

  select id, estado into v_fila from public.partido_jugadores
   where partido_id = p_partido and jugador_id = v_uid;
  if v_fila.estado in ('anotado', 'confirmado') then
    raise exception 'Ya estás en este partido.';
  end if;

  v_libres := public._lugares_libres(p_partido);
  if v_libres <= 0 then raise exception 'Llegaste tarde: ya se completó.'; end if;

  if v_fila.id is not null then
    update public.partido_jugadores set estado = 'confirmado' where id = v_fila.id;
  else
    insert into public.partido_jugadores (partido_id, jugador_id, estado)
    values (p_partido, v_uid, 'confirmado');
  end if;

  select id, split_part(btrim(nombre), ' ', 1) as nombre, coalesce(notificaciones_activas, true) as avisos
    into v_org from public.perfiles where id = v_p.organizador_id;
  if v_org.avisos then
    insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
    values (v_org.id, 'se_sumo_partido',
            split_part(btrim(coalesce(v_yo.nombre, 'Alguien')), ' ', 1) || ' se sumó a tu partido de '
            || public._texto_cuando(v_p.fecha_hora, v_p.hora_a_definir)
            || case when v_libres - 1 <= 0 then '. Ya están completos.' else '. Falta' || case when v_libres - 1 > 1 then 'n ' else ' ' end || (v_libres - 1) || '.' end,
            p_partido);
  end if;

  return jsonb_build_object(
    'partido_id', p_partido,
    'organizador_id', v_org.id,
    'organizador_nombre', v_org.nombre,
    'fecha_hora', v_p.fecha_hora,
    'hora_a_definir', v_p.hora_a_definir,
    'cancha', v_p.cancha,
    'cancha_a_definir', v_p.cancha_a_definir,
    'libres', v_libres - 1
  );
end;
$$;
revoke all on function public.sumarme_a_partido(uuid) from public, anon;
grant execute on function public.sumarme_a_partido(uuid) to authenticated;

-- Estoy disponible hoy (desde una hora, o null = cualquier hora).
create or replace function public.estoy_disponible(p_desde time)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.disponibles (jugador_id, dia, desde)
  values (auth.uid(), public._hoy_ar(), p_desde)
  on conflict (jugador_id) do update set dia = excluded.dia, desde = excluded.desde, created_at = now();
$$;
revoke all on function public.estoy_disponible(time) from public, anon;
grant execute on function public.estoy_disponible(time) to authenticated;

create or replace function public.ya_no_disponible()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.disponibles where jugador_id = auth.uid();
$$;
revoke all on function public.ya_no_disponible() from public, anon;
grant execute on function public.ya_no_disponible() to authenticated;

-- Todo lo que necesita la cancha del Inicio, en una sola consulta.
create or replace function public.cancha_inicio()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_yo record;
  v_mi jsonb;
  v_pedidos jsonb;
  v_disp record;
  v_otros jsonb;
begin
  if v_uid is null then return null; end if;
  select id, sexo, nivel into v_yo from public.perfiles where id = v_uid;

  -- 1. Tu pedido publicado ("Me falta gente") que todavía tiene lugar.
  --    No se adivina nada de los partidos armados con "Crear partido".
  select jsonb_build_object(
           'id', p.id, 'fecha_hora', p.fecha_hora, 'hora_a_definir', p.hora_a_definir,
           'cancha', p.cancha, 'cancha_a_definir', p.cancha_a_definir,
           'busca_jugador', p.busca_jugador, 'tipo_partido', p.tipo_partido, 'falta_sexo', p.falta_sexo,
           'nivel_min', p.nivel_min, 'nivel_max', p.nivel_max,
           'cantidad', p.cantidad_jugadores, 'reservados', p.lugares_reservados,
           'libres', public._lugares_libres(p.id))
    into v_mi
    from public.partidos p
   where p.organizador_id = v_uid
     and p.estado = 'abierto'
     and p.busca_jugador
     and p.fecha_hora > now()
     and public._lugares_libres(p.id) > 0
   order by p.fecha_hora
   limit 1;

  -- 2. Pedidos de tus grupos donde encajás.
  select coalesce(jsonb_agg(x order by x->>'fecha_hora'), '[]'::jsonb) into v_pedidos
    from (
      select jsonb_build_object(
               'id', p.id, 'fecha_hora', p.fecha_hora, 'hora_a_definir', p.hora_a_definir,
               'cancha', p.cancha, 'cancha_a_definir', p.cancha_a_definir,
               'tipo_partido', p.tipo_partido, 'falta_sexo', p.falta_sexo,
               'nivel_min', p.nivel_min, 'nivel_max', p.nivel_max,
               'libres', public._lugares_libres(p.id),
               'reservados', p.lugares_reservados,
               'cantidad', p.cantidad_jugadores,
               'organizador_id', p.organizador_id,
               'organizador', split_part(btrim(org.nombre), ' ', 1),
               'grupo', (select g.nombre from public.grupos g
                           join public.grupo_miembros a on a.grupo_id = g.id and a.jugador_id = v_uid
                           join public.grupo_miembros b on b.grupo_id = g.id and b.jugador_id = p.organizador_id
                          order by g.created_at limit 1)) as x
        from public.partidos p
        join public.perfiles org on org.id = p.organizador_id
       where p.busca_jugador
         and p.estado = 'abierto'
         and p.fecha_hora > now()
         and p.organizador_id <> v_uid
         and exists (select 1 from public.grupo_miembros a
                       join public.grupo_miembros b on b.grupo_id = a.grupo_id
                      where a.jugador_id = v_uid and b.jugador_id = p.organizador_id)
         and not exists (select 1 from public.partido_jugadores pj
                          where pj.partido_id = p.id and pj.jugador_id = v_uid
                            and pj.estado in ('anotado', 'confirmado'))
         and public._encaja_en_pedido(p, v_yo.sexo, v_yo.nivel)
         and public._lugares_libres(p.id) > 0
       order by p.fecha_hora
       limit 10
    ) t;

  -- 3/4. ¿Estás disponible hoy? ¿Quiénes más de tus grupos?
  select dia, desde into v_disp from public.disponibles where jugador_id = v_uid and dia = public._hoy_ar();

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pe.id, 'nombre', split_part(btrim(pe.nombre), ' ', 1),
           'avatar_url', pe.avatar_url, 'desde', d.desde) order by d.created_at), '[]'::jsonb)
    into v_otros
    from public.disponibles d
    join public.perfiles pe on pe.id = d.jugador_id
   where d.dia = public._hoy_ar()
     and d.jugador_id <> v_uid
     and exists (select 1 from public.grupo_miembros a
                   join public.grupo_miembros b on b.grupo_id = a.grupo_id
                  where a.jugador_id = v_uid and b.jugador_id = d.jugador_id);

  return jsonb_build_object(
    'mi_partido', v_mi,
    'pedidos', v_pedidos,
    'disponible', v_disp.dia is not null,
    'disponible_desde', v_disp.desde,
    'disponibles', v_otros,
    'tiene_grupo', exists (select 1 from public.grupo_miembros where jugador_id = v_uid)
  );
end;
$$;
revoke all on function public.cancha_inicio() from public, anon;
grant execute on function public.cancha_inicio() to authenticated;

-- Link público (027) con los datos del pedido. Cambia lo que devuelve, así
-- que hay que borrarla y crearla de nuevo.
drop function if exists public.ver_partido_publico(uuid);
create function public.ver_partido_publico(p_id uuid)
returns table (
  id uuid,
  fecha_hora timestamptz,
  cancha text,
  cantidad_jugadores integer,
  lugares_ocupados integer,
  estado text,
  busca_jugador boolean,
  tipo_partido text,
  falta_sexo text,
  nivel_min integer,
  nivel_max integer,
  hora_a_definir boolean,
  cancha_a_definir boolean,
  organizador text
)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.fecha_hora, p.cancha, p.cantidad_jugadores, p.lugares_ocupados, p.estado,
         p.busca_jugador, p.tipo_partido, p.falta_sexo, p.nivel_min::integer, p.nivel_max::integer,
         p.hora_a_definir, p.cancha_a_definir,
         split_part(btrim(pe.nombre), ' ', 1)
  from public.partidos p
  left join public.perfiles pe on pe.id = p.organizador_id
  where p.id = p_id;
$$;
grant execute on function public.ver_partido_publico(uuid) to anon, authenticated;

-- Verificación (debería dar 7):
select count(*) as funciones_nuevas from pg_proc
 where proname in ('publicar_pedido', 'dejar_de_buscar', 'sumarme_a_partido', 'estoy_disponible',
                   'ya_no_disponible', 'cancha_inicio', 'ver_partido_publico');
