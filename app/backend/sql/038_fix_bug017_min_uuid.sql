-- BUG-017: responder_sugerencia_grupo usaba min(jugador_id) para elegir
-- organizador, pero Postgres no tiene la función min() para el tipo uuid
-- ("function min(uuid) does not exist"). Se reemplaza por order by + limit 1,
-- que da el mismo resultado determinístico (el id "más chico").
create or replace function public.responder_sugerencia_grupo(p_grupo_id uuid, p_acepto boolean)
returns void
language plpgsql
security definer
as $$
declare
  v_total integer;
  v_aceptados integer;
  v_dia text;
  v_franja text;
  v_partido_id uuid;
  v_jugador uuid;
  v_primero uuid;
begin
  update public.grupos_sugeridos_jugadores
  set estado = case when p_acepto then 'aceptado' else 'rechazado' end
  where grupo_id = p_grupo_id and jugador_id = auth.uid();

  if not p_acepto then
    update public.grupos_sugeridos set estado = 'roto' where id = p_grupo_id;
    return;
  end if;

  select count(*), count(*) filter (where estado = 'aceptado')
  into v_total, v_aceptados
  from public.grupos_sugeridos_jugadores where grupo_id = p_grupo_id;

  if v_total = v_aceptados then
    select dia_semana, franja into v_dia, v_franja from public.grupos_sugeridos where id = p_grupo_id;
    select jugador_id into v_primero
    from public.grupos_sugeridos_jugadores
    where grupo_id = p_grupo_id
    order by jugador_id
    limit 1;

    insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado)
    values (v_primero, now() + interval '7 days', 'A coordinar (grupo de ' || v_dia || ' ' || v_franja || ')', 4, 'abierto')
    returning id into v_partido_id;

    for v_jugador in
      select jugador_id from public.grupos_sugeridos_jugadores
      where grupo_id = p_grupo_id and jugador_id <> v_primero
    loop
      insert into public.partido_jugadores (partido_id, jugador_id, estado) values (v_partido_id, v_jugador, 'confirmado');
      if coalesce((select notificaciones_activas from public.perfiles where id = v_jugador), true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (v_jugador, 'sugerencia_grupo', '¡Se armó tu partido de matchmaking! Coordinen la cancha entre todos.', v_partido_id);
      end if;
    end loop;

    if coalesce((select notificaciones_activas from public.perfiles where id = v_primero), true) then
      insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
      values (v_primero, 'sugerencia_grupo', '¡Se armó tu partido de matchmaking! Quedaste como organizador, coordinen la cancha entre todos.', v_partido_id);
    end if;

    update public.grupos_sugeridos set estado = 'concretado', partido_id = v_partido_id where id = p_grupo_id;
  end if;
end;
$$;
