-- Estadísticas de uso de Padelito (2026-10-06, pedido del usuario): saber quién
-- se une, cuánto y en qué se usa la app, de forma anónima.
--
-- Cómo cuida la privacidad:
--  * Los eventos guardan QUÉ se hizo (pantalla, función, falla), nunca lo que
--    la persona escribe (nombres, mensajes, rivales).
--  * El panel del superusuario muestra "Usuario 1, 2, 3": sin nombre ni mail.
--  * Nadie puede leer la tabla de eventos directo: solo la función del panel,
--    y solo si quien la llama es superusuario.
--  * Al eliminar la cuenta, sus eventos se borran.
--  * Las cuentas demo y las de superusuario no cuentan en los números.
--
-- Qué incluye:
--  1. Tabla eventos_uso + función registrar_evento (la llama la app).
--  2. Aviso al superusuario (campana) cuando se crea una cuenta nueva.
--  3. estadisticas_admin(): todos los números del panel.
-- Correr en el SQL Editor de Supabase, después de 081.

-- 1. Eventos ------------------------------------------------------------
create table if not exists public.eventos_uso (
  id bigint generated always as identity primary key,
  anon_id text not null check (char_length(anon_id) between 8 and 40),
  usuario_id uuid,
  tipo text not null,
  pantalla text check (pantalla is null or char_length(pantalla) <= 60),
  datos jsonb,
  disp text check (disp is null or char_length(disp) <= 60),
  created_at timestamptz not null default now()
);

create index if not exists eventos_uso_fecha_idx on public.eventos_uso (created_at);
create index if not exists eventos_uso_usuario_idx on public.eventos_uso (usuario_id, created_at);
create index if not exists eventos_uso_anon_idx on public.eventos_uso (anon_id, created_at);
create index if not exists eventos_uso_tipo_idx on public.eventos_uso (tipo, created_at);

-- Sin políticas: ni leer ni escribir directo. Todo pasa por funciones.
alter table public.eventos_uso enable row level security;
revoke all on public.eventos_uso from anon, authenticated;

create or replace function public.registrar_evento(
  p_anon text,
  p_tipo text,
  p_pantalla text default null,
  p_datos jsonb default null,
  p_disp text default null
)
returns void as $$
begin
  if p_tipo is null or p_tipo not in (
    'abrir', 'latido', 'probar_abrir', 'probar_punto', 'probar_crear_cuenta',
    'marcador_modo', 'partido_terminado', 'partido_cancelado', 'falla',
    'cargar_partido', 'instalo_app'
  ) then
    return;
  end if;
  if p_anon is null or char_length(p_anon) not between 8 and 40 then return; end if;
  if p_datos is not null and octet_length(p_datos::text) > 400 then p_datos := null; end if;
  -- Tope contra abuso: más de 60 eventos por minuto de un mismo dispositivo se ignoran.
  if (select count(*) from public.eventos_uso where anon_id = p_anon and created_at > now() - interval '1 minute') > 60 then
    return;
  end if;
  insert into public.eventos_uso (anon_id, usuario_id, tipo, pantalla, datos, disp)
  values (p_anon, auth.uid(), p_tipo, left(p_pantalla, 60), p_datos, left(p_disp, 60));
exception when others then
  -- Medir nunca tiene que romper la app.
  return;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.registrar_evento(text, text, text, jsonb, text) to anon, authenticated;

-- Al eliminar la cuenta (081 deja el perfil como "Jugador eliminado") se
-- borran sus eventos.
create or replace function public.borrar_eventos_de_cuenta_eliminada()
returns trigger as $$
begin
  if new.nombre = 'Jugador eliminado' and old.nombre is distinct from 'Jugador eliminado' then
    delete from public.eventos_uso where usuario_id = new.id;
  end if;
  return new;
exception when others then
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists borrar_eventos_de_cuenta_eliminada_tg on public.perfiles;
create trigger borrar_eventos_de_cuenta_eliminada_tg
  after update of nombre on public.perfiles
  for each row execute function public.borrar_eventos_de_cuenta_eliminada();

