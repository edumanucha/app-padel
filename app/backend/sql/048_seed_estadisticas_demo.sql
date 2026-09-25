-- Seed de estadisticas_partido con partidos simulados punto por punto
-- (motor de puntaje validado, no numeros al azar sueltos) para jugadores demo
-- reales de la base (sacados con un SELECT por el usuario, 2026-09-10).
-- Correr DESPUES de crear la tabla estadisticas_partido (ver migración aparte).

do $$
declare
  v_partido_id uuid;
begin
  -- Partido 1: Eduardo (vos) y Agustín Gómez (demo 4) (A) vs Florencia Rodríguez (demo 13) y Franco Díaz (demo 8) (B), cancha Club Sur
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '58 days', 'Club Sur', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, 'c1a4fb63-0c09-451c-b799-839e9a6c5727', 'A', 'confirmado'),
    (v_partido_id, '4309ba5d-3d8d-4157-b840-87789085cd8c', 'B', 'confirmado'),
    (v_partido_id, '36be6ea5-2b08-49ec-a0fe-c8f515613477', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(2), 'setsB', jsonb_build_array(3),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'B',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'B');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 1514976, 'B',
    20, 23,
    0, 2, 0, 1,
    2, 5, 3, 6,
    3, 3, 3
  );

  -- Partido 2: Eduardo (vos) y Bruno Herrera (demo 5) (A) vs Franco Pérez (demo 28) y Franco Díaz (demo 8) (B), cancha Polideportivo Este
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '53 days', 'Polideportivo Este', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, '06cfbc6d-6635-4956-a7dd-fa8cdabc0cd7', 'A', 'confirmado'),
    (v_partido_id, '1583779c-f8c8-4be7-9fd7-219b6e18cd00', 'B', 'confirmado'),
    (v_partido_id, '36be6ea5-2b08-49ec-a0fe-c8f515613477', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(3), 'setsB', jsonb_build_array(0),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'A');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 851850, 'A',
    12, 4,
    1, 1, 0, 0,
    2, 3, 0, 0,
    6, 2, 0
  );

  -- Partido 3: Eduardo (vos) y Agostina Ruiz (demo 15) (A) vs Franco Pérez (demo 28) y Candela Pérez (demo 16) (B), cancha Deportivo San Martín
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '49 days', 'Deportivo San Martín', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, 'bea28930-b366-440c-b2b2-10015763fe62', 'A', 'confirmado'),
    (v_partido_id, '1583779c-f8c8-4be7-9fd7-219b6e18cd00', 'B', 'confirmado'),
    (v_partido_id, '64a026e6-c64c-48bf-aa07-7e6e1b8d4320', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(3), 'setsB', jsonb_build_array(0),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'B',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'A');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 666058, 'B',
    12, 6,
    2, 3, 0, 0,
    1, 1, 0, 0,
    3, 1, 0
  );

  -- Partido 4: Eduardo (vos) y Franco Díaz (demo 8) (A) vs Agostina Ruiz (demo 15) y Agostina Ramírez (demo 33) (B), cancha Padel Pigüé
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '45 days', 'Padel Pigüé', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, '36be6ea5-2b08-49ec-a0fe-c8f515613477', 'A', 'confirmado'),
    (v_partido_id, 'bea28930-b366-440c-b2b2-10015763fe62', 'B', 'confirmado'),
    (v_partido_id, 'b30f7cd4-a4b1-4e40-ab98-84ba713a7938', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(3), 'setsB', jsonb_build_array(1),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'A');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 1312276, 'A',
    16, 11,
    1, 1, 0, 0,
    2, 2, 1, 3,
    4, 2, 2
  );

  -- Partido 5: Eduardo (vos) y Ignacio López (demo 19) (A) vs Benjamín Benítez (demo 20) y Florencia Álvarez (demo 29) (B), cancha Club Sur
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '42 days', 'Club Sur', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, 'bb980395-448e-4960-b859-c94a9bf3b2ba', 'A', 'confirmado'),
    (v_partido_id, 'c431455f-c3f7-43b1-9abf-05202575b0f4', 'B', 'confirmado'),
    (v_partido_id, '614b9711-1203-4f6f-aa68-c799357b38cc', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(2), 'setsB', jsonb_build_array(3),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'B');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 1515904, 'A',
    15, 15,
    1, 1, 2, 6,
    1, 1, 1, 1,
    4, 3, 1
  );

  -- Partido 6: Eduardo (vos) y Florencia Álvarez (demo 29) (A) vs Bruno Herrera (demo 5) y Florencia Rodríguez (demo 13) (B), cancha Club Sur
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '37 days', 'Club Sur', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, '614b9711-1203-4f6f-aa68-c799357b38cc', 'A', 'confirmado'),
    (v_partido_id, '06cfbc6d-6635-4956-a7dd-fa8cdabc0cd7', 'B', 'confirmado'),
    (v_partido_id, '4309ba5d-3d8d-4157-b840-87789085cd8c', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(3), 'setsB', jsonb_build_array(1),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'A');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 762197, 'A',
    14, 8,
    1, 1, 0, 1,
    2, 2, 1, 1,
    4, 4, 1
  );

  -- Partido 7: Eduardo (vos) y Florencia Álvarez (demo 29) (A) vs Candela Pérez (demo 16) y Franco Díaz (demo 8) (B), cancha Club Norte
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '33 days', 'Club Norte', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, '614b9711-1203-4f6f-aa68-c799357b38cc', 'A', 'confirmado'),
    (v_partido_id, '64a026e6-c64c-48bf-aa07-7e6e1b8d4320', 'B', 'confirmado'),
    (v_partido_id, '36be6ea5-2b08-49ec-a0fe-c8f515613477', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(0), 'setsB', jsonb_build_array(3),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'B',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'B');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 716484, 'B',
    3, 12,
    0, 0, 1, 1,
    0, 0, 2, 2,
    1, 6, 0
  );

  -- Partido 8: Eduardo (vos) y Ignacio López (demo 19) (A) vs Franco Díaz (demo 8) y Candela Pérez (demo 16) (B), cancha Polideportivo Este
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '30 days', 'Polideportivo Este', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, 'bb980395-448e-4960-b859-c94a9bf3b2ba', 'A', 'confirmado'),
    (v_partido_id, '36be6ea5-2b08-49ec-a0fe-c8f515613477', 'B', 'confirmado'),
    (v_partido_id, '64a026e6-c64c-48bf-aa07-7e6e1b8d4320', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(3), 'setsB', jsonb_build_array(2),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'B',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'A');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 1642387, 'B',
    20, 16,
    2, 2, 1, 3,
    1, 2, 1, 3,
    6, 2, 2
  );

  -- Partido 9: Eduardo (vos) y Emiliano Sánchez (demo 25) (A) vs Bruno Herrera (demo 5) y Cristian Flores (demo 30) (B), cancha Polideportivo Este
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '26 days', 'Polideportivo Este', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, 'f9d666ae-fefb-4f94-a483-1fc5008592f9', 'A', 'confirmado'),
    (v_partido_id, '06cfbc6d-6635-4956-a7dd-fa8cdabc0cd7', 'B', 'confirmado'),
    (v_partido_id, 'aaa145c0-36cd-4213-917d-f2d5ceabb89a', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(3), 'setsB', jsonb_build_array(2),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'B',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'A');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 1562796, 'B',
    17, 16,
    2, 4, 1, 2,
    1, 4, 1, 1,
    5, 6, 2
  );

  -- Partido 10: Eduardo (vos) y Cristian Flores (demo 30) (A) vs Agostina Ruiz (demo 15) y Benjamín Benítez (demo 20) (B), cancha Club Norte
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '20 days', 'Club Norte', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, 'aaa145c0-36cd-4213-917d-f2d5ceabb89a', 'A', 'confirmado'),
    (v_partido_id, 'bea28930-b366-440c-b2b2-10015763fe62', 'B', 'confirmado'),
    (v_partido_id, 'c431455f-c3f7-43b1-9abf-05202575b0f4', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(3), 'setsB', jsonb_build_array(2),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'A');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 1004163, 'A',
    13, 13,
    1, 1, 1, 1,
    2, 4, 1, 1,
    7, 8, 1
  );

  -- Partido 11: Eduardo (vos) y Emiliano Sánchez (demo 25) (A) vs Agostina Romero (demo 3) y Franco Pérez (demo 28) (B), cancha Deportivo San Martín
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '18 days', 'Deportivo San Martín', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, 'f9d666ae-fefb-4f94-a483-1fc5008592f9', 'A', 'confirmado'),
    (v_partido_id, '431d415e-fd8b-4596-bdad-5142428c15f3', 'B', 'confirmado'),
    (v_partido_id, '1583779c-f8c8-4be7-9fd7-219b6e18cd00', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(0), 'setsB', jsonb_build_array(3),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'B');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 675442, 'A',
    3, 12,
    0, 0, 2, 3,
    0, 0, 1, 1,
    1, 10, 0
  );

  -- Partido 12: Eduardo (vos) y Florencia Rodríguez (demo 13) (A) vs Franco Díaz (demo 8) y Abril Núñez (demo 27) (B), cancha Club Sur
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '13 days', 'Club Sur', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, '4309ba5d-3d8d-4157-b840-87789085cd8c', 'A', 'confirmado'),
    (v_partido_id, '36be6ea5-2b08-49ec-a0fe-c8f515613477', 'B', 'confirmado'),
    (v_partido_id, '7ab1f217-2f0a-4a42-b122-753ebeef3b70', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(0), 'setsB', jsonb_build_array(3),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'B',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'B');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 993218, 'B',
    8, 15,
    0, 0, 1, 1,
    0, 0, 2, 5,
    2, 4, 2
  );

  -- Partido 13: Eduardo (vos) y Agostina Romero (demo 3) (A) vs Ignacio López (demo 19) y Florencia Álvarez (demo 29) (B), cancha Deportivo San Martín
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '10 days', 'Deportivo San Martín', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, '431d415e-fd8b-4596-bdad-5142428c15f3', 'A', 'confirmado'),
    (v_partido_id, 'bb980395-448e-4960-b859-c94a9bf3b2ba', 'B', 'confirmado'),
    (v_partido_id, '614b9711-1203-4f6f-aa68-c799357b38cc', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(0), 'setsB', jsonb_build_array(3),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'B');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 922908, 'A',
    3, 12,
    0, 0, 2, 2,
    0, 0, 1, 1,
    2, 6, 0
  );

  -- Partido 14: Eduardo (vos) y Florencia Álvarez (demo 29) (A) vs Benjamín Benítez (demo 20) y Franco Díaz (demo 8) (B), cancha Polideportivo Este
  insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
  values ('484872ad-02d9-4bc5-9754-6817160c9423', now() - interval '5 days', 'Polideportivo Este', 4, 'jugado', true)
  returning id into v_partido_id;

  update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = '484872ad-02d9-4bc5-9754-6817160c9423';

  insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado) values
    (v_partido_id, '614b9711-1203-4f6f-aa68-c799357b38cc', 'A', 'confirmado'),
    (v_partido_id, 'c431455f-c3f7-43b1-9abf-05202575b0f4', 'B', 'confirmado'),
    (v_partido_id, '36be6ea5-2b08-49ec-a0fe-c8f515613477', 'B', 'confirmado');

  insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
  values (v_partido_id, jsonb_build_object(
    'setsA', jsonb_build_array(2), 'setsB', jsonb_build_array(3),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'B',
    'historial', '[]'::jsonb, 'pausado', false
  ), true, 'B');

  insert into public.estadisticas_partido (
    partido_id, duracion_ms, saca_primero,
    puntos_totales_a, puntos_totales_b,
    quiebres_conv_a, quiebres_op_a, quiebres_conv_b, quiebres_op_b,
    puntos_juego_conv_a, puntos_juego_op_a, puntos_juego_conv_b, puntos_juego_op_b,
    racha_max_a, racha_max_b, games_en_deuce
  ) values (
    v_partido_id, 990065, 'B',
    20, 22,
    0, 1, 0, 1,
    2, 4, 3, 7,
    4, 4, 3
  );

  raise notice 'Listo: partidos + estadisticas demo insertados.';
end $$;
