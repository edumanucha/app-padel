-- Datos de demo con nombres de jugadores de River (2026-09-30, pedido del
-- usuario: "todo lo que hay en la base de jugadores, exceptuando los que son
-- Eduardo, cambialos por nombres de jugadores de River" + "agregá rankings,
-- partidos inventados, etc.").
--
-- Qué hace (se corre entero, una sola vez, en el SQL Editor de Supabase):
--   1. Guarda los nombres actuales en una tabla de respaldo, para poder
--      volver atrás (ver el bloque "PARA DESHACER" al final).
--   2. Marca a esos jugadores con perfiles.es_demo = true. Los scripts
--      viejos los reconocían por "(demo N)" en el nombre; desde ahora se
--      usa esta columna.
--   3. Les cambia el nombre (y también a los invitados sin cuenta de los
--      partidos) por jugadores de River, al azar y sin repetir.
--   4. Inventa 70 partidos jugados entre ellos en los últimos 60 días
--      (unos 15 en esta semana), así hay ranking semanal, mensual e
--      histórico, rachas y % de victorias. Los puntos los suma solo el
--      trigger de siempre (2 por game + 5 por ganar).
--
-- Nunca toca a nadie que se llame Eduardo, ni sus partidos.

-- 1 y 2) Respaldo + marca de demo -----------------------------------------
create table if not exists public._respaldo_nombres_063 (
  tabla text not null,
  fila_id uuid not null,
  nombre_anterior text not null,
  primary key (tabla, fila_id)
);
-- Sin políticas: con RLS prendido nadie la ve desde la app, solo el SQL Editor.
alter table public._respaldo_nombres_063 enable row level security;

alter table public.perfiles add column if not exists es_demo boolean not null default false;

insert into public._respaldo_nombres_063 (tabla, fila_id, nombre_anterior)
select 'perfiles', id, nombre from public.perfiles
where nombre not ilike '%eduardo%'
on conflict do nothing;

insert into public._respaldo_nombres_063 (tabla, fila_id, nombre_anterior)
select 'partido_jugadores', id, invitado_nombre from public.partido_jugadores
where jugador_id is null and invitado_nombre is not null and invitado_nombre not ilike '%eduardo%'
on conflict do nothing;

update public.perfiles set es_demo = true where nombre not ilike '%eduardo%';

-- 3) Nombres de River ------------------------------------------------------
do $$
declare
  v_nombres text[] := array[
    'Franco Armani', 'Enzo Pérez', 'Gonzalo Montiel', 'Paulo Díaz', 'Leandro González Pirez',
    'Milton Casco', 'Nacho Fernández', 'Manuel Lanzini', 'Miguel Borja', 'Facundo Colidio',
    'Claudio Echeverri', 'Franco Mastantuono', 'Rodrigo Aliendro', 'Maxi Meza', 'Germán Pezzella',
    'Marcos Acuña', 'Fabricio Bustos', 'Santiago Simón', 'Agustín Palavecino', 'Esequiel Barco',
    'Pablo Solari', 'Sebastián Driussi', 'Lucas Martínez Quarta', 'Exequiel Palacios', 'Julián Álvarez',
    'Enzo Fernández', 'Gonzalo Martínez', 'Lucas Pratto', 'Ignacio Scocco', 'Rafael Santos Borré',
    'Matías Suárez', 'Leonardo Ponzio', 'Javier Pinola', 'Jonatan Maidana', 'Camilo Mayada',
    'Rodrigo Mora', 'Fernando Cavenaghi', 'Marcelo Barovero', 'Carlos Sánchez', 'Teófilo Gutiérrez',
    'Ariel Ortega', 'Marcelo Salas', 'Enzo Francescoli', 'Hernán Crespo', 'Marcelo Gallardo',
    'Pablo Aimar', 'Javier Saviola', 'Juan Pablo Sorín', 'Matías Almeyda', 'Leonardo Astrada',
    'Norberto Alonso', 'Daniel Passarella', 'Ubaldo Fillol', 'Ramón Díaz', 'Amadeo Carrizo',
    'Ángel Labruna', 'Oscar Ruggeri', 'Américo Gallego', 'Radamel Falcao', 'Andrés D''Alessandro',
    'Gonzalo Higuaín', 'Sergio Berti', 'Hernán Díaz', 'Celso Ayala', 'Roberto Ayala',
    'Martín Demichelis', 'Diego Buonanotte', 'Juan Fernando Quintero', 'Nicolás De La Cruz', 'Bruno Zuculini',
    'Robert Rojas', 'Jorge Carrascal', 'Lucas Beltrán', 'Matías Kranevitter', 'Leonel Vangioni',
    'Gabriel Mercado', 'Ramiro Funes Mori', 'Augusto Batalla', 'Germán Lux', 'Juan Pablo Carrizo',
    'Fernando Belluschi', 'Ariel Rojas', 'Cristian Ledesma', 'Santiago Sosa', 'Emanuel Mammana',
    'Kevin Castaño', 'Giuliano Galoppo', 'Sebastián Boselli', 'Ezequiel Centurión'
  ];
  v_total integer := array_length(v_nombres, 1);
  v_i integer := 0;
  v_fila record;
  v_nombre text;
