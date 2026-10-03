-- =========================================================
-- 069 · Grupos de amigos (2026-10-03)
-- =========================================================
-- Un grupo es un círculo de amigos con su propio ranking y cara a cara.
-- Reglas que definió el usuario:
--  - Cuenta un partido terminado si juegan AL MENOS 3 miembros del grupo.
--  - Mismos puntos que el ranking global: games ganados x 2 + 5 si ganó.
--  - Se arma con un nombre y se invita por link (código) o eligiendo
--    jugadores de Padelito (invitación).
--  - Quien lo crea es admin (puede sacar gente e invitar); cualquiera puede
--    salirse. Máximo 5 grupos por persona (y 30 miembros por grupo).
--  - Solo los miembros ven las estadísticas del grupo.
--
-- Seguridad: las tablas tienen RLS y NO hay políticas de insert/update/delete;
-- todo cambio pasa por las funciones de abajo (security definer), que
-- validan quién es quien llama con auth.uid().
--
-- Correr entero, una vez, en el SQL Editor de Supabase. Se puede volver a
-- correr sin romper nada (create if not exists / create or replace).

-- ---------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------
create table if not exists public.grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 40),
  creador_id uuid not null references public.perfiles(id),
  -- Código del link de invitación: 12 caracteres al azar.
  codigo text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at timestamptz not null default now()
);

create table if not exists public.grupo_miembros (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  jugador_id uuid not null references public.perfiles(id),
  rol text not null default 'miembro' check (rol in ('admin', 'miembro')),
  created_at timestamptz not null default now(),
  primary key (grupo_id, jugador_id)
);
create index if not exists grupo_miembros_jugador_idx on public.grupo_miembros (jugador_id);

create table if not exists public.grupo_invitaciones (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  jugador_id uuid not null references public.perfiles(id),
  invitado_por uuid not null references public.perfiles(id),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  created_at timestamptz not null default now(),
  unique (grupo_id, jugador_id)
);
create index if not exists grupo_invitaciones_jugador_idx on public.grupo_invitaciones (jugador_id);

-- ---------------------------------------------------------
-- Ayudas para las políticas (security definer: evitan recursión de RLS)
-- ---------------------------------------------------------
create or replace function public.es_miembro_grupo(p_grupo uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.grupo_miembros
    where grupo_id = p_grupo and jugador_id = auth.uid()
  );
$$;

create or replace function public.es_admin_grupo(p_grupo uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.grupo_miembros
    where grupo_id = p_grupo and jugador_id = auth.uid() and rol = 'admin'
  );
$$;

-- ---------------------------------------------------------
-- RLS: solo lectura para los miembros; los cambios van por las funciones
-- ---------------------------------------------------------
alter table public.grupos enable row level security;
alter table public.grupo_miembros enable row level security;
alter table public.grupo_invitaciones enable row level security;

drop policy if exists "Ver mis grupos" on public.grupos;
create policy "Ver mis grupos" on public.grupos
  for select to authenticated
  using (public.es_miembro_grupo(id));

drop policy if exists "Ver miembros de mis grupos" on public.grupo_miembros;
create policy "Ver miembros de mis grupos" on public.grupo_miembros
  for select to authenticated
  using (public.es_miembro_grupo(grupo_id));

drop policy if exists "Ver mis invitaciones" on public.grupo_invitaciones;
create policy "Ver mis invitaciones" on public.grupo_invitaciones
  for select to authenticated
  using (jugador_id = auth.uid() or public.es_admin_grupo(grupo_id));

-- ---------------------------------------------------------
-- Cálculo interno del ranking (no se llama desde la app: lo usan las
-- funciones públicas de abajo, que antes comprueban que quien llama es miembro)
-- ---------------------------------------------------------

