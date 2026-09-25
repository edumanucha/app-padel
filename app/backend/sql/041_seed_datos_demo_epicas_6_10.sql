-- Seed de datos demo para las tablas nuevas de las Épicas 6-10, que
-- 018_historial_demo_y_stats_directorio.sql no cubre (esa solo sembró
-- partidos/resultados). A pedido del usuario (2026-09-06): que con los
-- mocks alcance para recrear un estado de demo razonable si hace falta
-- reconstruir la base de cero -- ver `schema-completo.sql`.
--
-- Reutiliza las cuentas demo ya creadas por
-- app/frontend/scripts/seed-jugadores-demo.js (nombre ilike '%(demo %') y
-- el historial de 018 -- no crea cuentas nuevas. Idempotente: si se corre
-- de nuevo, borra lo que él mismo sembró antes de reinsertar.
do $$
declare
  v_jugador_a uuid; v_jugador_b uuid; v_jugador_c uuid; v_jugador_d uuid;
  v_partido_con_cancha_real uuid;
  v_cancha_id uuid;
  v_organizador_partido uuid;
begin
  if (select count(*) from public.perfiles where nombre ilike '%(demo %' and activo = true) < 4 then
    raise notice 'No hay suficientes jugadores demo, se aborta.';
    return;
  end if;

  -- Limpieza de una corrida anterior de este mismo script (no toca datos
  -- reales de cuentas no-demo).
  delete from public.resenas_canchas where jugador_id in (select id from public.perfiles where nombre ilike '%(demo %');
  delete from public.mensajes where remitente_id in (select id from public.perfiles where nombre ilike '%(demo %');
  delete from public.duplas where jugador_a in (select id from public.perfiles where nombre ilike '%(demo %');
  delete from public.intereses_dupla where de_jugador_id in (select id from public.perfiles where nombre ilike '%(demo %');
  delete from public.disponibilidad_habitual where jugador_id in (select id from public.perfiles where nombre ilike '%(demo %');

  -- 1) Reseña de cancha (US-9.1): busca un partido demo ya jugado cuya
  -- cancha coincida con una real del Directorio (mismo criterio heurístico
  -- de siempre, por nombre) y deja una reseña de su organizador.
  select pa.id, c.id, pa.organizador_id
    into v_partido_con_cancha_real, v_cancha_id, v_organizador_partido
  from public.partidos pa
  join public.canchas c on c.nombre = pa.cancha
  join public.resultados_partido rp on rp.partido_id = pa.id and rp.finalizado = true
  where pa.organizador_id in (select id from public.perfiles where nombre ilike '%(demo %')
  order by random()
  limit 1;

  if v_cancha_id is not null then
    insert into public.resenas_canchas (cancha_id, jugador_id, puntuacion, comentario)
    values (v_cancha_id, v_organizador_partido, 4, 'Cancha en buen estado, fácil de coordinar. (reseña demo)')
    on conflict (cancha_id, jugador_id) do nothing;
  else
    raise notice 'No se encontró un partido demo con cancha real coincidente, se salteó la reseña.';
  end if;

  -- 2) Gastos del partido (US-10.1): carga un desglose tipo Splitwise en
  -- un partido demo jugado, con un jugador con cuenta real (para que se
  -- vea el saldo calculado) y uno "a mano" (sin cuenta).
  select id into v_organizador_partido
  from public.partidos
  where organizador_id in (select id from public.perfiles where nombre ilike '%(demo %') and estado = 'jugado'
  order by random() limit 1;

  if v_organizador_partido is not null then
    select organizador_id into v_jugador_a from public.partidos where id = v_organizador_partido;
    select jugador_id into v_jugador_b from public.partido_jugadores
      where partido_id = v_organizador_partido and jugador_id <> v_jugador_a limit 1;

    update public.partidos
    set gastos = jsonb_build_array(
      jsonb_build_object('nombre', (select nombre from public.perfiles where id = v_jugador_a), 'monto', 6000, 'jugador_id', v_jugador_a),
      jsonb_build_object('nombre', coalesce((select nombre from public.perfiles where id = v_jugador_b), 'Invitado sin cuenta'), 'monto', 0, 'jugador_id', v_jugador_b),
      jsonb_build_object('nombre', 'Invitado de la cancha', 'monto', 0, 'jugador_id', null)
    )
    where id = v_organizador_partido;
  end if;

  -- 3) Mensajería (US-7.4): una conversación corta entre 2 demo.
  select id into v_jugador_a from public.perfiles where nombre ilike '%(demo %' order by random() limit 1;
  select id into v_jugador_b from public.perfiles where nombre ilike '%(demo %' and id <> v_jugador_a order by random() limit 1;

  insert into public.mensajes (remitente_id, destinatario_id, contenido, leido)
  values
    (v_jugador_a, v_jugador_b, '¿Jugamos el sábado a las 18? (mensaje demo)', true),
    (v_jugador_b, v_jugador_a, 'Dale, te confirmo la cancha. (mensaje demo)', false);

  -- 4) Disponibilidad + dupla vinculada (Épica 8): 2 demo con posición
  -- complementaria, disponibilidad igual y match mutuo ya concretado.
  select id into v_jugador_c from public.perfiles where nombre ilike '%(demo %' and posicion = 'drive' order by random() limit 1;
  select id into v_jugador_d from public.perfiles where nombre ilike '%(demo %' and posicion = 'reves' and id <> v_jugador_c order by random() limit 1;

  if v_jugador_c is not null and v_jugador_d is not null then
    insert into public.disponibilidad_habitual (jugador_id, dia_semana, franja) values
      (v_jugador_c, 'sabado', 'tarde'), (v_jugador_d, 'sabado', 'tarde')
    on conflict do nothing;

    update public.perfiles set busca_companero = true where id in (v_jugador_c, v_jugador_d);

    insert into public.intereses_dupla (de_jugador_id, a_jugador_id) values
      (v_jugador_c, v_jugador_d), (v_jugador_d, v_jugador_c)
    on conflict do nothing;

    insert into public.duplas (jugador_a, jugador_b)
    select v_jugador_c, v_jugador_d
    where not exists (
      select 1 from public.duplas
      where (jugador_a = v_jugador_c and jugador_b = v_jugador_d)
         or (jugador_a = v_jugador_d and jugador_b = v_jugador_c)
    );
  else
    raise notice 'No se encontró un par demo drive/revés para dupla, se salteó.';
  end if;

  raise notice 'Seed de Épicas 6-10 completado.';
end $$;
