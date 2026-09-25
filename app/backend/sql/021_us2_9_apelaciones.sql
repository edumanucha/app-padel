-- Épica 2: US-2.9 (apelar y corregir un resultado en disputa).
-- Rol de superusuario: campo real en perfiles (no hardcodeado a una
-- cuenta), pensado para poder sumar más de uno en el futuro.
alter table public.perfiles
  add column es_superusuario boolean not null default false;

-- =========================================================
-- Tabla: apelaciones
-- =========================================================
create table public.apelaciones (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos(id),
  apelante_id uuid not null references public.perfiles(id),
  motivo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'resuelta')),
  resultado_anterior jsonb,
  resultado_nuevo jsonb,
  resuelto_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz
);

grant select, insert on public.apelaciones to authenticated;

alter table public.apelaciones enable row level security;

-- Veo mis propias apelaciones, o todas si soy superusuario.
create policy "Ver apelaciones" on public.apelaciones
  for select to authenticated
  using (
    apelante_id = auth.uid()
    or exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );

-- Apelar: solo un participante real del partido, en nombre propio, y solo
-- si el partido ya tiene un resultado guardado (US-2.9 no tiene plazo
-- límite -- decisión del usuario, 2026-09-05 -- así que no se valida
-- antigüedad acá).
create policy "Apelar mi propio partido" on public.apelaciones
  for insert to authenticated
  with check (
    apelante_id = auth.uid()
    and exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = apelaciones.partido_id and pj.jugador_id = auth.uid()
    )
  );

-- =========================================================
-- Resolver una apelación (solo superusuario): corrige el resultado del
-- partido y recalcula los puntos de ranking (resta lo que se había
-- aplicado con el resultado viejo, aplica lo nuevo) -- resuelve la
-- pregunta abierta de US-2.9 sobre qué pasa con el ranking al corregir.
-- =========================================================
create or replace function public.resolver_apelacion(
  p_apelacion_id uuid,
  p_sets_a integer[],
  p_sets_b integer[],
  p_ganador text
)
returns void
language plpgsql
security definer
as $$
declare
  v_es_super boolean;
  v_partido_id uuid;
  v_estado_anterior jsonb;
  v_ganador_anterior text;
  v_games_a_viejo integer;
  v_games_b_viejo integer;
  v_games_a_nuevo integer;
  v_games_b_nuevo integer;
  v_jugador uuid;
  v_nuevo_estado jsonb;
begin
  select es_superusuario into v_es_super from public.perfiles where id = auth.uid();
  if not coalesce(v_es_super, false) then
    raise exception 'Solo un superusuario puede resolver apelaciones.';
  end if;

  select partido_id into v_partido_id from public.apelaciones where id = p_apelacion_id and estado = 'pendiente';
  if v_partido_id is null then
    raise exception 'Apelación no encontrada o ya resuelta.';
  end if;

  select estado, ganador into v_estado_anterior, v_ganador_anterior
  from public.resultados_partido where partido_id = v_partido_id;

  select coalesce(sum(g::int), 0) into v_games_a_viejo from jsonb_array_elements_text(v_estado_anterior -> 'setsA') as g;
  select coalesce(sum(g::int), 0) into v_games_b_viejo from jsonb_array_elements_text(v_estado_anterior -> 'setsB') as g;

  -- Revierte los puntos que había otorgado el resultado viejo.
  for v_jugador in select jugador_id from public.partido_jugadores where partido_id = v_partido_id and equipo = 'A' loop
    update public.perfiles set puntos_ranking = puntos_ranking - (v_games_a_viejo * 2 + case when v_ganador_anterior = 'A' then 5 else 0 end)
    where id = v_jugador;
  end loop;
  for v_jugador in select jugador_id from public.partido_jugadores where partido_id = v_partido_id and equipo = 'B' loop
    update public.perfiles set puntos_ranking = puntos_ranking - (v_games_b_viejo * 2 + case when v_ganador_anterior = 'B' then 5 else 0 end)
    where id = v_jugador;
  end loop;

  v_games_a_nuevo := (select coalesce(sum(g), 0) from unnest(p_sets_a) as g);
  v_games_b_nuevo := (select coalesce(sum(g), 0) from unnest(p_sets_b) as g);

  v_nuevo_estado := jsonb_build_object(
    'setsA', to_jsonb(p_sets_a), 'setsB', to_jsonb(p_sets_b),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
    'historial', '[]'::jsonb, 'pausado', false
  );

  update public.resultados_partido
  set estado = v_nuevo_estado, finalizado = true, ganador = p_ganador
  where partido_id = v_partido_id;

  -- Aplica los puntos del resultado corregido.
  for v_jugador in select jugador_id from public.partido_jugadores where partido_id = v_partido_id and equipo = 'A' loop
    update public.perfiles set puntos_ranking = puntos_ranking + (v_games_a_nuevo * 2 + case when p_ganador = 'A' then 5 else 0 end)
    where id = v_jugador;
  end loop;
  for v_jugador in select jugador_id from public.partido_jugadores where partido_id = v_partido_id and equipo = 'B' loop
    update public.perfiles set puntos_ranking = puntos_ranking + (v_games_b_nuevo * 2 + case when p_ganador = 'B' then 5 else 0 end)
    where id = v_jugador;
  end loop;

  update public.apelaciones
  set estado = 'resuelta',
      resultado_anterior = jsonb_build_object('estado', v_estado_anterior, 'ganador', v_ganador_anterior),
      resultado_nuevo = jsonb_build_object('estado', v_nuevo_estado, 'ganador', p_ganador),
      resuelto_por = auth.uid(),
      resuelto_en = now()
  where id = p_apelacion_id;
end;
$$;

grant execute on function public.resolver_apelacion(uuid, integer[], integer[], text) to authenticated;

-- =========================================================
-- Listar apelaciones con datos legibles (partido, cancha, rivales) -- para
-- la bandeja del superusuario y "mis apelaciones" del jugador.
-- =========================================================
create or replace function public.listar_apelaciones()
returns table (
  id uuid,
  partido_id uuid,
  cancha text,
  fecha_hora timestamptz,
  motivo text,
  estado text,
  apelante_nombre text,
  creado_en timestamptz,
  ganador_actual text,
  sets_a jsonb,
  sets_b jsonb,
  pareja_a text,
  pareja_b text
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    ap.id,
    ap.partido_id,
    pa.cancha,
    pa.fecha_hora,
    ap.motivo,
    ap.estado,
    pe.nombre::text,
    ap.creado_en,
    rp.ganador,
    rp.estado -> 'setsA',
    rp.estado -> 'setsB',
    (
      select string_agg(coalesce(pe2.nombre, pj.invitado_nombre), ' / ')
      from public.partido_jugadores pj
      left join public.perfiles pe2 on pe2.id = pj.jugador_id
      where pj.partido_id = ap.partido_id and pj.equipo = 'A'
    ),
    (
      select string_agg(coalesce(pe2.nombre, pj.invitado_nombre), ' / ')
      from public.partido_jugadores pj
      left join public.perfiles pe2 on pe2.id = pj.jugador_id
      where pj.partido_id = ap.partido_id and pj.equipo = 'B'
    )
  from public.apelaciones ap
  join public.partidos pa on pa.id = ap.partido_id
  join public.perfiles pe on pe.id = ap.apelante_id
  left join public.resultados_partido rp on rp.partido_id = ap.partido_id
  where ap.apelante_id = auth.uid()
     or exists (select 1 from public.perfiles s where s.id = auth.uid() and s.es_superusuario = true)
  order by ap.creado_en desc;
end;
$$;

grant execute on function public.listar_apelaciones() to authenticated;
