-- Épica 2: US-2.2 (ver partidos abiertos y sumarme)
-- Correr en el SQL Editor de Supabase, después de 004_fix_recursion_partido_jugadores.sql.
--
-- Necesidad: el listado de "Partidos abiertos" tiene que mostrar cupos
-- ocupados/totales de CUALQUIER partido (no solo los propios), pero las
-- filas de `partido_jugadores` de otra gente no son visibles para mí por
-- RLS (a propósito, por privacidad -- ver US-2.6). Solución: guardar el
-- conteo como una columna en `partidos`, que sí es visible para
-- cualquier autenticado (política "Ver partidos", using(true)).
--
-- Distinción importante: `lugares_ocupados` cuenta anotados + confirmados
-- (cualquiera con un lugar reservado, todavía no confirmado o ya
-- confirmado) -- es lo que determina si "Sumarme" sigue disponible. Es
-- DISTINTO del campo `estado` del partido (abierto/completo), que sigue
-- dependiendo solo de los CONFIRMADOS (US-2.4: "completo" recién cuando
-- todos confirmaron, no cuando todos se anotaron).

alter table public.partidos
  add column if not exists lugares_ocupados integer not null default 0;

-- Se reemplaza la función existente para que además actualice
-- `lugares_ocupados` en cada cambio de `partido_jugadores` (mismo
-- trigger que ya corría, no hace falta uno nuevo).
create or replace function public.recalcular_estado_partido()
returns trigger as $$
declare
  v_partido_id uuid := coalesce(new.partido_id, old.partido_id);
  v_cantidad integer;
  v_estado_actual text;
  v_confirmados integer;
  v_ocupados integer;
begin
  select cantidad_jugadores, estado into v_cantidad, v_estado_actual
  from public.partidos where id = v_partido_id;

  select count(*) into v_confirmados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado = 'confirmado';

  select count(*) into v_ocupados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado in ('anotado', 'confirmado');

  update public.partidos set lugares_ocupados = v_ocupados where id = v_partido_id;

  if v_estado_actual = 'abierto' and v_confirmados >= v_cantidad then
    update public.partidos set estado = 'completo' where id = v_partido_id;
  elsif v_estado_actual = 'completo' and v_confirmados < v_cantidad then
    update public.partidos set estado = 'abierto' where id = v_partido_id;
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- Cupo: nadie puede "sumarse" (anotarse) a un partido que ya tiene tantos
-- anotados+confirmados como `cantidad_jugadores` -- sin esto, cualquiera
-- podía anotarse sin límite (el `INSERT` solo chequeaba "soy yo mismo",
-- nunca cupo disponible). No aplica a las filas que inserta el sistema
-- (organizador al crear el partido, invitaciones del organizador vía
-- US-2.3) -- solo al auto-anotarse.
create or replace function public.validar_cupo_para_anotarse()
returns trigger as $$
declare
  v_cantidad integer;
  v_ocupados integer;
begin
  if new.estado = 'anotado' then
    select cantidad_jugadores into v_cantidad
    from public.partidos where id = new.partido_id;

    select count(*) into v_ocupados
    from public.partido_jugadores
    where partido_id = new.partido_id and estado in ('anotado', 'confirmado');

    if v_ocupados >= v_cantidad then
      raise exception 'El partido ya no tiene lugares disponibles.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validar_cupo_para_anotarse
before insert on public.partido_jugadores
for each row execute function public.validar_cupo_para_anotarse();
