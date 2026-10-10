-- Jugadores de ejemplo con marca + estadísticas por usuario (2026-10-10,
-- pedido del usuario: "dejemos los usuarios de demo con alguna marquita",
-- "borrá Del Popolo, Hidalgo y Nicolás, que los creé yo y nunca les pedí
-- permiso", y en las estadísticas "poder seleccionar cada usuario que se unió
-- y tener la mayor cantidad de info posible respetando la privacidad").
--
-- Se corre entero, una vez, en el SQL Editor de Supabase, después de 093.
--
--  1. Los jugadores demo (es_demo) vuelven a verse en el directorio, el
--     ranking y su perfil, con la marca "Ejemplo" (la app la muestra con la
--     columna es_demo). Siguen inactivos: no aparecen en los buscadores, las
--     invitaciones, el compañero fijo, los grupos ni las sugerencias, así
--     nadie invita a alguien que no existe.
--  2. Vuelven los partidos demo diarios (solo entre jugadores de ejemplo).
--  3. Se eliminan las 3 cuentas que el usuario cargó a mano sin permiso
--     (mail @jugador.local), con el mismo borrado de "Eliminar mi cuenta".
--  4. Estadísticas: "Quiénes son" (provincia, género, nivel) y la ficha de
--     cada usuario. Igual que el panel de 082: solo el superusuario, y las
--     personas siguen siendo "Usuario N" (sin nombre, mail ni teléfono, como
--     dice la política de privacidad).

-- 1a) Directorio y ranking con los de ejemplo ------------------------------------
drop function if exists public.listar_directorio_jugadores(text, integer, text, text);

