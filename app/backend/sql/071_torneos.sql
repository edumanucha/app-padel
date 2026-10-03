-- =========================================================
-- 071 · Torneos entre amigos (2026-10-03)
-- =========================================================
-- Formatos: americano, mexicano, liga y eliminación directa (parejas fijas).
-- Reglas que definió el usuario:
--  - El torneo es SUELTO (no hace falta que pertenezca a un grupo).
--  - Pueden jugar personas con cuenta o invitados (solo un nombre).
--  - El organizador carga los resultados.
--  - Tiene su propia tabla: NO toca el ranking global.
--
-- Seguridad: las tablas tienen RLS y no hay políticas de escritura; todo
-- cambio pasa por las funciones de abajo (security definer), que validan con
-- auth.uid() que quien llama es el organizador. Ven el torneo el organizador
-- y los participantes con cuenta.
--
-- Los cruces los arma la app (lib/torneos.js) y se guardan ronda por ronda.
-- Correr entero, una vez, en el SQL Editor de Supabase. Se puede volver a
-- correr sin romper nada.

-- ---------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------
create table if not exists public.torneos (
  id uuid primary key default gen_random_uuid(),
  organizador_id uuid not null references public.perfiles(id),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 60),
  formato text not null check (formato in ('americano', 'mexicano', 'liga', 'eliminacion')),
  puntos_partido integer not null check (puntos_partido between 8 and 99),
  canchas integer not null check (canchas between 1 and 4),
  total_rondas integer check (total_rondas between 1 and 30),
  puntos_victoria integer not null default 3 check (puntos_victoria between 0 and 10),
  puntos_empate integer not null default 1 check (puntos_empate between 0 and 10),
  estado text not null default 'en_juego' check (estado in ('en_juego', 'terminado')),
  -- Para el link público de seguimiento en vivo (más adelante).
  codigo text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  creado_en timestamptz not null default now(),
  terminado_en timestamptz
);
create index if not exists torneos_organizador_idx on public.torneos (organizador_id);

create table if not exists public.torneo_participantes (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.torneos(id) on delete cascade,
  -- Con cuenta: jugador_id. Invitado: null (solo el nombre).
  jugador_id uuid references public.perfiles(id),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 40),
  orden integer not null,
  -- Parejas fijas (liga y eliminación): número de pareja, 0, 1, 2...
  pareja integer
);
create index if not exists torneo_participantes_torneo_idx on public.torneo_participantes (torneo_id);
create index if not exists torneo_participantes_jugador_idx on public.torneo_participantes (jugador_id);
create unique index if not exists torneo_participantes_unico_idx
  on public.torneo_participantes (torneo_id, jugador_id) where jugador_id is not null;

create table if not exists public.torneo_rondas (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.torneos(id) on delete cascade,
  numero integer not null,
  titulo text,
  -- Ids de participante (o "e0", "e1"... en parejas fijas).
  descansan text[] not null default '{}',
  pasan text[] not null default '{}',
  unique (torneo_id, numero)
);

create table if not exists public.torneo_partidos (
  id uuid primary key default gen_random_uuid(),
  ronda_id uuid not null references public.torneo_rondas(id) on delete cascade,
  torneo_id uuid not null references public.torneos(id) on delete cascade,
  cancha integer not null,
  a text[] not null,
  b text[] not null,
  pts_a integer check (pts_a >= 0),
  pts_b integer check (pts_b >= 0)
);
create index if not exists torneo_partidos_ronda_idx on public.torneo_partidos (ronda_id);

-- ---------------------------------------------------------
-- Quién puede ver un torneo: el organizador y los participantes con cuenta
-- ---------------------------------------------------------
create or replace function public.puede_ver_torneo(p_torneo uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.torneos t where t.id = p_torneo and t.organizador_id = auth.uid())
      or exists (select 1 from public.torneo_participantes p where p.torneo_id = p_torneo and p.jugador_id = auth.uid());
$$;

alter table public.torneos enable row level security;
alter table public.torneo_participantes enable row level security;
alter table public.torneo_rondas enable row level security;
alter table public.torneo_partidos enable row level security;

drop policy if exists "Ver mis torneos" on public.torneos;
create policy "Ver mis torneos" on public.torneos
  for select to authenticated using (public.puede_ver_torneo(id));

drop policy if exists "Ver participantes de mis torneos" on public.torneo_participantes;
create policy "Ver participantes de mis torneos" on public.torneo_participantes
  for select to authenticated using (public.puede_ver_torneo(torneo_id));

drop policy if exists "Ver rondas de mis torneos" on public.torneo_rondas;
create policy "Ver rondas de mis torneos" on public.torneo_rondas
  for select to authenticated using (public.puede_ver_torneo(torneo_id));

drop policy if exists "Ver partidos de mis torneos" on public.torneo_partidos;
create policy "Ver partidos de mis torneos" on public.torneo_partidos
  for select to authenticated using (public.puede_ver_torneo(torneo_id));

