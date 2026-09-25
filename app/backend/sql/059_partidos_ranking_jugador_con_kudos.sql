-- Suma partido_id (para poder dar kudos) + el conteo de kudos + si YO ya
-- le di kudos a ese partido, al RPC de 056_partidos_ranking_jugador.sql.
drop function if exists public.listar_partidos_ranking_jugador(uuid);

create or replace function public.listar_partidos_ranking_jugador(p_id uuid)
returns table (
  partido_id uuid,
  fecha_hora timestamptz,
  cancha text,
  puntos_ranking integer,
  gane boolean,
  kudos_count integer,
  ya_di_kudos boolean
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    pa.id,
    pa.fecha_hora,
    pa.cancha,
    (
      (
        select coalesce(sum((g)::int), 0)
        from jsonb_array_elements_text(rp.estado -> (case when pj.equipo = 'A' then 'setsA' else 'setsB' end)) as g
      ) * 2
      + (case when rp.ganador = pj.equipo then 5 else 0 end)
    )::integer as puntos_ranking,
    (rp.ganador = pj.equipo) as gane,
    coalesce(k.total, 0)::integer,
    coalesce(k.ya_di, false)
  from public.partido_jugadores pj
  join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
  join public.partidos pa on pa.id = pj.partido_id
  left join lateral (
    select count(*) as total, bool_or(kp.de_jugador_id = auth.uid()) as ya_di
    from public.kudos_partido kp
    where kp.partido_id = pa.id and kp.jugador_id = p_id
  ) k on true
  where pj.jugador_id = p_id
  order by pa.fecha_hora desc
  limit 50;
end;
$$;

grant execute on function public.listar_partidos_ranking_jugador(uuid) to authenticated;
