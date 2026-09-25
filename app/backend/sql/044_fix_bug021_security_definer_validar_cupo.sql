-- BUG-021 (causa raíz real, más profunda de lo que 043 corrigió): el
-- chequeo de cupo al anotarse nunca funcionó de verdad para el caso más
-- común -- un jugador sumándose a un partido abierto del que TODAVÍA no
-- participa. `validar_cupo_para_anotarse()` nunca se declaró `security
-- definer` (a diferencia de `recalcular_estado_partido`, que sí lo es
-- desde el principio) -- corre como SECURITY INVOKER, así que su propio
-- `select count(*) from partido_jugadores` queda sujeto a la política RLS
-- "Ver participantes de mis partidos" **del usuario que se está anotando**.
-- Como esa persona todavía no es participante ni organizador en el momento
-- del chequeo (BEFORE INSERT, la fila propia todavía no existe), esa
-- política le devuelve CERO filas -- el conteo siempre daba 0, y "0 >=
-- cantidad_jugadores" nunca es cierto. El cupo jamás estuvo realmente
-- garantizado a nivel de servidor para el camino de "Sumarme" (US-2.2),
-- solo lo evitaba la UI ocultando el botón cuando ya se veía completo.
--
-- Encontrado recién ahora (2026-09-06) probando la lista de espera de
-- US-6.4 con cuentas que todavía no eran parte del partido -- el 043
-- (arreglo del bug de mayúsculas en tg_op) era necesario pero no
-- suficiente; sin este fix el chequeo seguía sin frenar a nadie.
create or replace function public.validar_cupo_para_anotarse()
returns trigger as $$
declare
  v_cantidad integer;
  v_ocupados integer;
  v_debe_chequear boolean;
begin
  if tg_op = 'INSERT' then
    v_debe_chequear := (new.estado = 'anotado');
  else
    v_debe_chequear := (new.estado = 'anotado' and old.estado is distinct from 'anotado');
  end if;

  if v_debe_chequear then
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
$$ language plpgsql security definer;
