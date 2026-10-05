-- Cerrar un Marcadorcito que quedó abierto (2026-10-05, pedido del usuario):
-- si una persona arma un partido, te invita y nadie lo termina, quien juega ese
-- partido tiene que poder cerrarlo. Se cierra "sin que cuente": el partido pasa
-- a cancelado (no suma al ranking ni a las estadísticas), igual que "Terminar
-- partido" de quien lleva los puntos. Los demás jugadores reciben el aviso de
-- partido cancelado que ya existía.
--
-- Quién puede: cualquier jugador confirmado del partido o quien lo organiza,
-- pero a quien no lleva los puntos solo le deja si hace más de 30 minutos que
-- nadie suma nada (así no se cierra por error un partido que se está jugando).
-- Correr en el SQL Editor de Supabase, después de 077.

create or replace function public.cerrar_marcador_abandonado(p_partido uuid)
returns void as $$
declare
  v_res record;
begin
  select rp.finalizado, rp.anota_id, rp.updated_at, pa.organizador_id, pa.estado as estado_partido
    into v_res
    from public.resultados_partido rp
    join public.partidos pa on pa.id = rp.partido_id
   where rp.partido_id = p_partido;

  if not found then raise exception 'sin_marcador'; end if;
  -- Ya terminado o cancelado: no hay nada que cerrar.
  if v_res.finalizado or v_res.estado_partido = 'cancelado' then return; end if;

  if v_res.organizador_id is distinct from auth.uid() and not exists (
    select 1 from public.partido_jugadores
     where partido_id = p_partido and jugador_id = auth.uid() and estado = 'confirmado'
  ) then
    raise exception 'no_permitido';
  end if;

  if v_res.anota_id is distinct from auth.uid()
     and v_res.organizador_id is distinct from auth.uid()
     and v_res.updated_at > now() - interval '30 minutes' then
    raise exception 'todavia_en_juego';
  end if;

  update public.partidos set estado = 'cancelado' where id = p_partido;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.cerrar_marcador_abandonado(uuid) to authenticated;

-- El acceso "Volver al partido" del Inicio (075) no tiene que mostrar partidos
-- cancelados.
create or replace function public.mi_marcadorcito_en_juego()
returns uuid as $$
  select rp.partido_id
    from public.resultados_partido rp
    join public.partidos pa on pa.id = rp.partido_id
    join public.partido_jugadores pj on pj.partido_id = rp.partido_id
   where pj.jugador_id = auth.uid() and pj.estado = 'confirmado'
     and rp.finalizado = false
     and pa.estado <> 'cancelado'
     and rp.updated_at > now() - interval '6 hours'
   order by rp.updated_at desc
   limit 1;
$$ language sql stable security definer set search_path = public;