-- 2. Aviso de alta ------------------------------------------------------
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in (
    'invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado', 'lugar_disponible',
    'mensaje_nuevo', 'saldo_gastos', 'sugerencia_grupo', 'dupla_vinculada',
    'partido_cargado', 'resultado_corregido', 'no_jugo',
    'marcadorcito_nuevo',
    'usuario_nuevo'
  ));

-- Cuando alguien crea su perfil, los superusuarios reciben un aviso sin
-- nombre ("ya son N"). Si algo falla, el alta de la persona NO se frena.
create or replace function public.avisar_usuario_nuevo()
returns trigger as $$
declare
  v_total integer;
  v_super record;
begin
  if coalesce(new.es_demo, false) or coalesce(new.es_superusuario, false) then return new; end if;
  select count(*) into v_total
    from public.perfiles
   where coalesce(es_demo, false) = false and coalesce(es_superusuario, false) = false
     and nombre <> 'Jugador eliminado';
  for v_super in select id from public.perfiles where es_superusuario = true loop
    insert into public.notificaciones (jugador_id, tipo, mensaje)
    values (v_super.id, 'usuario_nuevo', 'Se unió alguien nuevo a Padelito: ya son ' || v_total || ' usuarios. Tocá para ver las estadísticas.');
  end loop;
  return new;
exception when others then
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists avisar_usuario_nuevo_tg on public.perfiles;
create trigger avisar_usuario_nuevo_tg
  after insert on public.perfiles
  for each row execute function public.avisar_usuario_nuevo();

-- 3. Números del panel --------------------------------------------------
-- Usuarios que cuentan para las métricas, numerados por orden de alta
-- (Usuario 1 es el primero). Solo la usa estadisticas_admin.
create or replace function public.usuarios_para_metricas()
returns table (id uuid, n bigint, created_at timestamptz, dia_alta date) as $$
  select t.id, t.n, t.created_at, t.dia_alta
    from (
      select pe.id, pe.nombre,
             row_number() over (order by pe.created_at) as n,
             pe.created_at,
             (pe.created_at at time zone 'America/Argentina/Mendoza')::date as dia_alta
        from public.perfiles pe
       where coalesce(pe.es_demo, false) = false and coalesce(pe.es_superusuario, false) = false
    ) t
   where t.nombre <> 'Jugador eliminado';
$$ language sql stable security definer set search_path = public;

revoke all on function public.usuarios_para_metricas() from public, anon, authenticated;

create or replace function public.estadisticas_admin()
returns jsonb as $$
declare
  v_tz constant text := 'America/Argentina/Mendoza';
  v_hoy date := (now() at time zone 'America/Argentina/Mendoza')::date;
  v_resumen jsonb;
  v_altas jsonb;
  v_activacion jsonb;
  v_retencion jsonb;
  v_probar jsonb;
  v_funciones jsonb;
  v_modos jsonb;
  v_fallas jsonb;
  v_fallas_disp jsonb;
  v_disp jsonb;
  v_usuarios jsonb;