create or replace function public.listar_directorio_jugadores(
  p_nombre text default null,
  p_nivel integer default null,
  p_sexo text default null,
  p_periodo text default 'historico' -- 'historico' | 'mensual' | 'semanal'
)
returns table (
  id uuid,
  nombre text,
  nivel integer,
  mano_habil text,
  posicion text,
  sexo text,
  puntos_ranking integer,
  partidos_jugados integer,
  porcentaje_victorias integer,
  es_demo boolean
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    pe.id,
    pe.nombre::text,
    pe.nivel::integer,
    pe.mano_habil::text,
    pe.posicion::text,
    pe.sexo::text,
    (case when p_periodo in ('mensual', 'semanal') then coalesce(periodo_calc.puntos, 0) else pe.puntos_ranking end)::integer,
    coalesce(stats.jugados, 0)::integer,
    coalesce(stats.pct, 0)::integer,
    pe.es_demo
  from public.perfiles pe
  left join lateral (
    select
      count(*) as jugados,
      round(100.0 * count(*) filter (where rp.ganador = pj.equipo) / nullif(count(*), 0)) as pct
    from public.partido_jugadores pj
    join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
    where pj.jugador_id = pe.id
  ) stats on true
  left join lateral (
    select sum(
      (
        select coalesce(sum((g)::int), 0)
        from jsonb_array_elements_text(rp.estado -> (case when pj.equipo = 'A' then 'setsA' else 'setsB' end)) as g
      ) * 2
      + (case when rp.ganador = pj.equipo then 5 else 0 end)
    ) as puntos
    from public.partido_jugadores pj
    join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
    join public.partidos pa on pa.id = pj.partido_id
    where pj.jugador_id = pe.id
      and (
        (p_periodo = 'mensual' and date_trunc('month', pa.fecha_hora at time zone 'America/Argentina/Buenos_Aires') = date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires'))
        or (p_periodo = 'semanal' and date_trunc('week', pa.fecha_hora at time zone 'America/Argentina/Buenos_Aires') = date_trunc('week', now() at time zone 'America/Argentina/Buenos_Aires'))
      )
  ) periodo_calc on true
  where (pe.activo = true or (pe.es_demo and pe.nombre <> 'Jugador eliminado'))
    and pe.id <> auth.uid()
    and (p_nombre is null or pe.nombre ilike '%' || p_nombre || '%')
    and (p_nivel is null or pe.nivel = p_nivel)
    and (p_sexo is null or pe.sexo::text = p_sexo)
  order by (case when p_periodo in ('mensual', 'semanal') then coalesce(periodo_calc.puntos, 0) else pe.puntos_ranking end) desc, pe.nombre asc
  limit 200;
end;
$$;

grant execute on function public.listar_directorio_jugadores(text, integer, text, text) to authenticated;

-- 1b) Perfil de un jugador, también los de ejemplo ------------------------------------
drop function if exists public.ver_perfil_jugador(uuid);

create or replace function public.ver_perfil_jugador(p_id uuid)
returns table (
  id uuid,
  nombre text,
  avatar_url text,
  nivel integer,
  mano_habil text,
  posicion text,
  sexo text,
  puntos_ranking integer,
  partidos_jugados integer,
  porcentaje_victorias integer,
  no_shows integer,
  es_frecuente boolean,
  veces_con integer,
  veces_contra integer,
  compatibilidad_pct integer,
  es_demo boolean
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    pe.id,
    pe.nombre::text,
    pe.avatar_url,
    pe.nivel::integer,
    pe.mano_habil::text,
    pe.posicion::text,
    pe.sexo::text,
    pe.puntos_ranking::integer,
    coalesce(stats.jugados, 0)::integer,
    coalesce(stats.pct, 0)::integer,
    coalesce(stats.no_shows, 0)::integer,
    exists (
      select 1 from public.jugadores_frecuentes jf
      where jf.jugador_id = auth.uid() and jf.frecuente_id = p_id
    ),
    coalesce(rel.veces_con, 0)::integer,
    coalesce(rel.veces_contra, 0)::integer,
    case when coalesce(rel.veces_con, 0) >= 2 then rel.compat_pct::integer else null end,
    pe.es_demo
  from public.perfiles pe
  left join lateral (
    select
      count(*) as jugados,
      round(100.0 * count(*) filter (where rp.ganador = pj.equipo) / nullif(count(*), 0)) as pct,
      count(*) filter (where pj.no_show = true) as no_shows
    from public.partido_jugadores pj
    join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
    where pj.jugador_id = pe.id
  ) stats on true
  left join lateral (
    select
      count(*) filter (where pj_yo.equipo = pj_el.equipo) as veces_con,
      count(*) filter (where pj_yo.equipo <> pj_el.equipo) as veces_contra,
      round(100.0 * count(*) filter (where pj_yo.equipo = pj_el.equipo and rp.ganador = pj_yo.equipo)
        / nullif(count(*) filter (where pj_yo.equipo = pj_el.equipo), 0)) as compat_pct
    from public.partido_jugadores pj_yo
    join public.partido_jugadores pj_el
      on pj_el.partido_id = pj_yo.partido_id and pj_el.jugador_id = pe.id
    join public.resultados_partido rp on rp.partido_id = pj_yo.partido_id and rp.finalizado = true
    where pj_yo.jugador_id = auth.uid()
  ) rel on true
  where pe.id = p_id and (pe.activo = true or (pe.es_demo and pe.nombre <> 'Jugador eliminado'));
end;
$$;

grant execute on function public.ver_perfil_jugador(uuid) to authenticated;

-- 2) Partidos demo diarios: entre jugadores de ejemplo aunque estén inactivos ---------
create or replace function public.generar_partidos_demo(p_cantidad integer default 3)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_partido_id uuid;
  v_cancha_id uuid;
  v_cancha text;
  v_fecha timestamptz;
  v_inicio_hoy timestamptz := date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires') at time zone 'America/Argentina/Buenos_Aires';
  v_sets_a integer[];
  v_sets_b integer[];
  v_ga integer;
  v_gb integer;
  v_sa integer;
  v_sb integer;
  v_ok integer := 0;
  i integer;
begin
  if (select count(*) from public.perfiles where es_demo and nombre <> 'Jugador eliminado') < 4 then
    return 0;
  end if;

  for i in 1..p_cantidad loop
    begin
      select array_agg(id) into v_ids
      from (select id from public.perfiles where es_demo and nombre <> 'Jugador eliminado' order by random() limit 4) sub;

      select id, nombre into v_cancha_id, v_cancha from public.canchas where provincia = 'mendoza' order by random() limit 1;

      -- Entre las 0 h de hoy (hora Argentina) y ahora: así cae siempre en el
      -- día y el mes de hoy. Antes era "en las últimas 10 horas", y corriendo
      -- a las 9 h a veces caía en el día anterior (el 1° de cada mes, en el
      -- mes anterior -- y el mensual quedaba vacío).
      v_fecha := v_inicio_hoy + random() * (now() - v_inicio_hoy);

      insert into public.partidos (organizador_id, fecha_hora, cancha, cancha_id, cantidad_jugadores, estado, es_adhoc)
      values (v_ids[1], v_fecha, coalesce(v_cancha, 'Cancha de prueba'), v_cancha_id, 4, 'jugado', true)
      returning id into v_partido_id;

      update public.partido_jugadores set equipo = 'A'
      where partido_id = v_partido_id and jugador_id = v_ids[1];

      insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado)
      values
        (v_partido_id, v_ids[2], 'A', 'confirmado'),
        (v_partido_id, v_ids[3], 'B', 'confirmado'),
        (v_partido_id, v_ids[4], 'B', 'confirmado');

      v_sets_a := array[]::integer[];
      v_sets_b := array[]::integer[];
      v_sa := 0;
      v_sb := 0;
      while v_sa < 2 and v_sb < 2 loop
        v_ga := 6;
        v_gb := (array[0, 1, 2, 3, 4, 4, 3, 5, 6])[1 + floor(random() * 9)::int];
        if v_gb >= 5 then v_ga := 7; end if;
        if random() < 0.5 then
          v_sets_a := v_sets_a || v_ga; v_sets_b := v_sets_b || v_gb; v_sa := v_sa + 1;
        else
          v_sets_a := v_sets_a || v_gb; v_sets_b := v_sets_b || v_ga; v_sb := v_sb + 1;
        end if;
      end loop;

      -- finalizado = true dispara el trigger que suma los puntos de ranking.
      insert into public.resultados_partido (partido_id, estado, finalizado, ganador, created_at, updated_at)
      values (
        v_partido_id,
        jsonb_build_object(
          'setsA', to_jsonb(v_sets_a), 'setsB', to_jsonb(v_sets_b),
          'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
          'historial', '[]'::jsonb, 'pausado', false, 'finalizado', true,
          'ganador', case when v_sa > v_sb then 'A' else 'B' end
        ),
        true,
        case when v_sa > v_sb then 'A' else 'B' end,
        v_fecha,
        v_fecha + (60 + random() * 40) * interval '1 minute'
      );

      v_ok := v_ok + 1;
    exception when others then
      raise notice 'Partido demo % salteado: %', i, sqlerrm;
    end;
  end loop;

  return v_ok;
