-- Fix ranking mensual/semanal con hora argentina (2026-09-30, reportado por
-- el usuario: "el mensual no me da puntajes ni ranking"). La base corre en
-- UTC: a las 21 h de Argentina del último día del mes, para la base ya es el
-- mes siguiente, así que el mensual quedaba vacío (y lo mismo el semanal el
-- domingo a la noche). Ahora el mes y la semana se cortan con la hora de
-- Argentina. Mismo cuerpo que 055_ranking_semanal.sql, solo cambia eso.
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
  porcentaje_victorias integer
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
    coalesce(stats.pct, 0)::integer
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
  where pe.activo = true
    and pe.id <> auth.uid()
    and (p_nombre is null or pe.nombre ilike '%' || p_nombre || '%')
    and (p_nivel is null or pe.nivel = p_nivel)
    and (p_sexo is null or pe.sexo::text = p_sexo)
  order by (case when p_periodo in ('mensual', 'semanal') then coalesce(periodo_calc.puntos, 0) else pe.puntos_ranking end) desc, pe.nombre asc
  limit 200;
end;
$$;

grant execute on function public.listar_directorio_jugadores(text, integer, text, text) to authenticated;
