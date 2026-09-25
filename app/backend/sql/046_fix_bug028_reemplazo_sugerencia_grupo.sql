-- BUG-028: cuando alguien rechazaba una sugerencia de grupo (US-8.1), el
-- sistema rompía TODO el grupo (estado='roto') en vez de "seguir buscando
-- un reemplazo compatible", como pide el criterio de aceptación explícito
-- de la historia. Probado en vivo con 4 cuentas frescas: 3 ya habían
-- confirmado, y al rechazar la 4ta las otras 3 perdían la sugerencia sin
-- aviso ni reemplazo.
--
-- Decisión del usuario (2026-09-07, resolviendo la pregunta abierta de la
-- historia): al rechazar, buscar UN solo reemplazo compatible (mismo
-- día/franja/zona/nivel que ya usa el grupo) -- sin mandarle la sugerencia
-- a más de un candidato nuevo a la vez. Si se encuentra reemplazo, los que
-- ya habían confirmado vuelven a "pendiente" (tienen que reconfirmar con
-- la nueva formación) y se notifica solo al candidato nuevo + a quienes
-- deben reconfirmar. Si no se encuentra reemplazo todavía, el lugar queda
-- abierto (el grupo sigue "pendiente", ya no se rompe) -- pero no se
-- extiende acá `guardar_disponibilidad` para que una futura declaración
-- ocupe ese lugar abierto automáticamente; queda como límite conocido a
-- resolver más adelante si hace falta.
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
  v_zona_ref text;
  v_nivel_ref integer;
  v_reemplazo uuid;
begin
  if not p_acepto then
    update public.grupos_sugeridos_jugadores
    set estado = 'rechazado'
    where grupo_id = p_grupo_id and jugador_id = auth.uid();

    select dia_semana, franja into v_dia, v_franja from public.grupos_sugeridos where id = p_grupo_id;

    select pe.zona, pe.nivel into v_zona_ref, v_nivel_ref
    from public.grupos_sugeridos_jugadores gsj
    join public.perfiles pe on pe.id = gsj.jugador_id
    where gsj.grupo_id = p_grupo_id and gsj.jugador_id <> auth.uid()
    limit 1;

    select dh.jugador_id into v_reemplazo
    from public.disponibilidad_habitual dh
    join public.perfiles pe on pe.id = dh.jugador_id
    where dh.dia_semana = v_dia and dh.franja = v_franja
      and pe.activo = true
      and pe.zona = v_zona_ref
      and abs(pe.nivel - v_nivel_ref) <= 1
      and dh.jugador_id <> auth.uid()
      and not exists (
        select 1 from public.grupos_sugeridos_jugadores
        where grupo_id = p_grupo_id and jugador_id = dh.jugador_id
      )
      and not exists (
        select 1 from public.grupos_sugeridos_jugadores gsj2
        join public.grupos_sugeridos g2 on g2.id = gsj2.grupo_id
        where gsj2.jugador_id = dh.jugador_id and g2.estado = 'pendiente'
          and g2.dia_semana = v_dia and g2.franja = v_franja
      )
    limit 1;

    if v_reemplazo is not null then
      delete from public.grupos_sugeridos_jugadores where grupo_id = p_grupo_id and jugador_id = auth.uid();
      insert into public.grupos_sugeridos_jugadores (grupo_id, jugador_id, estado) values (p_grupo_id, v_reemplazo, 'pendiente');
      update public.grupos_sugeridos_jugadores set estado = 'pendiente' where grupo_id = p_grupo_id and jugador_id <> v_reemplazo;

      if coalesce((select notificaciones_activas from public.perfiles where id = v_reemplazo), true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje)
        values (v_reemplazo, 'sugerencia_grupo', 'Encontramos un grupo compatible para jugar los ' || v_dia || ' de ' || v_franja || '. ¡Confirmá si te sumás!');
      end if;

      for v_jugador in
        select jugador_id from public.grupos_sugeridos_jugadores
        where grupo_id = p_grupo_id and jugador_id <> v_reemplazo
      loop
        if coalesce((select notificaciones_activas from public.perfiles where id = v_jugador), true) then
          insert into public.notificaciones (jugador_id, tipo, mensaje)
          values (v_jugador, 'sugerencia_grupo', 'Uno de los jugadores del grupo no pudo sumarse, pero encontramos un reemplazo. Confirmá de nuevo con la nueva formación.');
        end if;
      end loop;
    end if;
    -- Si no hay reemplazo todavía, no se hace nada más: el grupo sigue
    -- "pendiente" con el lugar del rechazo abierto, ya no se rompe.

    return;
  end if;

  update public.grupos_sugeridos_jugadores
  set estado = 'aceptado'
  where grupo_id = p_grupo_id and jugador_id = auth.uid();

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
