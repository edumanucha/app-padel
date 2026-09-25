-- Kudos por partido (2026-09-13, a pedido del usuario, tras el research
-- de gamificación: "cada actividad en Strava recibe kudos de otros
-- usuarios, y eso sube 5.6x la retención"). Un gesto social bien chico:
-- felicitar a otro jugador por UN partido puntual de su lista de "Partidos
-- y puntos de ranking" (056_partidos_ranking_jugador.sql). Clave primaria
-- compuesta = no se puede dar kudos dos veces al mismo partido de la
-- misma persona (evita el spam), y sirve para poder sacarlo (toggle).
create table public.kudos_partido (
  partido_id uuid not null references public.partidos(id),
  jugador_id uuid not null references public.perfiles(id), -- quien lo recibe
  de_jugador_id uuid not null references public.perfiles(id), -- quien lo da
  creado_en timestamptz not null default now(),
  primary key (partido_id, jugador_id, de_jugador_id)
);

grant select, insert, delete on public.kudos_partido to authenticated;

alter table public.kudos_partido enable row level security;

-- Los kudos son públicos (como en Strava) -- ver cuántos aplausos tiene un
-- partido no expone nada más sensible que lo que ya se ve en el ranking.
create policy "Ver kudos" on public.kudos_partido
  for select to authenticated
  using (true);

create policy "Dar kudos" on public.kudos_partido
  for insert to authenticated
  with check (de_jugador_id = auth.uid());

create policy "Sacar mi kudos" on public.kudos_partido
  for delete to authenticated
  using (de_jugador_id = auth.uid());
