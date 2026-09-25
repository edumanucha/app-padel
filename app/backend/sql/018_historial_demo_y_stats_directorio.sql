-- A pedido del usuario (2026-09-05): que los jugadores demo tengan
-- historial real de partidos jugados (no solo un puntos_ranking suelto),
-- para que % de victorias y cantidad de partidos jugados tengan datos
-- reales detrás -- y sumar esas dos columnas al Directorio (US-3.5).
--
-- Nota (2026-09-05, tercera vuelta): la versión anterior (barajar
-- v_demo_ids con unnest + order by random(), tomar los primeros 4) NO
-- randomizaba de verdad -- los 40 partidos generados terminaron con
-- exactamente los mismos 4 jugadores siempre (confirmado por el usuario
-- corriendo un SELECT de diagnóstico). Se reemplaza por una consulta
-- directa a la tabla con `order by random() limit 4` en cada iteración,
-- que es el patrón estándar y confiable para esto -- ya no depende de
-- barajar un array guardado en una variable.
do $$
declare
  v_n integer;
  v_barajados uuid[];
  v_a1 uuid; v_a2 uuid; v_b1 uuid; v_b2 uuid;
  v_partido_id uuid;
  v_sets_a integer[]; v_sets_b integer[];
  v_ganador text;
  v_games_a integer; v_games_b integer;
  v_cancha text;
  i integer;
  s integer;
  v_num_sets integer;
  v_ga integer; v_gb integer;
  v_sa integer; v_sb integer;
  v_ok integer := 0;
begin
  select count(*) into v_n from public.perfiles where nombre ilike '%(demo %' and activo = true;
  if v_n < 4 then
    raise notice 'No hay suficientes jugadores demo (%), se aborta.', v_n;
    return;
  end if;

  -- Limpieza de los datos generados por la corrida anterior (con el bug
  -- de siempre los mismos 4 jugadores), para partir de cero. Solo borra
  -- partidos organizados por un jugador demo -- no toca partidos ad-hoc
  -- reales que hayas probado vos con tu propia cuenta.
  --
  -- El trigger de US-2.4 (no se puede "salir" de un partido con menos de
  -- 1 hora de anticipación) se dispara también con este DELETE de
  -- limpieza porque los partidos están en el pasado -- se desactiva nada
  -- más para este borrado puntual, no queda desactivado después.
  alter table public.partido_jugadores disable trigger trg_validar_cancelacion_confirmado;

  delete from public.resultados_partido
  where partido_id in (
    select id from public.partidos
    where es_adhoc = true and estado = 'jugado'
      and organizador_id in (select id from public.perfiles where nombre ilike '%(demo %')
  );
  delete from public.partido_jugadores
  where partido_id in (
    select id from public.partidos
    where es_adhoc = true and estado = 'jugado'
      and organizador_id in (select id from public.perfiles where nombre ilike '%(demo %')
  );
  delete from public.partidos
  where es_adhoc = true and estado = 'jugado'
    and organizador_id in (select id from public.perfiles where nombre ilike '%(demo %');

  alter table public.partido_jugadores enable trigger trg_validar_cancelacion_confirmado;

  update public.perfiles set puntos_ranking = 0 where nombre ilike '%(demo %';

  for i in 1..40 loop
    begin
      select array_agg(id) into v_barajados
      from (
        select id from public.perfiles
        where nombre ilike '%(demo %' and activo = true
        order by random()
        limit 4
      ) sub;

      v_a1 := v_barajados[1];
      v_a2 := v_barajados[2];
      v_b1 := v_barajados[3];
      v_b2 := v_barajados[4];

      select nombre into v_cancha from public.canchas order by random() limit 1;

      insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
      values (v_a1, now() - (random() * interval '60 days'), coalesce(v_cancha, 'Cancha de prueba'), 4, 'jugado', true)
      returning id into v_partido_id;

      update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = v_a1;

      v_num_sets := case when random() < 0.6 then 2 else 3 end;
      v_sets_a := array[]::integer[];
      v_sets_b := array[]::integer[];
      v_games_a := 0;
      v_games_b := 0;

      for s in 1..v_num_sets loop
        if random() < 0.5 then
          v_ga := 6;
          v_gb := (array[0, 1, 2, 3, 4])[1 + floor(random() * 5)::int];
        else
          v_gb := 6;
          v_ga := (array[0, 1, 2, 3, 4])[1 + floor(random() * 5)::int];
        end if;
        v_sets_a := v_sets_a || v_ga;
        v_sets_b := v_sets_b || v_gb;
        v_games_a := v_games_a + v_ga;
        v_games_b := v_games_b + v_gb;
      end loop;

      v_sa := 0;
      v_sb := 0;
      for s in 1..v_num_sets loop
        if v_sets_a[s] > v_sets_b[s] then v_sa := v_sa + 1; else v_sb := v_sb + 1; end if;
      end loop;
      v_ganador := case when v_sa > v_sb then 'A' else 'B' end;

      insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado)
      values
        (v_partido_id, v_a2, 'A', 'confirmado'),
        (v_partido_id, v_b1, 'B', 'confirmado'),
        (v_partido_id, v_b2, 'B', 'confirmado');

      insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
      values (
        v_partido_id,
        jsonb_build_object(
          'setsA', to_jsonb(v_sets_a), 'setsB', to_jsonb(v_sets_b),
          'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
          'historial', '[]'::jsonb, 'pausado', false
        ),
        true,
        v_ganador
      );

      update public.perfiles
      set puntos_ranking = puntos_ranking + v_games_a * 2 + (case when v_ganador = 'A' then 5 else 0 end)
      where id in (v_a1, v_a2);

      update public.perfiles
      set puntos_ranking = puntos_ranking + v_games_b * 2 + (case when v_ganador = 'B' then 5 else 0 end)
      where id in (v_b1, v_b2);

      v_ok := v_ok + 1;
    exception when others then
      raise notice 'Partido % salteado por error: %', i, sqlerrm;
    end;
  end loop;

  raise notice 'Listo: % de 40 partidos ficticios generados.', v_ok;
end $$;
