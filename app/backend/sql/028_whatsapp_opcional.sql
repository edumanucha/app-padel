-- A pedido del usuario (2026-09-06): el botón de WhatsApp que aparece
-- junto al teléfono de un jugador confirmado (US-2.6) es riesgoso si es
-- automático -- WhatsApp expone foto de perfil, estado, "en línea", etc.
-- a cualquier confirmado de un partido compartido. Pasa a ser opt-in,
-- por defecto DESACTIVADO (el más privado de los dos defaults posibles).
-- El teléfono en sí sigue visible bajo la misma regla de siempre
-- (confirmado = sí, no confirmado = no) -- esto solo gatea el botón.
alter table public.perfiles
  add column if not exists mostrar_whatsapp boolean not null default false;

-- Sumarlo a las columnas editables por el propio jugador (ver BUG-009,
-- 024_fix_bug009_columnas_sensibles_perfiles.sql -- el UPDATE de
-- `perfiles` está restringido por columna, si no se agrega acá el
-- toggle del perfil fallaría con 403).
grant update (mostrar_whatsapp) on public.perfiles to authenticated;

drop function if exists public.ver_participantes_partido(uuid);

create or replace function public.ver_participantes_partido(p_partido_id uuid)
returns table (
  jugador_id uuid,
  nombre text,
  nivel integer,
  mano_habil text,
  posicion text,
  estado text,
  telefono text,
  no_show boolean,
  mostrar_whatsapp boolean
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
    pe.id,
    pe.nombre,
    pe.nivel::integer,
    pe.mano_habil,
    pe.posicion,
    pj.estado,
    case when pj.estado = 'confirmado' then pe.telefono else null end,
    pj.no_show,
    pe.mostrar_whatsapp
  from public.partido_jugadores pj
  join public.perfiles pe on pe.id = pj.jugador_id
  where pj.partido_id = p_partido_id
  order by (pj.estado = 'confirmado') desc, pe.nombre asc;
end;
$$;

grant execute on function public.ver_participantes_partido(uuid) to authenticated;
