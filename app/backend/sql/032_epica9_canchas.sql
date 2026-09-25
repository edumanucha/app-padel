-- Épica 9: Mejoras al Directorio de Canchas (post-MVP).
-- US-9.1: reseñas y puntuación de canchas.
create table public.resenas_canchas (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid not null references public.canchas(id),
  jugador_id uuid not null references public.perfiles(id),
  puntuacion integer not null check (puntuacion between 1 and 5),
  comentario text,
  creado_en timestamptz not null default now(),
  unique (cancha_id, jugador_id)
);

grant select, insert on public.resenas_canchas to authenticated;

alter table public.resenas_canchas enable row level security;

create policy "Ver reseñas" on public.resenas_canchas
  for select to authenticated
  using (true);

-- Solo puedo reseñar una cancha donde jugué un partido con resultado
-- guardado -- el match cancha del partido <-> cancha del directorio es
-- por nombre exacto, mismo criterio heurístico que ya resolvió BUG-012
-- (US-4.3), porque `partidos.cancha` siempre fue texto libre.
create policy "Dejar mi reseña" on public.resenas_canchas
  for insert to authenticated
  with check (
    jugador_id = auth.uid()
    and exists (
      select 1
      from public.partido_jugadores pj
      join public.partidos pa on pa.id = pj.partido_id
      join public.resultados_partido rp on rp.partido_id = pa.id and rp.finalizado = true
      join public.canchas c on c.nombre = pa.cancha
      where pj.jugador_id = auth.uid() and c.id = resenas_canchas.cancha_id
    )
  );

-- Lista de reseñas de una cancha con el nombre de quien la dejó -- vía
-- RPC porque `perfiles` solo se puede leer directo para el propio (RLS,
-- Épica 1).
create or replace function public.listar_resenas_cancha(p_cancha_id uuid)
returns table (nombre text, puntuacion integer, comentario text, creado_en timestamptz)
language sql
security definer
stable
as $$
  select pe.nombre, r.puntuacion, r.comentario, r.creado_en
  from public.resenas_canchas r
  join public.perfiles pe on pe.id = r.jugador_id
  where r.cancha_id = p_cancha_id
  order by r.creado_en desc;
$$;

grant execute on function public.listar_resenas_cancha(uuid) to authenticated;

-- =========================================================
-- US-9.2: panel de administración de canchas (solo superusuario, mismo
-- rol de US-2.9 -- no es un rol nuevo).
-- =========================================================
grant insert, update on public.canchas to authenticated;

create policy "Superusuario crea canchas" on public.canchas
  for insert to authenticated
  with check (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );

create policy "Superusuario edita canchas" on public.canchas
  for update to authenticated
  using (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  )
  with check (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );
