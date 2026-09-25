-- BUG-025: al liberarse un lugar, se avisaba a TODA la lista de espera en
-- vez de solo al primero. Causa: `recalcular_estado_partido` está
-- declarado `AFTER INSERT OR DELETE OR UPDATE`, y el propio cuerpo de la
-- función hace `update partido_jugadores set avisado_lista_espera = true`
-- para marcar a quien avisa -- ese UPDATE vuelve a disparar EL MISMO
-- trigger (recursión vía trigger, no vía llamada directa a la función).
-- En esa segunda pasada, "hay lugar" sigue siendo cierto (nadie ocupó el
-- lugar todavía, solo se lo avisamos) y `avisado_lista_espera=false` ya no
-- incluye al primero -- así que encuentra y avisa al segundo. Y así en
-- cascada con el resto de la lista, todo dentro de la misma transacción.
--
-- Fix: `pg_trigger_depth()` -- built-in de Postgres, cuenta cuántos
-- niveles de trigger anidados hay activos ahora mismo. La invocación
-- original (disparada por el DELETE/INSERT/UPDATE real del cliente) corre
-- en profundidad 1; la invocación recursiva causada por el UPDATE interno
-- de esta misma función corre en profundidad 2. Se restringe el bloque de
-- aviso de lista de espera a solo la profundidad 1 -- así se avisa a lo
-- sumo a una persona por cada liberación real de lugar, tal como pide el
-- criterio de aceptación de US-6.4.
create or replace function public.recalcular_estado_partido()
returns trigger as $$
declare
  v_partido_id uuid := coalesce(new.partido_id, old.partido_id);
  v_cantidad integer;
  v_estado_actual text;
  v_confirmados integer;
  v_ocupados integer;
  v_en_espera record;
  v_notif_activas boolean;
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

  -- US-6.4: si hay lugar y alguien en la lista de espera sin avisar
  -- todavía, le avisamos (uno solo, el más antiguo) -- solo en la
  -- invocación de primer nivel, para no reprocesar por el UPDATE propio.
  if v_ocupados < v_cantidad and pg_trigger_depth() <= 1 then
    select * into v_en_espera
    from public.partido_jugadores
    where partido_id = v_partido_id and estado = 'en_espera' and avisado_lista_espera = false
    order by created_at asc
    limit 1;

    if v_en_espera.id is not null then
      select coalesce(notificaciones_activas, true) into v_notif_activas
      from public.perfiles where id = v_en_espera.jugador_id;

      if coalesce(v_notif_activas, true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (v_en_espera.jugador_id, 'lugar_disponible', 'Se liberó un lugar en un partido de tu lista de espera. Confirmá tu lugar antes de que se lo lleve otro.', v_partido_id);
      end if;

      update public.partido_jugadores set avisado_lista_espera = true where id = v_en_espera.id;
    end if;
  end if;

  return null;
end;
$$ language plpgsql security definer;