end;
$$;

select cron.unschedule('partidos-demo-diarios')
where exists (select 1 from cron.job where jobname = 'partidos-demo-diarios');
select cron.schedule('partidos-demo-diarios', '0 12 * * *', $$select public.generar_partidos_demo(3)$$);

-- 3) Las 3 cuentas cargadas a mano sin permiso ---------------------------------------------
do $$
declare
  v_cuenta record;
begin
  for v_cuenta in
    select p.id from public.perfiles p
    join auth.users u on u.id = p.id
    where u.email like '%@jugador.local'
      and (p.nombre ilike 'Francisco Del Popolo%' or p.nombre ilike 'Agustín Hidalgo%' or p.nombre ilike 'Nicolás González%')
      and p.nombre <> 'Jugador eliminado'
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', v_cuenta.id, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_cuenta.id::text, true);
    perform public.eliminar_mi_cuenta('ELIMINAR');
  end loop;
end $$;

-- 4a) Quiénes son ----------------------------------------------------------------------------
create or replace function public.estadisticas_quienes_admin()
returns jsonb as $$
begin
  if not exists (select 1 from public.perfiles where id = auth.uid() and es_superusuario = true) then
    raise exception 'no_permitido';
  end if;

  return jsonb_build_object(
    'por_provincia', (
      select coalesce(jsonb_agg(jsonb_build_object('provincia', x.provincia, 'n', x.n) order by x.n desc, x.provincia), '[]'::jsonb)
        from (select pe.provincia::text as provincia, count(*) as n
                from public.usuarios_para_metricas() u join public.perfiles pe on pe.id = u.id
               group by 1) x),
    'por_sexo', (
      select coalesce(jsonb_agg(jsonb_build_object('sexo', x.sexo, 'n', x.n) order by x.n desc), '[]'::jsonb)
        from (select pe.sexo::text as sexo, count(*) as n
                from public.usuarios_para_metricas() u join public.perfiles pe on pe.id = u.id
               group by 1) x),
    'por_nivel', (
      select coalesce(jsonb_agg(jsonb_build_object('nivel', x.nivel, 'n', x.n) order by x.nivel), '[]'::jsonb)
        from (select pe.nivel as nivel, count(*) as n
                from public.usuarios_para_metricas() u join public.perfiles pe on pe.id = u.id
               group by 1) x),
    'usuarios', (
      select coalesce(jsonb_agg(jsonb_build_object('n', u.n, 'provincia', pe.provincia, 'sexo', pe.sexo, 'nivel', pe.nivel)), '[]'::jsonb)
        from public.usuarios_para_metricas() u join public.perfiles pe on pe.id = u.id)
  );
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function public.estadisticas_quienes_admin() to authenticated;

-- 4b) Ficha de un usuario ---------------------------------------------------------------------
-- Todo lo que hace en la app, sin nombre, mail, teléfono ni lo que escribe.
create or replace function public.estadisticas_usuario_admin(p_n integer)
returns jsonb as $$
declare
  v_tz constant text := 'America/Argentina/Mendoza';
  v_id uuid;
  v_alta date;
