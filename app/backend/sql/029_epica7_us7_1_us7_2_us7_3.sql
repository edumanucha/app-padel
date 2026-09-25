-- Épica 7: Comunidad entre Jugadores (post-MVP).
-- US-7.1: jugadores frecuentes.
create table public.jugadores_frecuentes (
  jugador_id uuid not null references public.perfiles(id),
  frecuente_id uuid not null references public.perfiles(id),
  created_at timestamptz not null default now(),
  primary key (jugador_id, frecuente_id),
  check (jugador_id <> frecuente_id)
);

grant select, insert, delete on public.jugadores_frecuentes to authenticated;

alter table public.jugadores_frecuentes enable row level security;

create policy "Ver mis frecuentes" on public.jugadores_frecuentes
  for select to authenticated
  using (jugador_id = auth.uid());

create policy "Marcar un frecuente" on public.jugadores_frecuentes
  for insert to authenticated
  with check (jugador_id = auth.uid());

create policy "Desmarcar un frecuente" on public.jugadores_frecuentes
  for delete to authenticated
  using (jugador_id = auth.uid());

-- Lista mis frecuentes con nombre, para priorizarlos en el buscador de
-- invitación (US-2.3/US-3.5).
create or replace function public.listar_mis_frecuentes()
returns table (id uuid, nombre text)
language sql
security definer
stable
as $$
  select pe.id, pe.nombre
  from public.jugadores_frecuentes jf
  join public.perfiles pe on pe.id = jf.frecuente_id
  where jf.jugador_id = auth.uid() and pe.activo = true
  order by pe.nombre asc;
$$;

grant execute on function public.listar_mis_frecuentes() to authenticated;

-- US-7.2 (historial entre jugadores) + US-7.3 (compatibilidad de duplas):
-- se agregan al mismo RPC que ya arma el perfil reducido de un jugador
-- (US-1.4/US-3.5), relativos a quien está mirando (auth.uid()).
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
    exists (
      select 1 from public.jugadores_frecuentes jf
      where jf.jugador_id = auth.uid() and jf.frecuente_id = p_id
    ),
    coalesce(rel.veces_con, 0)::integer,
    coalesce(rel.veces_contra, 0)::integer,
    -- Solo se muestra si jugaron al menos 2 partidos juntos -- ver
    -- pregunta abierta de US-7.3 resuelta así (evita un "100%" con un
    -- solo partido de muestra).
    case when coalesce(rel.veces_con, 0) >= 2 then rel.compat_pct::integer else null end
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
