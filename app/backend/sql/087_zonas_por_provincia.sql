-- Zonas por provincia (2026-10-10, pedido del usuario: "en el perfil, cuando
-- seleccionamos determinada provincia, que nos muestre las localidades de la
-- provincia"). El perfil ahora ofrece los departamentos/partidos de cada
-- provincia (CABA: barrios), ver app/frontend/src/lib/zonasPorProvincia.js.
--
-- Hasta ahora todas las zonas eran de Mendoza, así que el armado automático
-- de grupos (Épica 8) comparaba solo la zona. Ahora hay zonas con el mismo
-- nombre en varias provincias ("San Martín", "General Alvear"...), así que
-- también tiene que coincidir la provincia. Mismas funciones que 037 y 046,
-- con ese único agregado.
-- Se corre entero, una vez, en el SQL Editor de Supabase.

create or replace function public.guardar_disponibilidad(p_dia_semana text, p_franja text)
returns void
language plpgsql
security definer
as $$
declare
  v_mi_zona text;
  v_mi_nivel integer;
  v_mi_provincia text;
  v_candidatos uuid[];
  v_grupo_id uuid;
  v_jugador uuid;
begin
  insert into public.disponibilidad_habitual (jugador_id, dia_semana, franja)
  values (auth.uid(), p_dia_semana, p_franja)
  on conflict (jugador_id, dia_semana, franja) do nothing;

  select zona, nivel, provincia into v_mi_zona, v_mi_nivel, v_mi_provincia from public.perfiles where id = auth.uid();

  if exists (
    select 1 from public.grupos_sugeridos_jugadores gsj
    join public.grupos_sugeridos g on g.id = gsj.grupo_id
    where gsj.jugador_id = auth.uid() and g.estado = 'pendiente'
      and g.dia_semana = p_dia_semana and g.franja = p_franja
  ) then
    return;
  end if;

  select array_agg(dh.jugador_id) into v_candidatos
  from public.disponibilidad_habitual dh
  join public.perfiles pe on pe.id = dh.jugador_id
  where dh.dia_semana = p_dia_semana and dh.franja = p_franja
    and dh.jugador_id <> auth.uid()
    and pe.activo = true
    and pe.zona = v_mi_zona
    and pe.provincia = v_mi_provincia
    and abs(pe.nivel - v_mi_nivel) <= 1
    and not exists (
      select 1 from public.grupos_sugeridos_jugadores gsj2
      join public.grupos_sugeridos g2 on g2.id = gsj2.grupo_id
      where gsj2.jugador_id = dh.jugador_id and g2.estado = 'pendiente'
        and g2.dia_semana = p_dia_semana and g2.franja = p_franja
    )
  limit 3;

  if coalesce(array_length(v_candidatos, 1), 0) >= 3 then
    insert into public.grupos_sugeridos (dia_semana, franja) values (p_dia_semana, p_franja)
    returning id into v_grupo_id;

    insert into public.grupos_sugeridos_jugadores (grupo_id, jugador_id) values (v_grupo_id, auth.uid());

    foreach v_jugador in array v_candidatos[1:3] loop
      insert into public.grupos_sugeridos_jugadores (grupo_id, jugador_id) values (v_grupo_id, v_jugador);
      if coalesce((select notificaciones_activas from public.perfiles where id = v_jugador), true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje)
        values (v_jugador, 'sugerencia_grupo', 'Encontramos un grupo compatible para jugar los ' || p_dia_semana || ' de ' || p_franja || '. ¡Confirmá si te sumás!');
      end if;
    end loop;

    if coalesce((select notificaciones_activas from public.perfiles where id = auth.uid()), true) then
      insert into public.notificaciones (jugador_id, tipo, mensaje)
      values (auth.uid(), 'sugerencia_grupo', 'Encontramos un grupo compatible para jugar los ' || p_dia_semana || ' de ' || p_franja || '. ¡Confirmá si te sumás!');
    end if;
  end if;
end;
$$;

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
  v_provincia_ref text;
  v_reemplazo uuid;
begin
  if not p_acepto then
    update public.grupos_sugeridos_jugadores
    set estado = 'rechazado'
    where grupo_id = p_grupo_id and jugador_id = auth.uid();

    select dia_semana, franja into v_dia, v_franja from public.grupos_sugeridos where id = p_grupo_id;

    select pe.zona, pe.nivel, pe.provincia into v_zona_ref, v_nivel_ref, v_provincia_ref
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
      and pe.provincia = v_provincia_ref
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
