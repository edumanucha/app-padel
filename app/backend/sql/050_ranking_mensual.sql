-- Ranking mensual (2026-09-13, a pedido del usuario, tras charlar si el
-- ranking acumulado de por vida era "justo"): se agrega una vista
-- mensual que se reinicia sola cada mes -- sin cron ni columna nueva que
-- resetear, se calcula al vuelo sumando los puntos que dio cada partido
-- jugado DENTRO del mes calendario actual (misma fórmula que el trigger
-- aplicar_resultado_partido de 009: 2 por game + 5 de bono si ganó). El
-- histórico de toda la vida sigue siendo perfiles.puntos_ranking, intacto.
drop function if exists public.listar_directorio_jugadores(text, integer, text);

create or replace function public.listar_directorio_jugadores(
  p_nombre text default null,
  p_nivel integer default null,
  p_sexo text default null,
  p_periodo text default 'historico' -- 'historico' | 'mensual'
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
    (case when p_periodo = 'mensual' then coalesce(mensual.puntos, 0) else pe.puntos_ranking end)::integer,
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
      and date_trunc('month', pa.fecha_hora) = date_trunc('month', now())
  ) mensual on true
  where pe.activo = true
    and pe.id <> auth.uid()
    and (p_nombre is null or pe.nombre ilike '%' || p_nombre || '%')
    and (p_nivel is null or pe.nivel = p_nivel)
    and (p_sexo is null or pe.sexo::text = p_sexo)
  order by (case when p_periodo = 'mensual' then coalesce(mensual.puntos, 0) else pe.puntos_ranking end) desc, pe.nombre asc
  limit 200;
end;
$$;

grant execute on function public.listar_directorio_jugadores(text, integer, text, text) to authenticated;
