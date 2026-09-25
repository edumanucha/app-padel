-- "Blanquear" los puntajes del ranking (2026-09-13, a pedido del usuario,
-- charlado antes: mostrar el desglose partido por partido de CUALQUIER
-- jugador es más transparente/auditable que un puntaje total sin
-- explicación, y es menos invasivo que mostrar sus estadísticas detalladas
-- de Marcadorcito -- ver project_padelito_style_guide.md/memoria de la
-- charla de privacidad). Devuelve SOLO fecha/cancha/puntos/si ganó -- NADA
-- de con quién jugó ni quiebres/puntos de juego (eso sigue privado).
create or replace function public.listar_partidos_ranking_jugador(p_id uuid)
returns table (
  fecha_hora timestamptz,
  cancha text,
  puntos_ranking integer,
  gane boolean
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    pa.fecha_hora,
    pa.cancha,
    (
      (
        select coalesce(sum((g)::int), 0)
        from jsonb_array_elements_text(rp.estado -> (case when pj.equipo = 'A' then 'setsA' else 'setsB' end)) as g
      ) * 2
      + (case when rp.ganador = pj.equipo then 5 else 0 end)
    )::integer as puntos_ranking,
    (rp.ganador = pj.equipo) as gane
  from public.partido_jugadores pj
  join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
  join public.partidos pa on pa.id = pj.partido_id
  where pj.jugador_id = p_id
  order by pa.fecha_hora desc
  limit 50;
end;
$$;

grant execute on function public.listar_partidos_ranking_jugador(uuid) to authenticated;
