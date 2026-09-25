-- Épica 2: US-2.5 (ver/cancelar estado del partido) y US-2.6 (privacidad
-- del teléfono según confirmación). Correr en el SQL Editor de Supabase.

-- US-2.5: la política "Organizador cancela su partido" y la función
-- marcar_partidos_jugados() ya existían desde 002_partidos.sql (nadie las
-- usaba todavía desde el frontend) -- no hace falta SQL nuevo para esta
-- historia, solo construir la UI que las use.

-- =========================================================
-- US-2.6: ver participantes de un partido, con teléfono visible SOLO para
-- los que confirmaron asistencia (nunca para anotados/invitados/rechazados)
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
  -- Mismo criterio de autorización que ya protege el SELECT de
  -- partido_jugadores: solo puede ver el plantel quien participa del
  -- partido o es su organizador.
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
    case when pj.estado = 'confirmado' then pe.telefono else null end
  from public.partido_jugadores pj
  join public.perfiles pe on pe.id = pj.jugador_id
  where pj.partido_id = p_partido_id
  order by (pj.estado = 'confirmado') desc, pe.nombre asc;
end;
$$;

grant execute on function public.ver_participantes_partido(uuid) to authenticated;
