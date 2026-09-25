-- A pedido del usuario (2026-09-12): el teléfono de un jugador confirmado
-- se mostraba SIEMPRE a los demás participantes del partido, sin que la
-- persona dueña del dato pudiera elegir. Pasa a ser opt-in, por defecto
-- DESACTIVADO (mismo criterio de privacidad ya usado para
-- mostrar_whatsapp en 028_whatsapp_opcional.sql -- el default más
-- privado de los dos posibles).
alter table public.perfiles
  add column if not exists mostrar_telefono boolean not null default false;

grant update (mostrar_telefono) on public.perfiles to authenticated;

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
    case
      when pj.estado = 'confirmado' and pe.mostrar_telefono then pe.telefono
      else null
    end,
    pj.no_show,
    pe.mostrar_whatsapp
  from public.partido_jugadores pj
  join public.perfiles pe on pe.id = pj.jugador_id
  where pj.partido_id = p_partido_id
  order by (pj.estado = 'confirmado') desc, pe.nombre asc;
end;
$$;

grant execute on function public.ver_participantes_partido(uuid) to authenticated;
