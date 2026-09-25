-- Épica 2: US-2.7 (marcador en vivo) + primera pieza de US-3.1 (ranking por
-- puntos, Épica 3), que se dispara automáticamente al cerrarse un partido
-- desde acá. Correr en el SQL Editor de Supabase.
-- IMPORTANTE (paso manual fuera de SQL): en el dashboard de Supabase, ir a
-- Database → Replication y habilitar la tabla `resultados_partido` para que
-- Supabase Realtime pueda notificar cambios en vivo entre los dispositivos
-- de los jugadores.

-- Punto de oro (US-2.7): el organizador lo elige al crear el partido.
alter table public.partidos
  add column punto_de_oro boolean not null default false;

-- Equipo (pareja A/B) de cada jugador dentro de un partido -- necesario
-- para interpretar el marcador (quién suma a quién) y para repartir los
-- puntos de ranking (US-3.1) al equipo correcto. Se asigna la primera vez
-- que se abre el marcador (por orden de confirmación: los 2 primeros
-- confirmados = equipo A, los 2 siguientes = equipo B), no antes -- así no
-- hace falta pedirle al organizador que arme los equipos a mano.
alter table public.partido_jugadores
  add column equipo text check (equipo in ('A', 'B'));

-- Puntos de ranking acumulados (US-3.1, Épica 3): acumulado de por vida,
-- se sube automáticamente al finalizar un partido (ver trigger más abajo).
alter table public.perfiles
  add column puntos_ranking integer not null default 0;

-- =========================================================
-- Tabla: resultados_partido (estado en vivo + resultado final)
-- =========================================================
create table public.resultados_partido (
  partido_id uuid primary key references public.partidos(id),
  estado jsonb not null default '{
    "setsA": [0], "setsB": [0],
    "puntosA": 0, "puntosB": 0,
    "tiebreak": false, "saque": "A"
  }'::jsonb,
  finalizado boolean not null default false,
  ganador text check (ganador in ('A', 'B')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_resultados_partido_updated_at
before update on public.resultados_partido
for each row execute function public.set_updated_at();

grant select, insert, update on public.resultados_partido to authenticated;

alter table public.resultados_partido enable row level security;

-- Cualquiera de los 4 jugadores del partido puede ver y actualizar el
-- marcador -- por diseño (US-2.7): cualquiera de las dos parejas puede
-- cantar el punto, no hay un único "dueño" del marcador.
create policy "Participantes ven el marcador" on public.resultados_partido
  for select to authenticated
  using (
    exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = resultados_partido.partido_id and pj.jugador_id = auth.uid()
    )
  );

create policy "Participantes crean el marcador" on public.resultados_partido
  for insert to authenticated
  with check (
    exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = resultados_partido.partido_id and pj.jugador_id = auth.uid()
    )
  );

create policy "Participantes actualizan el marcador" on public.resultados_partido
  for update to authenticated
  using (
    exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = resultados_partido.partido_id and pj.jugador_id = auth.uid()
    )
  );

-- =========================================================
-- Al finalizar un partido (finalizado pasa a true): marca el partido como
-- "jugado" y aplica los puntos de ranking (US-3.1) -- 2 puntos por cada
-- game ganado (ambas parejas) + 5 de bono para la pareja ganadora,
-- acumulado de por vida en perfiles.puntos_ranking.
-- =========================================================
create or replace function public.aplicar_resultado_partido()
returns trigger as $$
declare
  v_games_a integer;
  v_games_b integer;
  v_jugador uuid;
begin
  if new.finalizado = true and (tg_op = 'INSERT' or old.finalizado is distinct from true) then
    update public.partidos set estado = 'jugado' where id = new.partido_id;

    select coalesce(sum(g::int), 0) into v_games_a
      from jsonb_array_elements_text(new.estado -> 'setsA') as g;
    select coalesce(sum(g::int), 0) into v_games_b
      from jsonb_array_elements_text(new.estado -> 'setsB') as g;

    for v_jugador in
      select jugador_id from public.partido_jugadores
      where partido_id = new.partido_id and equipo = 'A'
    loop
      update public.perfiles
      set puntos_ranking = puntos_ranking + v_games_a * 2 + (case when new.ganador = 'A' then 5 else 0 end)
      where id = v_jugador;
    end loop;

    for v_jugador in
      select jugador_id from public.partido_jugadores
      where partido_id = new.partido_id and equipo = 'B'
    loop
      update public.perfiles
      set puntos_ranking = puntos_ranking + v_games_b * 2 + (case when new.ganador = 'B' then 5 else 0 end)
      where id = v_jugador;
    end loop;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_aplicar_resultado_partido on public.resultados_partido;

create trigger trg_aplicar_resultado_partido
after insert or update on public.resultados_partido
for each row execute function public.aplicar_resultado_partido();
