-- Épica 5: US-5.3 (Pantalla principal / Home) -- un solo RPC que agrega
-- todo lo que necesita el resumen personalizado (próximo partido,
-- invitaciones pendientes, último partido jugado, racha, posición en el
-- ranking, estadística rápida) en una sola llamada, en vez de que el
-- frontend arme varias consultas + joins complejos por su cuenta.
create or replace function public.resumen_home()
returns jsonb
language plpgsql
security definer
stable
as $$
declare
  v_user uuid := auth.uid();
  v_proximo jsonb;
  v_invitaciones integer;
  v_ultimo jsonb;
  v_racha integer := 0;
  v_streak_roto boolean := false;
  v_posicion integer;
  v_total integer;
  v_jugados integer := 0;
  v_ganados integer := 0;
  r record;
begin
  select jsonb_build_object('partido_id', pa.id, 'fecha_hora', pa.fecha_hora, 'cancha', pa.cancha)
  into v_proximo
  from public.partido_jugadores pj
  join public.partidos pa on pa.id = pj.partido_id
  where pj.jugador_id = v_user
    and pj.estado in ('anotado', 'confirmado')
    and pa.estado <> 'cancelado'
    and pa.fecha_hora > now()
  order by pa.fecha_hora asc
  limit 1;

  select count(*) into v_invitaciones
  from public.partido_jugadores
  where jugador_id = v_user and estado = 'invitado';

  for r in
    select rp.partido_id, rp.estado, rp.ganador, pj.equipo as mi_equipo
    from public.resultados_partido rp
    join public.partido_jugadores pj on pj.partido_id = rp.partido_id and pj.jugador_id = v_user
    where rp.finalizado = true
    order by rp.updated_at desc
    limit 20
  loop
    v_jugados := v_jugados + 1;

    if r.ganador = r.mi_equipo then
      v_ganados := v_ganados + 1;
      if not v_streak_roto then
        v_racha := v_racha + 1;
      end if;
    else
      v_streak_roto := true;
    end if;

    if v_ultimo is null then
      v_ultimo := jsonb_build_object(
        'partido_id', r.partido_id,
        'gano', r.ganador = r.mi_equipo,
        'sets_a', r.estado -> 'setsA',
        'sets_b', r.estado -> 'setsB',
        'rival_nombres', (
          select string_agg(coalesce(pe.nombre, pj2.invitado_nombre), ' / ')
          from public.partido_jugadores pj2
          left join public.perfiles pe on pe.id = pj2.jugador_id
          where pj2.partido_id = r.partido_id and pj2.equipo <> r.mi_equipo
        )
      );
    end if;
  end loop;

  select count(*) + 1 into v_posicion
  from public.perfiles
  where activo = true
    and puntos_ranking > (select puntos_ranking from public.perfiles where id = v_user);

  select count(*) into v_total from public.perfiles where activo = true;

  return jsonb_build_object(
    'proximo_partido', v_proximo,
    'invitaciones_pendientes', v_invitaciones,
    'ultimo_partido', v_ultimo,
    'racha_actual', v_racha,
    'posicion_ranking', v_posicion,
    'total_jugadores', v_total,
    'partidos_jugados', v_jugados,
    'porcentaje_victorias', case when v_jugados > 0 then round(100.0 * v_ganados / v_jugados) else 0 end
  );
end;
$$;

grant execute on function public.resumen_home() to authenticated;