begin
  for v_fila in
    select 'perfiles' as tabla, id from public.perfiles where es_demo = true
    union all
    select 'partido_jugadores', id from public.partido_jugadores
    where jugador_id is null and invitado_nombre is not null and invitado_nombre not ilike '%eduardo%'
    order by 1 desc, 2
  loop
    -- Si hay más jugadores que nombres, la segunda vuelta lleva "II".
    v_nombre := v_nombres[1 + (v_i % v_total)];
    if v_i >= v_total then
      v_nombre := v_nombre || ' II';
    end if;
    if v_fila.tabla = 'perfiles' then
      update public.perfiles set nombre = v_nombre where id = v_fila.id;
    else
      update public.partido_jugadores set invitado_nombre = v_nombre where id = v_fila.id;
    end if;
    v_i := v_i + 1;
  end loop;
  raise notice 'Nombres cambiados: %', v_i;
end $$;

-- 4) Partidos inventados ---------------------------------------------------
do $$
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
    raise notice 'Hay menos de 4 jugadores demo activos, no se inventan partidos.';
    return;
  end if;

  for i in 1..70 loop
    begin
      select array_agg(id) into v_ids
      from (select id from public.perfiles where es_demo and activo order by random() limit 4) sub;

      select id, nombre into v_cancha_id, v_cancha from public.canchas order by random() limit 1;

      -- Los primeros 15, en lo que va de la semana; el resto, en 60 días.
      if i <= 15 then
        v_fecha := greatest(date_trunc('week', now()), now() - interval '6 days')
                   + random() * (now() - greatest(date_trunc('week', now()), now() - interval '6 days'));
      else
        v_fecha := now() - (random() * interval '60 days');
      end if;

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

      -- Sets reales: se juega hasta que alguien gana 2 (6-x o 7-5 / 7-6).
      v_sets_a := array[]::integer[];
      v_sets_b := array[]::integer[];
      v_sa := 0;
      v_sb := 0;
      while v_sa < 2 and v_sb < 2 loop
        v_ga := 6;
        v_gb := (array[0, 1, 2, 3, 4, 4, 3, 5, 6])[1 + floor(random() * 9)::int];
        if v_gb = 5 then v_ga := 7; end if;
        if v_gb = 6 then v_ga := 7; end if;
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
      raise notice 'Partido % salteado: %', i, sqlerrm;
    end;
  end loop;

  raise notice 'Partidos inventados: % de 70.', v_ok;
end $$;

-- Para ver cómo quedó el ranking:
select nombre, puntos_ranking from public.perfiles where activo order by puntos_ranking desc limit 15;

-- PARA DESHACER LOS NOMBRES (no lo corras ahora):
-- update public.perfiles p set nombre = r.nombre_anterior
--   from public._respaldo_nombres_063 r where r.tabla = 'perfiles' and r.fila_id = p.id;
-- update public.partido_jugadores pj set invitado_nombre = r.nombre_anterior
--   from public._respaldo_nombres_063 r where r.tabla = 'partido_jugadores' and r.fila_id = pj.id;
