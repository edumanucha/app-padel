-- Aviso de Marcadorcito en juego (2026-10-04, pedido del usuario): cuando
-- alguien empieza a llevar el marcador de un partido, los otros jugadores con
-- cuenta reciben una notificación (campana del Inicio) y, mientras el partido
-- sigue en juego, ven un acceso para mirarlo en el Inicio.
-- Correr en el SQL Editor de Supabase, después de 074.

-- Tipo nuevo de notificación (se mantienen los que ya existían).
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in (
    'invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado', 'lugar_disponible',
    'mensaje_nuevo', 'saldo_gastos', 'sugerencia_grupo', 'dupla_vinculada',
    'partido_cargado', 'resultado_corregido', 'no_jugo',
    'marcadorcito_nuevo'
  ));

-- Lo llama quien lleva el marcador, al empezar. Avisa a los demás jugadores
-- confirmados con cuenta (una sola vez por partido).
create or replace function public.avisar_marcadorcito_nuevo(p_partido uuid)
returns void as $$
declare
  v_nombre text;
  v_otro record;
begin
  if not exists (
    select 1 from public.resultados_partido
     where partido_id = p_partido and anota_id = auth.uid() and finalizado = false
  ) then
    raise exception 'no_permitido';
  end if;

  select nombre into v_nombre from public.perfiles where id = auth.uid();

  for v_otro in
    select pj.jugador_id
      from public.partido_jugadores pj join public.perfiles pe on pe.id = pj.jugador_id
     where pj.partido_id = p_partido and pj.estado = 'confirmado'
       and pj.jugador_id is not null and pj.jugador_id <> auth.uid()
       and coalesce(pe.notificaciones_activas, true)
       and not exists (
         select 1 from public.notificaciones n
          where n.jugador_id = pj.jugador_id and n.partido_id = p_partido and n.tipo = 'marcadorcito_nuevo'
       )
  loop
    insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
    values (
      v_otro.jugador_id, 'marcadorcito_nuevo',
      coalesce(v_nombre, 'Alguien') || ' empezó a llevar el marcador de tu partido. Tocá para mirarlo en vivo.',
      p_partido);
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.avisar_marcadorcito_nuevo(uuid) to authenticated;

-- El Marcadorcito en juego más reciente de un partido donde estoy confirmado
-- (sin terminar y con movimiento en las últimas 6 horas), para mostrar el
-- acceso en el Inicio aunque lo lleve otra persona.
create or replace function public.mi_marcadorcito_en_juego()
returns uuid as $$
  select rp.partido_id
    from public.resultados_partido rp
    join public.partido_jugadores pj on pj.partido_id = rp.partido_id
   where pj.jugador_id = auth.uid() and pj.estado = 'confirmado'
     and rp.finalizado = false
     and rp.updated_at > now() - interval '6 hours'
   order by rp.updated_at desc
   limit 1;
$$ language sql stable security definer set search_path = public;

grant execute on function public.mi_marcadorcito_en_juego() to authenticated;
