-- Consejos personalizados (2026-10-10, pedido del usuario: "según las
-- estadísticas del partido que llevemos con Marcadorcito nos pueda dar
-- consejos personalizados", "mientras más partidos, mejore esa
-- inteligencia"; eligió las 3 opciones de la maqueta + la Home).
--
-- Los consejos se arman en la app (lib/consejosPersonalizados.js) con reglas
-- propias, comparando cada partido con tu propio promedio y con la media de
-- Padelito. Nada sale de Padelito. Acá van:
--   1. consejos_valoraciones: "Me sirvió / No me sirve" de cada consejo (los
--      que no te sirven dejan de aparecer, los que sí suben).
--   2. datos_consejos(): tus partidos terminados (con estadísticas de
--      Marcadorcito si las hay, compañero y rivales), la media de Padelito y
--      tus valoraciones, en un solo pedido.
-- Correr en el SQL Editor de Supabase, después de 098.

-- 1. Valoraciones ---------------------------------------------------------
create table if not exists public.consejos_valoraciones (
  jugador_id uuid not null references public.perfiles(id) on delete cascade,
  clave text not null check (length(clave) <= 60),
  util boolean not null,
  creado_en timestamptz not null default now(),
  primary key (jugador_id, clave)
);
alter table public.consejos_valoraciones enable row level security;
revoke all on public.consejos_valoraciones from anon, authenticated;

create or replace function public.valorar_consejo(p_clave text, p_util boolean)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'no_autenticado';
  end if;
  insert into public.consejos_valoraciones (jugador_id, clave, util)
  values (auth.uid(), left(p_clave, 60), p_util)
  on conflict (jugador_id, clave) do update set util = excluded.util, creado_en = now();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.valorar_consejo(text, boolean) to authenticated;

-- 2. Datos para armar los consejos ----------------------------------------
create or replace function public.datos_consejos()
returns jsonb as $$
declare
  v_yo uuid := auth.uid();
  v_partidos jsonb;
  v_media jsonb;
  v_valoraciones jsonb;
begin
  if v_yo is null then
    raise exception 'no_autenticado';
  end if;

  with mios as (
    select pa.id, pa.fecha_hora, yo.equipo, rp.ganador,
           rp.estado -> 'setsA' as sets_a, rp.estado -> 'setsB' as sets_b,
           case when ep.partido_id is null then null
                else to_jsonb(ep) - 'partido_id' - 'created_at' end as stats
      from public.partido_jugadores yo
      join public.partidos pa on pa.id = yo.partido_id
      join public.resultados_partido rp on rp.partido_id = pa.id and rp.finalizado and rp.ganador is not null
      left join public.estadisticas_partido ep on ep.partido_id = pa.id
     where yo.jugador_id = v_yo and yo.equipo is not null
     order by pa.fecha_hora desc
     limit 100
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', m.id,
           'fecha', m.fecha_hora,
           'equipo', m.equipo,
           'ganador', m.ganador,
           'sets_a', m.sets_a,
           'sets_b', m.sets_b,
           'stats', m.stats,
           'companero', (select jsonb_build_object('id', o.jugador_id, 'nombre', coalesce(pe.nombre, o.invitado_nombre))
                           from public.partido_jugadores o
                           left join public.perfiles pe on pe.id = o.jugador_id
                          where o.partido_id = m.id and o.equipo = m.equipo
                            and o.jugador_id is distinct from v_yo
                          limit 1),
           'rivales', (select coalesce(jsonb_agg(jsonb_build_object('id', o.jugador_id, 'nombre', coalesce(pe.nombre, o.invitado_nombre))), '[]'::jsonb)
                         from public.partido_jugadores o
                         left join public.perfiles pe on pe.id = o.jugador_id
                        where o.partido_id = m.id and o.equipo is not null and o.equipo <> m.equipo)
         ) order by m.fecha_hora desc), '[]'::jsonb)
    into v_partidos
    from mios m;

  -- Media de Padelito: partidos reales con estadísticas (los dos equipos).
  -- Sin los partidos de los jugadores de ejemplo, para no comparar contra
  -- datos inventados (pedido del usuario: "que no invente").
  select jsonb_build_object(
           'partidos', count(*),
           'quiebres', round(100.0 * sum(quiebres_conv_a + quiebres_conv_b) / nullif(sum(quiebres_op_a + quiebres_op_b), 0)),
           'cierre', round(100.0 * sum(puntos_juego_conv_a + puntos_juego_conv_b) / nullif(sum(puntos_juego_op_a + puntos_juego_op_b), 0)),
           'racha', round(avg((racha_max_a + racha_max_b) / 2.0), 1)
         )
    into v_media
    from public.estadisticas_partido ep
   where not exists (select 1 from public.partido_jugadores pj
                       join public.perfiles pe on pe.id = pj.jugador_id
                      where pj.partido_id = ep.partido_id and pe.es_demo);

  select coalesce(jsonb_object_agg(clave, util), '{}'::jsonb)
    into v_valoraciones
    from public.consejos_valoraciones
   where jugador_id = v_yo;

  return jsonb_build_object('partidos', v_partidos, 'media', v_media, 'valoraciones', v_valoraciones);
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function public.datos_consejos() to authenticated;

-- Para revisar: la media de Padelito con la que se compara cada uno.
select count(*) as partidos_con_estadisticas,
       round(100.0 * sum(quiebres_conv_a + quiebres_conv_b) / nullif(sum(quiebres_op_a + quiebres_op_b), 0)) as quiebres_pct,
       round(100.0 * sum(puntos_juego_conv_a + puntos_juego_conv_b) / nullif(sum(puntos_juego_op_a + puntos_juego_op_b), 0)) as cierre_pct
  from public.estadisticas_partido ep
 where not exists (select 1 from public.partido_jugadores pj
                     join public.perfiles pe on pe.id = pj.jugador_id
                    where pj.partido_id = ep.partido_id and pe.es_demo);