-- ---------------------------------------------------------
-- Crear el torneo con sus participantes
-- p_participantes: [{"nombre": "Franco", "jugador_id": "<uuid>" | null}, ...]
-- En liga y eliminación los participantes van de a 2: cada par es una pareja.
-- Devuelve {id, participantes: [{id, nombre, orden, pareja}]}.
-- ---------------------------------------------------------
create or replace function public.crear_torneo(
  p_nombre text,
  p_formato text,
  p_puntos integer,
  p_canchas integer,
  p_total_rondas integer,
  p_pv integer,
  p_pe integer,
  p_participantes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_n integer;
  v_item jsonb;
  v_idx integer := 0;
  v_jugador uuid;
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  if char_length(btrim(coalesce(p_nombre, ''))) not between 2 and 60 then raise exception 'nombre_invalido'; end if;
  if p_formato not in ('americano', 'mexicano', 'liga', 'eliminacion') then raise exception 'formato_invalido'; end if;
  if p_puntos not between 8 and 99 or p_canchas not between 1 and 4 then raise exception 'config_invalida'; end if;
  if jsonb_typeof(p_participantes) <> 'array' then raise exception 'participantes_invalidos'; end if;

  v_n := jsonb_array_length(p_participantes);
  if v_n not in (8, 12, 16) then raise exception 'cantidad_invalida'; end if;
  if (select count(*) from public.torneos where organizador_id = auth.uid() and estado = 'en_juego') >= 20 then
    raise exception 'limite_torneos';
  end if;

  insert into public.torneos (organizador_id, nombre, formato, puntos_partido, canchas, total_rondas, puntos_victoria, puntos_empate)
  values (auth.uid(), btrim(p_nombre), p_formato, p_puntos, p_canchas, p_total_rondas, coalesce(p_pv, 3), coalesce(p_pe, 1))
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_participantes) loop
    if char_length(btrim(coalesce(v_item ->> 'nombre', ''))) not between 1 and 40 then raise exception 'nombre_participante_invalido'; end if;
    v_jugador := nullif(v_item ->> 'jugador_id', '')::uuid;
    if v_jugador is not null and not exists (select 1 from public.perfiles where id = v_jugador and activo = true) then
      raise exception 'jugador_invalido';
    end if;
    insert into public.torneo_participantes (torneo_id, jugador_id, nombre, orden, pareja)
    values (
      v_id, v_jugador, btrim(v_item ->> 'nombre'), v_idx,
      case when p_formato in ('liga', 'eliminacion') then v_idx / 2 else null end
    );
    v_idx := v_idx + 1;
  end loop;

  return jsonb_build_object(
    'id', v_id,
    'participantes', (
      select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'orden', p.orden, 'pareja', p.pareja) order by p.orden)
      from public.torneo_participantes p where p.torneo_id = v_id
    )
  );
end;
$$;

-- ---------------------------------------------------------
-- Guardar una ronda (con sus partidos). Los números van en orden: 1, 2, 3...
-- p_partidos: [{"cancha": 1, "a": ["..."], "b": ["..."]}, ...]
-- Si la ronda ya existía (por un reintento), devuelve la guardada.
-- ---------------------------------------------------------
create or replace function public.guardar_ronda(
  p_torneo uuid,
  p_numero integer,
  p_titulo text,
  p_partidos jsonb,
  p_descansan text[],
  p_pasan text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ronda uuid;
  v_ultimo integer;
  v_item jsonb;
begin
  if not exists (select 1 from public.torneos where id = p_torneo and organizador_id = auth.uid() and estado = 'en_juego') then
    raise exception 'solo_organizador';
  end if;

  select id into v_ronda from public.torneo_rondas where torneo_id = p_torneo and numero = p_numero;
  if v_ronda is null then
    select coalesce(max(numero), 0) into v_ultimo from public.torneo_rondas where torneo_id = p_torneo;
    if p_numero <> v_ultimo + 1 then raise exception 'ronda_fuera_de_orden'; end if;
    if jsonb_typeof(p_partidos) <> 'array' or jsonb_array_length(p_partidos) not between 1 and 8 then
      raise exception 'partidos_invalidos';
    end if;

    insert into public.torneo_rondas (torneo_id, numero, titulo, descansan, pasan)
    values (p_torneo, p_numero, nullif(btrim(coalesce(p_titulo, '')), ''), coalesce(p_descansan, '{}'), coalesce(p_pasan, '{}'))
    returning id into v_ronda;

    for v_item in select * from jsonb_array_elements(p_partidos) loop
      insert into public.torneo_partidos (ronda_id, torneo_id, cancha, a, b)
      values (
        v_ronda, p_torneo, (v_item ->> 'cancha')::integer,
        array(select jsonb_array_elements_text(v_item -> 'a')),
        array(select jsonb_array_elements_text(v_item -> 'b'))
      );
    end loop;
  end if;

  return jsonb_build_object(
    'ronda_id', v_ronda,
    'partidos', (
      select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'cancha', m.cancha) order by m.cancha), '[]'::jsonb)
      from public.torneo_partidos m where m.ronda_id = v_ronda
    )
  );
