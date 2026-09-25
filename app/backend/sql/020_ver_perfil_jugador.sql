-- Al tocar un jugador en el Directorio (US-3.5), ver su perfil reducido
-- (US-1.4) -- mismos datos que ya se muestran en el listado (nada de
-- teléfono ni otros datos de contacto, eso solo se habilita compartiendo
-- un partido y confirmando, US-2.6).
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
    pe.avatar_url,
    pe.nivel::integer,
    pe.mano_habil::text,
    pe.posicion::text,
    pe.sexo::text,
    pe.puntos_ranking::integer,
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
  where pe.id = p_id and pe.activo = true;
end;
$$;

grant execute on function public.ver_perfil_jugador(uuid) to authenticated;
