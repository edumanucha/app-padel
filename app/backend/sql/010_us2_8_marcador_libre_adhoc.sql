-- Épica 2: US-2.8 (registrar un partido jugado fuera de la app / modo
-- ad-hoc). Correr en el SQL Editor de Supabase, después de 009.
--
-- Nota técnica (ya anticipada en historias-usuario-mvp.md): un partido
-- ad-hoc se juega en el momento, no se agenda a futuro -- choca con el
-- trigger de BUG-005 (003_partidos_validaciones.sql) que rechaza cualquier
-- fecha_hora no futura. Se resuelve con una columna `es_adhoc` que el
-- trigger respeta. Además, hasta 3 de los 4 jugadores pueden ser
-- invitados libres sin cuenta -- se resuelve con `jugador_id` nullable +
-- `invitado_nombre`.

-- =========================================================
-- Columna es_adhoc en partidos
-- =========================================================
alter table public.partidos
  add column es_adhoc boolean not null default false;

-- El trigger de fecha futura (BUG-005) ya existía -- se reemplaza para
-- exceptuar a los partidos ad-hoc, que se juegan ahora mismo.
create or replace function public.validar_fecha_futura_partido()
returns trigger as $$
begin
  if new.es_adhoc = false and new.fecha_hora <= now() then
    raise exception 'La fecha y hora del partido tienen que ser a futuro.';
  end if;
  return new;
end;
$$ language plpgsql;

-- =========================================================
-- Invitados libres sin cuenta en partido_jugadores
-- =========================================================
alter table public.partido_jugadores
  alter column jugador_id drop not null;

alter table public.partido_jugadores
  add column invitado_nombre text;

alter table public.partido_jugadores
  add constraint partido_jugadores_jugador_o_invitado_check
  check (jugador_id is not null or invitado_nombre is not null);

-- El UNIQUE(partido_id, jugador_id) original no molesta a los invitados
-- libres (jugador_id null no choca con la unicidad en Postgres -- NULL
-- nunca es igual a NULL a los efectos de UNIQUE).

-- El organizador de un partido ad-hoc arma su propio plantel completo de
-- una sola vez (self + hasta 3 más, cada uno con cuenta real o como
-- invitado libre), todos ya "confirmado" -- no hay flujo de invitación
-- previo, el partido arranca ya mismo.
create policy "Organizador arma su partido ad-hoc" on public.partido_jugadores
  for insert to authenticated
  with check (
    estado = 'confirmado'
    and exists (
      select 1 from public.partidos pa
      where pa.id = partido_id and pa.organizador_id = auth.uid() and pa.es_adhoc = true
    )
  );

-- =========================================================
-- Buscador general de jugadores (sin partido todavía, para armar el
-- plantel del marcador libre) -- distinto de buscar_jugadores_para_invitar
-- (US-2.3), que excluye a quienes ya participan de un partido puntual.
-- =========================================================
create or replace function public.buscar_jugadores(p_termino text)
returns table (id uuid, nombre text)
language plpgsql
security definer
stable
as $$
begin
  return query
  select pe.id, pe.nombre
  from public.perfiles pe
  where pe.activo = true
    and pe.id <> auth.uid()
    and pe.nombre ilike '%' || p_termino || '%'
  order by pe.nombre asc
  limit 10;
end;
$$;

grant execute on function public.buscar_jugadores(text) to authenticated;

-- =========================================================
-- ver_participantes_partido (US-2.6): se actualiza para incluir a los
-- invitados libres (jugador_id null), que antes quedaban afuera del JOIN.
-- =========================================================
create or replace function public.ver_participantes_partido(p_partido_id uuid)
returns table (
  jugador_id uuid,
  nombre text,
  nivel integer,
  mano_habil text,
  posicion text,
  estado text,
  telefono text
)
language plpgsql
security definer
stable
as $$
begin
  if not exists (
    select 1 from public.partido_jugadores pj
    where pj.partido_id = p_partido_id and pj.jugador_id = auth.uid()
  ) and not exists (
    select 1 from public.partidos pa
    where pa.id = p_partido_id and pa.organizador_id = auth.uid()
  ) then
    return;
  end if;

  return query
  select
    pj.jugador_id,
    coalesce(pe.nombre, pj.invitado_nombre) as nombre,
    pe.nivel,
    pe.mano_habil,
    pe.posicion,
    pj.estado,
    case when pj.estado = 'confirmado' then pe.telefono else null end
  from public.partido_jugadores pj
  left join public.perfiles pe on pe.id = pj.jugador_id
  where pj.partido_id = p_partido_id
  order by (pj.estado = 'confirmado') desc, nombre asc;
end;
$$;