end;
$$;

-- ---------------------------------------------------------
-- Cargar el resultado de un partido (la suma tiene que dar los puntos del partido)
-- ---------------------------------------------------------
create or replace function public.cargar_resultado_torneo(p_partido uuid, p_pts_a integer, p_pts_b integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_puntos integer;
begin
  select t.puntos_partido into v_puntos
  from public.torneo_partidos m
  join public.torneos t on t.id = m.torneo_id
  where m.id = p_partido and t.organizador_id = auth.uid() and t.estado = 'en_juego';
  if v_puntos is null then raise exception 'solo_organizador'; end if;
  if p_pts_a is null or p_pts_b is null or p_pts_a < 0 or p_pts_b < 0 or p_pts_a + p_pts_b <> v_puntos then
    raise exception 'resultado_invalido';
  end if;
  update public.torneo_partidos set pts_a = p_pts_a, pts_b = p_pts_b where id = p_partido;
end;
$$;

create or replace function public.terminar_torneo(p_torneo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.torneos set estado = 'terminado', terminado_en = now()
  where id = p_torneo and organizador_id = auth.uid() and estado = 'en_juego';
  if not found then raise exception 'solo_organizador'; end if;
end;
$$;

create or replace function public.eliminar_torneo(p_torneo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.torneos where id = p_torneo and organizador_id = auth.uid();
  if not found then raise exception 'solo_organizador'; end if;
end;
$$;

-- ---------------------------------------------------------
-- Lecturas
-- ---------------------------------------------------------
create or replace function public.mis_torneos()
returns table (id uuid, nombre text, formato text, estado text, creado_en timestamptz, participantes integer, soy_organizador boolean)
language sql
security definer
stable
set search_path = public
as $$
  select
    t.id,
    t.nombre::text,
    t.formato::text,
    t.estado::text,
    t.creado_en,
    (select count(*) from public.torneo_participantes p where p.torneo_id = t.id)::integer,
    (t.organizador_id = auth.uid())
  from public.torneos t
  where public.puede_ver_torneo(t.id)
  order by t.creado_en desc
  limit 50;
$$;

-- Todo el torneo en una sola consulta (null si no existe o no lo podés ver).
create or replace function public.torneo_completo(p_torneo uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'torneo', jsonb_build_object(
      'id', t.id, 'nombre', t.nombre, 'formato', t.formato, 'puntos_partido', t.puntos_partido,
      'canchas', t.canchas, 'total_rondas', t.total_rondas, 'puntos_victoria', t.puntos_victoria,
      'puntos_empate', t.puntos_empate, 'estado', t.estado, 'codigo', t.codigo,
      'creado_en', t.creado_en, 'soy_organizador', (t.organizador_id = auth.uid())
    ),
    'participantes', (
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'orden', p.orden, 'pareja', p.pareja, 'jugador_id', p.jugador_id) order by p.orden), '[]'::jsonb)
      from public.torneo_participantes p where p.torneo_id = t.id
    ),
    'rondas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'numero', r.numero, 'titulo', r.titulo,
        'descansan', to_jsonb(r.descansan), 'pasan', to_jsonb(r.pasan),
        'partidos', (
          select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'cancha', m.cancha, 'a', to_jsonb(m.a), 'b', to_jsonb(m.b), 'ptsA', m.pts_a, 'ptsB', m.pts_b) order by m.cancha), '[]'::jsonb)
          from public.torneo_partidos m where m.ronda_id = r.id
        )
      ) order by r.numero), '[]'::jsonb)
      from public.torneo_rondas r where r.torneo_id = t.id
    )
  )
  from public.torneos t
  where t.id = p_torneo and public.puede_ver_torneo(t.id);
$$;

-- ---------------------------------------------------------
-- Permisos: solo usuarios con sesión
-- ---------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'puede_ver_torneo(uuid)',
    'crear_torneo(text, text, integer, integer, integer, integer, integer, jsonb)',
    'guardar_ronda(uuid, integer, text, jsonb, text[], text[])',
    'cargar_resultado_torneo(uuid, integer, integer)',
    'terminar_torneo(uuid)', 'eliminar_torneo(uuid)',
    'mis_torneos()', 'torneo_completo(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- Verificación (debería dar 4 tablas y 7 funciones):
-- select (select count(*) from information_schema.tables where table_schema = 'public' and table_name like 'torneo%') as tablas,
--        (select count(*) from pg_proc where proname in ('crear_torneo','guardar_ronda','cargar_resultado_torneo','terminar_torneo','eliminar_torneo','mis_torneos','torneo_completo')) as funciones;