begin
  if not exists (select 1 from public.perfiles where id = auth.uid() and es_superusuario = true) then
    raise exception 'no_permitido';
  end if;

  select u.id, u.dia_alta into v_id, v_alta from public.usuarios_para_metricas() u where u.n = p_n;
  if v_id is null then raise exception 'usuario_inexistente'; end if;

  return jsonb_build_object(
    'n', p_n,
    'perfil', (
      select jsonb_build_object(
        'provincia', pe.provincia, 'zona', pe.zona, 'sexo', pe.sexo, 'nivel', pe.nivel,
        'mano_habil', pe.mano_habil, 'posicion', pe.posicion,
        'con_foto', pe.avatar_url is not null,
        'busca_companero', pe.busca_companero,
        'notificaciones', pe.notificaciones_activas)
        from public.perfiles pe where pe.id = v_id),
    'alta', v_alta,
    'vino_de_probar', exists (
      select 1 from public.eventos_uso e
       where e.tipo = 'probar_abrir'
         and e.anon_id in (select distinct e2.anon_id from public.eventos_uso e2 where e2.usuario_id = v_id)),
    'ultima', (select max((e.created_at at time zone v_tz)::date) from public.eventos_uso e where e.usuario_id = v_id),
    'dias_activos', (select count(distinct (e.created_at at time zone v_tz)::date) from public.eventos_uso e where e.usuario_id = v_id),
    'minutos', (select round(count(*) * 0.5) from public.eventos_uso e where e.usuario_id = v_id and e.tipo = 'latido'),
    'por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'minutos', coalesce(c.m, 0)) order by d.dia), '[]'::jsonb)
        from (select generate_series((now() at time zone v_tz)::date - 29, (now() at time zone v_tz)::date, interval '1 day')::date as dia) d
        left join (select (e.created_at at time zone v_tz)::date as dia, round(count(*) * 0.5) as m
                     from public.eventos_uso e
                    where e.usuario_id = v_id and e.tipo = 'latido'
                    group by 1) c on c.dia = d.dia),
    'pantallas', (
      select coalesce(jsonb_agg(jsonb_build_object('pantalla', x.pantalla, 'n', x.n) order by x.n desc), '[]'::jsonb)
        from (select e.pantalla, count(*) as n from public.eventos_uso e
               where e.usuario_id = v_id and e.tipo = 'abrir' and e.pantalla is not null
               group by 1 order by count(*) desc limit 10) x),
    'modos', (
      select coalesce(jsonb_agg(jsonb_build_object('modo', x.modo, 'n', x.n) order by x.n desc), '[]'::jsonb)
        from (select e.datos ->> 'modo' as modo, count(*) as n from public.eventos_uso e
               where e.usuario_id = v_id and e.tipo = 'marcador_modo' and e.datos ->> 'modo' is not null
               group by 1) x),
    'dispositivos', (
      select coalesce(jsonb_agg(distinct e.disp), '[]'::jsonb) from public.eventos_uso e
       where e.usuario_id = v_id and e.disp is not null),
    'fallas', (select count(*) from public.eventos_uso e where e.usuario_id = v_id and e.tipo = 'falla'),
    'partidos', (
      select jsonb_build_object(
        'terminados', count(*),
        'con_marcadorcito', count(*) filter (where (rp.estado ->> 'cargadoAMano') is null),
        'a_mano', count(*) filter (where (rp.estado ->> 'cargadoAMano') is not null),
        'ganados', count(*) filter (where rp.ganador = pj.equipo))
        from public.partido_jugadores pj
        join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
        join public.partidos pa on pa.id = pj.partido_id
       where pj.jugador_id = v_id and pj.estado = 'confirmado' and pa.estado <> 'cancelado'),
    'organizo', (select count(*) from public.partidos pa where pa.organizador_id = v_id),
    'grupos', (select count(*) from public.grupo_miembros gm where gm.grupo_id is not null and gm.jugador_id = v_id),
    'torneos', (select count(*) from public.torneos t where t.organizador_id = v_id),
    'mensajes_enviados', (select count(*) from public.mensajes m where m.remitente_id = v_id),
    'frecuentes', (select count(*) from public.jugadores_frecuentes jf where jf.jugador_id = v_id)
  );
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function public.estadisticas_usuario_admin(integer) to authenticated;

-- Para revisar: quién es superusuario (solo esa cuenta ve las estadísticas) y
-- cuántos jugadores de ejemplo vuelven a verse.
select p.nombre, p.es_superusuario,
       (select count(*) from public.perfiles d where d.es_demo and d.nombre <> 'Jugador eliminado') as de_ejemplo_visibles,
       (select count(*) from public.perfiles x where x.nombre = 'Jugador eliminado') as cuentas_eliminadas
from public.perfiles p
where p.activo
order by p.es_superusuario desc, p.nombre;
