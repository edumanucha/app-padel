-- BUG-019 (crítico, mismo patrón que BUG-009): la política "Organizador
-- marca no-show" (026_epica6_gestion_avanzada_partidos.sql) es correcta a
-- nivel de FILA (organizador de ese partido), pero partido_jugadores nunca
-- tuvo el GRANT de UPDATE restringido por columna (a diferencia de
-- perfiles, ver 024_fix_bug009_...). Combinadas, el organizador podía
-- reescribir el `estado` (o cualquier otra columna) de CUALQUIER otro
-- jugador de su partido con un PATCH directo -- no solo `no_show` -- lo
-- que rompe por completo el flujo de confirmación de asistencia (US-2.4):
-- un organizador podía "confirmar" o "rechazar" gente sin su consentimiento.
--
-- Corrección: se saca la política amplia y se reemplaza por una función
-- SECURITY DEFINER que solo toca la columna no_show, y además valida en
-- el backend las mismas condiciones que ya exigía el frontend (partido
-- jugado, jugador confirmado) -- cerrando también ese gap.
drop policy if exists "Organizador marca no-show" on public.partido_jugadores;

create or replace function public.marcar_no_show(p_partido_id uuid, p_jugador_id uuid, p_no_show boolean)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from public.partidos
    where id = p_partido_id and organizador_id = auth.uid() and estado = 'jugado'
  ) then
    raise exception 'No autorizado o el partido todavía no se jugó.';
  end if;

  update public.partido_jugadores
  set no_show = p_no_show
  where partido_id = p_partido_id
    and jugador_id = p_jugador_id
    and estado = 'confirmado'
    and jugador_id <> auth.uid();
end;
$$;

grant execute on function public.marcar_no_show(uuid, uuid, boolean) to authenticated;
