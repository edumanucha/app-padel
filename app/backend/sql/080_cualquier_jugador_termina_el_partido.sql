-- Cualquier jugador puede terminar el partido (2026-10-05, pedido del usuario):
-- si se terminó antes y nadie cerró el marcador, cualquiera de los jugadores
-- confirmados (o quien lo organiza) puede terminarlo, sin esperar. Queda
-- cancelado: no cuenta para el ranking ni las estadísticas. Reemplaza la
-- versión del SQL 078, que pedía 30 minutos sin movimiento.
-- Correr en el SQL Editor de Supabase, después de 079.

create or replace function public.cerrar_marcador_abandonado(p_partido uuid)
returns void as $$
declare
  v_res record;
begin
  select rp.finalizado, pa.organizador_id, pa.estado as estado_partido
    into v_res
    from public.resultados_partido rp
    join public.partidos pa on pa.id = rp.partido_id
   where rp.partido_id = p_partido;

  if not found then raise exception 'sin_marcador'; end if;
  if v_res.finalizado or v_res.estado_partido = 'cancelado' then return; end if;

  if v_res.organizador_id is distinct from auth.uid() and not exists (
    select 1 from public.partido_jugadores
     where partido_id = p_partido and jugador_id = auth.uid() and estado = 'confirmado'
  ) then
    raise exception 'no_permitido';
  end if;

  update public.partidos set estado = 'cancelado' where id = p_partido;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.cerrar_marcador_abandonado(uuid) to authenticated;
