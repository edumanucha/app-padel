-- BUG-022 (crítico -- feature entera rota): US-6.4 (lista de espera) nunca
-- funcionó -- la política de INSERT "Sumarme o ser invitado" (002) solo
-- permite estado 'anotado' (para uno mismo) o 'invitado' (organizador), y
-- 026_epica6_gestion_avanzada_partidos.sql sumó 'en_espera' al CHECK de la
-- columna pero se olvidó de sumarlo también acá -- todo intento real de
-- anotarse en lista de espera (handleAnotarmeEnEspera) daba 403 RLS.
drop policy if exists "Sumarme o ser invitado" on public.partido_jugadores;

create policy "Sumarme o ser invitado" on public.partido_jugadores
  for insert to authenticated
  with check (
    (jugador_id = auth.uid() and estado in ('anotado', 'en_espera'))
    or (
      estado = 'invitado'
      and exists (
        select 1 from public.partidos pa
        where pa.id = partido_id and pa.organizador_id = auth.uid()
      )
    )
  );

-- BUG-021: el chequeo de cupo al anotarse (006_us2_3_invitar_jugadores.sql)
-- comparaba `tg_op = 'insert'` en minúsculas -- TG_OP siempre devuelve
-- 'INSERT'/'UPDATE' en MAYÚSCULAS, así que esa comparación nunca era
-- cierta. En la práctica el resto de la condición (`old.estado is distinct
-- from 'anotado'`) igual debería cubrir el caso de INSERT, pero se
-- reescribe de forma explícita y a prueba de dudas -- separando INSERT de
-- UPDATE en vez de depender de un solo OR difícil de leer -- para dejar
-- 100% claro y verificado que un partido no puede sobrellenarse por
-- ninguna de las dos vías (anotarse directo, o aceptar una invitación).
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
$$ language plpgsql;

drop trigger if exists trg_validar_cupo_para_anotarse on public.partido_jugadores;

create trigger trg_validar_cupo_para_anotarse
before insert or update on public.partido_jugadores
for each row execute function public.validar_cupo_para_anotarse();