begin
  if not exists (select 1 from public.perfiles where id = auth.uid() and es_superusuario = true) then
    raise exception 'no_permitido';
  end if;

  select jsonb_build_object(
    'usuarios', (select count(*) from public.usuarios_para_metricas()),
    'altas_hoy', (select count(*) from public.usuarios_para_metricas() where dia_alta = v_hoy),
    'altas_7d', (select count(*) from public.usuarios_para_metricas() where dia_alta >= v_hoy - 6),
    'altas_30d', (select count(*) from public.usuarios_para_metricas() where dia_alta >= v_hoy - 29),
    'activos_hoy', (select count(distinct e.usuario_id) from public.eventos_uso e join public.usuarios_para_metricas() u on u.id = e.usuario_id
                     where (e.created_at at time zone v_tz)::date = v_hoy),
    'activos_7d', (select count(distinct e.usuario_id) from public.eventos_uso e join public.usuarios_para_metricas() u on u.id = e.usuario_id
                     where (e.created_at at time zone v_tz)::date >= v_hoy - 6),
    'activos_30d', (select count(distinct e.usuario_id) from public.eventos_uso e join public.usuarios_para_metricas() u on u.id = e.usuario_id
                     where (e.created_at at time zone v_tz)::date >= v_hoy - 29),
    'minutos_7d', (select round(count(*) * 0.5) from public.eventos_uso e join public.usuarios_para_metricas() u on u.id = e.usuario_id
                    where e.tipo = 'latido' and (e.created_at at time zone v_tz)::date >= v_hoy - 6),
    'partidos_terminados_7d', (
      select count(*) from public.resultados_partido rp
        join public.partidos pa on pa.id = rp.partido_id
       where rp.finalizado = true and pa.estado <> 'cancelado'
         and (rp.updated_at at time zone v_tz)::date >= v_hoy - 6
         and exists (select 1 from public.partido_jugadores pj join public.usuarios_para_metricas() u on u.id = pj.jugador_id
                      where pj.partido_id = rp.partido_id and pj.estado = 'confirmado'))
  ) into v_resumen;

  select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'n', coalesce(c.n, 0)) order by d.dia), '[]'::jsonb) into v_altas
    from (select generate_series(v_hoy - 29, v_hoy, interval '1 day')::date as dia) d
    left join (select dia_alta, count(*) as n from public.usuarios_para_metricas() group by dia_alta) c on c.dia_alta = d.dia;

  select jsonb_build_object(
    'altas', count(*),
    'con_partido', count(*) filter (where exists (
      select 1 from public.partido_jugadores pj
        join public.resultados_partido rp on rp.partido_id = pj.partido_id
        join public.partidos pa on pa.id = pj.partido_id
       where pj.jugador_id = u.id and pj.estado = 'confirmado' and rp.finalizado = true and pa.estado <> 'cancelado')),
    'con_marcadorcito', count(*) filter (where exists (
      select 1 from public.partido_jugadores pj
        join public.resultados_partido rp on rp.partido_id = pj.partido_id
        join public.partidos pa on pa.id = pj.partido_id
       where pj.jugador_id = u.id and pj.estado = 'confirmado' and rp.finalizado = true and pa.estado <> 'cancelado'
         and (rp.estado ->> 'cargadoAMano') is null))
  ) into v_activacion
    from public.usuarios_para_metricas() u;

  -- Retención: de los que ya pasaron N días desde el alta, cuántos volvieron
  -- a abrir la app entre el día 1 y el día N.
  select jsonb_build_object(
    'd1', (select jsonb_build_object('de', count(*), 'volvieron', count(*) filter (where exists (
             select 1 from public.eventos_uso e where e.usuario_id = u.id
               and (e.created_at at time zone v_tz)::date between u.dia_alta + 1 and u.dia_alta + 1)))
            from public.usuarios_para_metricas() u where u.dia_alta <= v_hoy - 1),
    'd7', (select jsonb_build_object('de', count(*), 'volvieron', count(*) filter (where exists (
             select 1 from public.eventos_uso e where e.usuario_id = u.id
               and (e.created_at at time zone v_tz)::date between u.dia_alta + 1 and u.dia_alta + 7)))
            from public.usuarios_para_metricas() u where u.dia_alta <= v_hoy - 7),
    'd30', (select jsonb_build_object('de', count(*), 'volvieron', count(*) filter (where exists (
             select 1 from public.eventos_uso e where e.usuario_id = u.id
               and (e.created_at at time zone v_tz)::date between u.dia_alta + 1 and u.dia_alta + 30)))
            from public.usuarios_para_metricas() u where u.dia_alta <= v_hoy - 30)
  ) into v_retencion;

  -- Embudo de /probar (sin contar los dispositivos desde donde entró un superusuario).
  with excluidos as (
    select distinct e.anon_id from public.eventos_uso e
      join public.perfiles pe on pe.id = e.usuario_id
     where pe.es_superusuario = true
  ), p as (
    select anon_id, min(created_at) as primero
      from public.eventos_uso
     where tipo = 'probar_abrir' and anon_id not in (select anon_id from excluidos)
     group by anon_id
  )
  select jsonb_build_object(
    'entraron', (select count(*) from p),
    'sumaron', (select count(distinct e.anon_id) from public.eventos_uso e join p on p.anon_id = e.anon_id where e.tipo = 'probar_punto'),
    'pidieron_cuenta', (select count(distinct e.anon_id) from public.eventos_uso e join p on p.anon_id = e.anon_id where e.tipo = 'probar_crear_cuenta'),
    'crearon_cuenta', (select count(*) from p where exists (
      select 1 from public.eventos_uso e join public.perfiles pe on pe.id = e.usuario_id
       where e.anon_id = p.anon_id and pe.created_at >= p.primero))
  ) into v_probar;

  select coalesce(jsonb_agg(jsonb_build_object('pantalla', x.pantalla, 'usos', x.usos, 'usuarios', x.usuarios) order by x.usos desc), '[]'::jsonb) into v_funciones
    from (
      select e.pantalla, count(*) as usos, count(distinct e.usuario_id) as usuarios
        from public.eventos_uso e join public.usuarios_para_metricas() u on u.id = e.usuario_id
       where e.tipo = 'abrir' and e.pantalla is not null and e.created_at > now() - interval '30 days'
       group by e.pantalla order by count(*) desc limit 15
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object('modo', x.modo, 'n', x.n) order by x.n desc), '[]'::jsonb) into v_modos
    from (
      select e.datos ->> 'modo' as modo, count(*) as n
        from public.eventos_uso e
       where e.tipo = 'marcador_modo' and e.datos ->> 'modo' is not null and e.created_at > now() - interval '30 days'
       group by 1
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object('tipo', x.tipo, 'n', x.n, 'dispositivos', x.dispositivos, 'ultima', x.ultima) order by x.n desc), '[]'::jsonb) into v_fallas
    from (
      select coalesce(e.datos ->> 'tipo', 'sin_tipo') as tipo, count(*) as n, count(distinct e.anon_id) as dispositivos, max(e.created_at) as ultima
        from public.eventos_uso e
       where e.tipo = 'falla' and e.created_at > now() - interval '30 days'
       group by 1
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object('disp', x.disp, 'n', x.n) order by x.n desc), '[]'::jsonb) into v_fallas_disp
    from (
      select coalesce(e.disp, 'desconocido') as disp, count(*) as n
        from public.eventos_uso e
       where e.tipo = 'falla' and e.created_at > now() - interval '30 days'
       group by 1 order by count(*) desc limit 10
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object('disp', x.disp, 'n', x.n) order by x.n desc), '[]'::jsonb) into v_disp
    from (
      select e.disp, count(distinct e.anon_id) as n
        from public.eventos_uso e
       where e.tipo = 'abrir' and e.disp is not null and e.created_at > now() - interval '30 days'
       group by e.disp order by count(distinct e.anon_id) desc limit 12
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
      'n', x.n, 'alta', x.dia_alta, 'ultima', x.ultima, 'dias_activos', x.dias_activos,
      'minutos', x.minutos, 'partidos', x.partidos) order by x.n desc), '[]'::jsonb) into v_usuarios
    from (
      select u.n, u.dia_alta,
             (select max((e.created_at at time zone v_tz)::date) from public.eventos_uso e where e.usuario_id = u.id) as ultima,
             (select count(distinct (e.created_at at time zone v_tz)::date) from public.eventos_uso e where e.usuario_id = u.id) as dias_activos,
             (select round(count(*) * 0.5) from public.eventos_uso e where e.usuario_id = u.id and e.tipo = 'latido') as minutos,
             (select count(*) from public.partido_jugadores pj
                join public.resultados_partido rp on rp.partido_id = pj.partido_id
                join public.partidos pa on pa.id = pj.partido_id
               where pj.jugador_id = u.id and pj.estado = 'confirmado' and rp.finalizado = true and pa.estado <> 'cancelado') as partidos
        from public.usuarios_para_metricas() u
       order by u.n desc limit 100
    ) x;

  return jsonb_build_object(
    'resumen', v_resumen, 'altas_por_dia', v_altas, 'activacion', v_activacion, 'retencion', v_retencion,
    'probar', v_probar, 'funciones', v_funciones, 'modos', v_modos, 'fallas', v_fallas,
    'fallas_dispositivo', v_fallas_disp, 'dispositivos', v_disp, 'usuarios', v_usuarios,
    'generado', now()
  );
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function public.estadisticas_admin() to authenticated;
