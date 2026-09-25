-- BUG-020: US-6.5 pide que el no-show sea "visible en el perfil (mismo
-- criterio de visibilidad que el ranking -- público)", pero 026 solo
-- expone `no_show` por partido (ver_participantes_partido) -- nunca se
-- sumó un contador agregado a ningún lado. Se agrega a ver_perfil_jugador
-- (el perfil reducido de OTRO jugador, US-3.5/US-7.x), que es el lugar
-- donde tiene sentido de negocio (decidir si invitar a alguien).
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
  compatibilidad_pct integer
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
    case when coalesce(rel.veces_con, 0) >= 2 then rel.compat_pct::integer else null end
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
  where pe.id = p_id and pe.activo = true;
end;
$$;

grant execute on function public.ver_perfil_jugador(uuid) to authenticated;
