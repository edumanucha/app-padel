-- Partidos demo todos los días (2026-09-30, pedido del usuario: "dejalo
-- armado para que octubre tenga ranking"). El ranking mensual y el semanal
-- arrancan de cero cada mes/semana; para que la demo nunca quede vacía,
-- todos los días a la mañana se juegan solos 3 partidos entre los jugadores
-- demo (perfiles.es_demo, ver 063). Nunca participa nadie real.
--
-- Se corre una sola vez en el SQL Editor. Requiere 063 corrido antes.

create or replace function public.generar_partidos_demo(p_cantidad integer default 3)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_partido_id uuid;
  v_cancha_id uuid;
  v_cancha text;
  v_fecha timestamptz;
  v_sets_a integer[];
  v_sets_b integer[];
  v_ga integer;
  v_gb integer;
  v_sa integer;
  v_sb integer;
  v_ok integer := 0;
  i integer;
begin
  if (select count(*) from public.perfiles where es_demo and activo) < 4 then
    return 0;
  end if;

  for i in 1..p_cantidad loop
    begin
      select array_agg(id) into v_ids
      from (select id from public.perfiles where es_demo and activo order by random() limit 4) sub;

      select id, nombre into v_cancha_id, v_cancha from public.canchas order by random() limit 1;

      -- En las últimas 10 horas, así cae siempre en el día de hoy.
      v_fecha := now() - (random() * interval '10 hours');

      insert into public.partidos (organizador_id, fecha_hora, cancha, cancha_id, cantidad_jugadores, estado, es_adhoc)
      values (v_ids[1], v_fecha, coalesce(v_cancha, 'Cancha de prueba'), v_cancha_id, 4, 'jugado', true)
      returning id into v_partido_id;

      update public.partido_jugadores set equipo = 'A'
      where partido_id = v_partido_id and jugador_id = v_ids[1];

      insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado)
      values
        (v_partido_id, v_ids[2], 'A', 'confirmado'),
        (v_partido_id, v_ids[3], 'B', 'confirmado'),
        (v_partido_id, v_ids[4], 'B', 'confirmado');

      v_sets_a := array[]::integer[];
      v_sets_b := array[]::integer[];
      v_sa := 0;
      v_sb := 0;
      while v_sa < 2 and v_sb < 2 loop
        v_ga := 6;
        v_gb := (array[0, 1, 2, 3, 4, 4, 3, 5, 6])[1 + floor(random() * 9)::int];
        if v_gb >= 5 then v_ga := 7; end if;
        if random() < 0.5 then
          v_sets_a := v_sets_a || v_ga; v_sets_b := v_sets_b || v_gb; v_sa := v_sa + 1;
        else
          v_sets_a := v_sets_a || v_gb; v_sets_b := v_sets_b || v_ga; v_sb := v_sb + 1;
        end if;
      end loop;

      -- finalizado = true dispara el trigger que suma los puntos de ranking.
      insert into public.resultados_partido (partido_id, estado, finalizado, ganador, created_at, updated_at)
      values (
        v_partido_id,
        jsonb_build_object(
          'setsA', to_jsonb(v_sets_a), 'setsB', to_jsonb(v_sets_b),
          'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
          'historial', '[]'::jsonb, 'pausado', false, 'finalizado', true,
          'ganador', case when v_sa > v_sb then 'A' else 'B' end
        ),
        true,
        case when v_sa > v_sb then 'A' else 'B' end,
        v_fecha,
        v_fecha + (60 + random() * 40) * interval '1 minute'
      );

      v_ok := v_ok + 1;
    exception when others then
      raise notice 'Partido demo % salteado: %', i, sqlerrm;
    end;
  end loop;

  return v_ok;
end;
$$;

-- Que nadie la pueda llamar desde la app: solo la base (el cron) y el SQL Editor.
revoke all on function public.generar_partidos_demo(integer) from public, anon, authenticated;

-- Todos los días a las 12:00 UTC (9 de la mañana en Argentina).
create extension if not exists pg_cron;
select cron.unschedule('partidos-demo-diarios')
where exists (select 1 from cron.job where jobname = 'partidos-demo-diarios');
select cron.schedule('partidos-demo-diarios', '0 12 * * *', $$select public.generar_partidos_demo(3)$$);

-- Para comprobar que quedó programado:
select jobname, schedule, command from cron.job where jobname = 'partidos-demo-diarios';

-- PARA APAGARLO (no lo corras ahora):
-- select cron.unschedule('partidos-demo-diarios');
