-- US-10.1 (extensión, 2026-09-06, a pedido del usuario): si un gasto
-- quedó vinculado a una cuenta real (buscar_jugadores, mismo patrón que
-- US-2.8), se le notifica su saldo neto ("te deben $X" / "debés $X") al
-- guardar los gastos -- no el detalle de a quién le paga cada quién
-- (eso ya se ve en la propia pantalla), solo su saldo personal.
alter table public.notificaciones
  drop constraint if exists notificaciones_tipo_check;

alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in (
    'invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado',
    'lugar_disponible', 'mensaje_nuevo', 'saldo_gastos'
  ));

create or replace function public.guardar_gastos_y_notificar(p_partido_id uuid, p_gastos jsonb)
returns void
language plpgsql
security definer
as $$
declare
  v_organizador uuid;
  v_cancha text;
  v_total numeric := 0;
  v_cantidad integer;
  v_parte numeric;
  v_item jsonb;
  v_jugador_id uuid;
  v_monto numeric;
  v_saldo numeric;
  v_notif_activas boolean;
begin
  select organizador_id, cancha into v_organizador, v_cancha
  from public.partidos where id = p_partido_id;

  if v_organizador is distinct from auth.uid() then
    raise exception 'Solo el organizador puede cargar los gastos.';
  end if;

  update public.partidos set gastos = p_gastos where id = p_partido_id;

  v_cantidad := jsonb_array_length(p_gastos);
  if v_cantidad = 0 then
    return;
  end if;

  select sum((item->>'monto')::numeric) into v_total from jsonb_array_elements(p_gastos) as item;
  v_parte := v_total / v_cantidad;

  for v_item in select * from jsonb_array_elements(p_gastos)
  loop
    v_jugador_id := nullif(v_item->>'jugador_id', '')::uuid;
    v_monto := coalesce((v_item->>'monto')::numeric, 0);
    v_saldo := v_monto - v_parte;

    if v_jugador_id is not null and abs(v_saldo) > 0.01 then
      select coalesce(notificaciones_activas, true) into v_notif_activas
      from public.perfiles where id = v_jugador_id;

      if coalesce(v_notif_activas, true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (
          v_jugador_id,
          'saldo_gastos',
          case
            when v_saldo > 0 then 'Te deben $' || round(v_saldo) || ' de los gastos del partido en ' || v_cancha || '.'
            else 'Debés $' || round(abs(v_saldo)) || ' de los gastos del partido en ' || v_cancha || '.'
          end,
          p_partido_id
        );
      end if;
    end if;
  end loop;
end;
$$;

grant execute on function public.guardar_gastos_y_notificar(uuid, jsonb) to authenticated;