-- Partidos terminados que cuentan para el grupo: juegan al menos 3 miembros.
-- p_periodo: 'mes' (mes actual, hora de Argentina) o 'siempre'.
create or replace function public._partidos_validos_grupo(p_grupo uuid, p_periodo text)
returns table (partido_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select pj.partido_id
  from public.partido_jugadores pj
  join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
  join public.partidos pa on pa.id = pj.partido_id
  where pj.equipo is not null
    and pj.jugador_id in (select gm.jugador_id from public.grupo_miembros gm where gm.grupo_id = p_grupo)
    and (
      p_periodo <> 'mes'
      or date_trunc('month', pa.fecha_hora at time zone 'America/Argentina/Buenos_Aires')
         = date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires')
    )
  group by pj.partido_id
  having count(*) >= 3;
$$;

-- Partidos, ganados, perdidos y puntos de cada miembro dentro del grupo.
create or replace function public._puntos_grupo(p_grupo uuid, p_periodo text)
returns table (jugador_id uuid, pj integer, pg integer, pp integer, puntos integer)
language sql
security definer
stable
set search_path = public
as $$
  select
    j.jugador_id,
    count(*)::integer,
    (count(*) filter (where rp.ganador = j.equipo))::integer,
    (count(*) filter (where rp.ganador <> j.equipo))::integer,
    (sum(
      (
        select coalesce(sum((g)::int), 0)
        from jsonb_array_elements_text(rp.estado -> (case when j.equipo = 'A' then 'setsA' else 'setsB' end)) as g
      ) * 2
      + (case when rp.ganador = j.equipo then 5 else 0 end)
    ))::integer
  from public.partido_jugadores j
  join public._partidos_validos_grupo(p_grupo, p_periodo) v on v.partido_id = j.partido_id
  join public.resultados_partido rp on rp.partido_id = j.partido_id
  where j.equipo is not null
    and j.jugador_id in (select gm.jugador_id from public.grupo_miembros gm where gm.grupo_id = p_grupo)
  group by j.jugador_id;
$$;

revoke all on function public._partidos_validos_grupo(uuid, text) from public, anon, authenticated;
revoke all on function public._puntos_grupo(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------
-- Crear, unirse, invitar, salir
-- ---------------------------------------------------------
create or replace function public.crear_grupo(p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  if (select count(*) from public.grupo_miembros where jugador_id = auth.uid()) >= 5 then
    raise exception 'limite_grupos';
  end if;
  if char_length(btrim(coalesce(p_nombre, ''))) not between 2 and 40 then
    raise exception 'nombre_invalido';
  end if;

  insert into public.grupos (nombre, creador_id) values (btrim(p_nombre), auth.uid()) returning id into v_id;
  insert into public.grupo_miembros (grupo_id, jugador_id, rol) values (v_id, auth.uid(), 'admin');
  return v_id;
end;
$$;

-- Vista previa de un grupo a partir del código del link (antes de unirse).
create or replace function public.ver_grupo_por_codigo(p_codigo text)
returns table (id uuid, nombre text, miembros integer, ya_soy_miembro boolean)
language sql
security definer
stable
set search_path = public
as $$
  select
    g.id,
    g.nombre::text,
    (select count(*) from public.grupo_miembros m where m.grupo_id = g.id)::integer,
    exists (select 1 from public.grupo_miembros m where m.grupo_id = g.id and m.jugador_id = auth.uid())
  from public.grupos g
  where auth.uid() is not null and g.codigo = lower(btrim(p_codigo));
$$;

create or replace function public.unirse_a_grupo(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo uuid;
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  select id into v_grupo from public.grupos where codigo = lower(btrim(p_codigo));
  if v_grupo is null then raise exception 'codigo_invalido'; end if;

  -- Si ya es miembro, no hace nada.
  if exists (select 1 from public.grupo_miembros where grupo_id = v_grupo and jugador_id = auth.uid()) then
    return v_grupo;
  end if;
  if (select count(*) from public.grupo_miembros where jugador_id = auth.uid()) >= 5 then
    raise exception 'limite_grupos';
  end if;
  if (select count(*) from public.grupo_miembros where grupo_id = v_grupo) >= 30 then
    raise exception 'grupo_lleno';
  end if;

  insert into public.grupo_miembros (grupo_id, jugador_id) values (v_grupo, auth.uid());
  update public.grupo_invitaciones set estado = 'aceptada'
    where grupo_id = v_grupo and jugador_id = auth.uid() and estado = 'pendiente';
  return v_grupo;
end;
$$;

-- El admin invita a un jugador de Padelito.
create or replace function public.invitar_a_grupo(p_grupo uuid, p_jugador uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin_grupo(p_grupo) then raise exception 'solo_admin'; end if;
  if not exists (select 1 from public.perfiles where id = p_jugador and activo = true) then
    raise exception 'jugador_invalido';
  end if;
  if exists (select 1 from public.grupo_miembros where grupo_id = p_grupo and jugador_id = p_jugador) then
    raise exception 'ya_es_miembro';
  end if;

  insert into public.grupo_invitaciones as gi (grupo_id, jugador_id, invitado_por)
  values (p_grupo, p_jugador, auth.uid())
  on conflict (grupo_id, jugador_id) do update
    set estado = 'pendiente', invitado_por = auth.uid(), created_at = now()
    where gi.estado <> 'pendiente';
end;
$$;

create or replace function public.responder_invitacion_grupo(p_invitacion uuid, p_aceptar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.grupo_invitaciones%rowtype;
begin
  select * into v_inv from public.grupo_invitaciones
    where id = p_invitacion and jugador_id = auth.uid() and estado = 'pendiente';
  if v_inv.id is null then raise exception 'invitacion_invalida'; end if;

  if not p_aceptar then
    update public.grupo_invitaciones set estado = 'rechazada' where id = v_inv.id;
    return;
  end if;

  if (select count(*) from public.grupo_miembros where jugador_id = auth.uid()) >= 5 then
    raise exception 'limite_grupos';
  end if;
  if (select count(*) from public.grupo_miembros where grupo_id = v_inv.grupo_id) >= 30 then
    raise exception 'grupo_lleno';
  end if;

  insert into public.grupo_miembros (grupo_id, jugador_id) values (v_inv.grupo_id, auth.uid())
    on conflict do nothing;
  update public.grupo_invitaciones set estado = 'aceptada' where id = v_inv.id;
end;
$$;

-- Salirse. Si era el último, el grupo se borra; si era el único admin, pasa
-- a ser admin el miembro más antiguo.
create or replace function public.salir_del_grupo(p_grupo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_miembro_grupo(p_grupo) then raise exception 'no_es_miembro'; end if;
  delete from public.grupo_miembros where grupo_id = p_grupo and jugador_id = auth.uid();

  if not exists (select 1 from public.grupo_miembros where grupo_id = p_grupo) then
    delete from public.grupos where id = p_grupo;
  elsif not exists (select 1 from public.grupo_miembros where grupo_id = p_grupo and rol = 'admin') then
    update public.grupo_miembros set rol = 'admin'
      where grupo_id = p_grupo
        and jugador_id = (select jugador_id from public.grupo_miembros where grupo_id = p_grupo order by created_at asc limit 1);
  end if;
end;
$$;

create or replace function public.sacar_del_grupo(p_grupo uuid, p_jugador uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin_grupo(p_grupo) then raise exception 'solo_admin'; end if;
  if p_jugador = auth.uid() then raise exception 'usar_salir_del_grupo'; end if;
  delete from public.grupo_miembros where grupo_id = p_grupo and jugador_id = p_jugador;
end;
$$;

create or replace function public.eliminar_grupo(p_grupo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin_grupo(p_grupo) then raise exception 'solo_admin'; end if;
  delete from public.grupos where id = p_grupo;
end;
$$;

-- ---------------------------------------------------------
-- Lecturas para la app (todas comprueban que quien llama es miembro)
-- ---------------------------------------------------------
create or replace function public.mis_invitaciones_grupo()
returns table (id uuid, grupo_id uuid, grupo_nombre text, invitado_por_nombre text, created_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select i.id, i.grupo_id, g.nombre::text, p.nombre::text, i.created_at
  from public.grupo_invitaciones i
  join public.grupos g on g.id = i.grupo_id
  join public.perfiles p on p.id = i.invitado_por
  where i.jugador_id = auth.uid() and i.estado = 'pendiente'
  order by i.created_at desc;
$$;

create or replace function public.mis_grupos()
returns table (
  grupo_id uuid, nombre text, es_admin boolean, miembros integer, partidos integer,
  mi_posicion integer, mis_puntos integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    g.id,
    g.nombre::text,
    (gm.rol = 'admin'),
    (select count(*) from public.grupo_miembros x where x.grupo_id = g.id)::integer,
    (select count(*) from public._partidos_validos_grupo(g.id, 'siempre'))::integer,
    (
      select r.pos from (
        select m2.jugador_id as jid, (rank() over (order by coalesce(s2.puntos, 0) desc))::integer as pos
        from public.grupo_miembros m2
        left join public._puntos_grupo(g.id, 'siempre') s2 on s2.jugador_id = m2.jugador_id
        where m2.grupo_id = g.id
      ) r where r.jid = auth.uid()
    ),
    coalesce((select s3.puntos from public._puntos_grupo(g.id, 'siempre') s3 where s3.jugador_id = auth.uid()), 0)
  from public.grupo_miembros gm
  join public.grupos g on g.id = gm.grupo_id
  where gm.jugador_id = auth.uid()
  order by g.created_at asc;
$$;

-- Datos del grupo. El código del link solo lo ve el admin.
create or replace function public.datos_grupo(p_grupo uuid)
returns table (id uuid, nombre text, es_admin boolean, codigo text, miembros integer)
language sql
security definer
stable
set search_path = public
as $$
  select
    g.id,
    g.nombre::text,
    public.es_admin_grupo(g.id),
    (case when public.es_admin_grupo(g.id) then g.codigo else null end)::text,
    (select count(*) from public.grupo_miembros x where x.grupo_id = g.id)::integer
  from public.grupos g
  where g.id = p_grupo and public.es_miembro_grupo(g.id);
$$;

create or replace function public.ranking_grupo(p_grupo uuid, p_periodo text default 'mes')
returns table (jugador_id uuid, nombre text, pj integer, pg integer, pp integer, puntos integer, es_admin boolean)
language sql
security definer
stable
set search_path = public
as $$
  select
    gm.jugador_id,
    pe.nombre::text,
    coalesce(s.pj, 0),
    coalesce(s.pg, 0),
    coalesce(s.pp, 0),
    coalesce(s.puntos, 0),
    (gm.rol = 'admin')
  from public.grupo_miembros gm
  join public.perfiles pe on pe.id = gm.jugador_id
  left join public._puntos_grupo(p_grupo, case when p_periodo = 'mes' then 'mes' else 'siempre' end) s
    on s.jugador_id = gm.jugador_id
  where gm.grupo_id = p_grupo and public.es_miembro_grupo(p_grupo)
  order by coalesce(s.puntos, 0) desc, coalesce(s.pg, 0) desc, pe.nombre asc;
$$;

-- Cara a cara de quien llama contra cada otro miembro (solo partidos que cuentan).
create or replace function public.cara_a_cara_grupo(p_grupo uuid)
returns table (
  jugador_id uuid, nombre text,
  pj_juntos integer, pg_juntos integer,   -- jugando de la misma pareja
  pj_contra integer, pg_contra integer    -- enfrentados: cuántas ganó quien llama
)
language sql
security definer
stable
set search_path = public
as $$
  select
    o.jugador_id,
    pe.nombre::text,
    (count(*) filter (where o.equipo = m.equipo))::integer,
    (count(*) filter (where o.equipo = m.equipo and rp.ganador = m.equipo))::integer,
    (count(*) filter (where o.equipo <> m.equipo))::integer,
    (count(*) filter (where o.equipo <> m.equipo and rp.ganador = m.equipo))::integer
  from public.partido_jugadores m
  join public._partidos_validos_grupo(p_grupo, 'siempre') v on v.partido_id = m.partido_id
  join public.resultados_partido rp on rp.partido_id = m.partido_id
  join public.partido_jugadores o on o.partido_id = m.partido_id
  join public.perfiles pe on pe.id = o.jugador_id
  where public.es_miembro_grupo(p_grupo)
    and m.jugador_id = auth.uid() and m.equipo is not null
    and o.jugador_id <> auth.uid() and o.equipo is not null
    and o.jugador_id in (select gm.jugador_id from public.grupo_miembros gm where gm.grupo_id = p_grupo)
  group by o.jugador_id, pe.nombre
  order by 1;
$$;

create or replace function public.miembros_grupo(p_grupo uuid)
returns table (jugador_id uuid, nombre text, es_admin boolean, desde timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select gm.jugador_id, pe.nombre::text, (gm.rol = 'admin'), gm.created_at
  from public.grupo_miembros gm
  join public.perfiles pe on pe.id = gm.jugador_id
  where gm.grupo_id = p_grupo and public.es_miembro_grupo(p_grupo)
  order by (gm.rol = 'admin') desc, pe.nombre asc;
$$;

-- ---------------------------------------------------------
-- Permisos: solo usuarios con sesión
-- ---------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'es_miembro_grupo(uuid)', 'es_admin_grupo(uuid)',
    'crear_grupo(text)', 'ver_grupo_por_codigo(text)', 'unirse_a_grupo(text)',
    'invitar_a_grupo(uuid, uuid)', 'responder_invitacion_grupo(uuid, boolean)',
    'salir_del_grupo(uuid)', 'sacar_del_grupo(uuid, uuid)', 'eliminar_grupo(uuid)',
    'mis_invitaciones_grupo()', 'mis_grupos()', 'datos_grupo(uuid)',
    'ranking_grupo(uuid, text)', 'cara_a_cara_grupo(uuid)', 'miembros_grupo(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- Verificación rápida (debería dar 3 tablas y 4 funciones):
-- select count(*) from information_schema.tables where table_name in ('grupos','grupo_miembros','grupo_invitaciones');
-- select count(*) from pg_proc where proname in ('crear_grupo','mis_grupos','ranking_grupo','cara_a_cara_grupo');
