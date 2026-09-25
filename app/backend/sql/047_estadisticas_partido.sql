-- Estadísticas de Marcadorcito por partido (2026-09-10, a pedido del
-- usuario): un partido jugado con el marcador real ya tiene sets/games en
-- resultados_partido, pero no puntos de juego/quiebres/rachas -- esta tabla
-- guarda esos números agregados por equipo, calculados una vez al terminar
-- el partido. Es la base para la sección "Estadísticas de Marcadorcito" del
-- perfil (diseño validado con un mockup, ver artifact "Estadísticas
-- Marcadorcito"). Correr en el SQL Editor de Supabase, después de 046.
--
-- Por qué por EQUIPO y no por jugador: el pádel se juega en pareja, así que
-- "quiebres"/"puntos de juego"/etc. son del equipo, no de una persona
-- suelta -- para saber los números de UN jugador puntual alcanza con
-- cruzar partido_jugadores.equipo (ya existe desde US-2.7) contra las
-- columnas _a/_b de acá.

create table public.estadisticas_partido (
  partido_id uuid primary key references public.partidos(id),
  duracion_ms integer not null default 0,
  saca_primero text check (saca_primero in ('A', 'B')),

  puntos_totales_a integer not null default 0,
  puntos_totales_b integer not null default 0,

  quiebres_conv_a integer not null default 0,
  quiebres_op_a integer not null default 0,
  quiebres_conv_b integer not null default 0,
  quiebres_op_b integer not null default 0,

  puntos_juego_conv_a integer not null default 0,
  puntos_juego_op_a integer not null default 0,
  puntos_juego_conv_b integer not null default 0,
  puntos_juego_op_b integer not null default 0,

  racha_max_a integer not null default 0,
  racha_max_b integer not null default 0,
  games_en_deuce integer not null default 0,

  created_at timestamptz not null default now()
);

grant select, insert on public.estadisticas_partido to authenticated;

alter table public.estadisticas_partido enable row level security;

-- Mismo criterio de acceso que resultados_partido (US-2.7): cualquiera de
-- los 4 jugadores del partido puede ver sus estadísticas.
create policy "Participantes ven las estadisticas" on public.estadisticas_partido
  for select to authenticated
  using (
    exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = estadisticas_partido.partido_id and pj.jugador_id = auth.uid()
    )
  );

create policy "Participantes crean las estadisticas" on public.estadisticas_partido
  for insert to authenticated
  with check (
    exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = estadisticas_partido.partido_id and pj.jugador_id = auth.uid()
    )
  );
