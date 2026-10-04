-- Partidos cargados a mano (2026-10-04, pedido del usuario): quien carga un
-- partido jugado sin Marcadorcito avisa a los otros jugadores con cuenta. Si
-- el resultado está mal, cualquiera de ellos puede corregirlo (se avisa a los
-- demás) o decir que no jugó. No hace falta aceptar nada: si nadie hace
-- nada, el partido queda guardado como se cargó. La corrección se puede
-- hacer hasta 7 días después de la carga.
-- Correr en el SQL Editor de Supabase, después de 072.

-- Tipos nuevos de notificación (se mantienen los que ya existían).
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in (
    'invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado', 'lugar_disponible',
    'mensaje_nuevo', 'saldo_gastos', 'sugerencia_grupo', 'dupla_vinculada',
    'partido_cargado', 'resultado_corregido', 'no_jugo'
  ));

-- Suma (signo = 1) o quita (signo = -1) los puntos de ranking de un partido:
-- 2 por game + 5 de bono a la pareja ganadora (misma fórmula de 009).
create or replace function public._puntos_ranking_partido(p_partido uuid, p_sets_a jsonb, p_sets_b jsonb, p_ganador text, p_signo integer)
returns void as $$
declare
  v_games_a integer;
  v_games_b integer;
begin
  select coalesce(sum(g::int), 0) into v_games_a from jsonb_array_elements_text(p_sets_a) as g;
  select coalesce(sum(g::int), 0) into v_games_b from jsonb_array_elements_text(p_sets_b) as g;

  update public.perfiles pe
     set puntos_ranking = greatest(0, pe.puntos_ranking + p_signo * (
           case when pj.equipo = 'A' then v_games_a * 2 + (case when p_ganador = 'A' then 5 else 0 end)
                else v_games_b * 2 + (case when p_ganador = 'B' then 5 else 0 end) end))
    from public.partido_jugadores pj
   where pj.partido_id = p_partido and pj.jugador_id = pe.id and pj.estado = 'confirmado';
end;
$$ language plpgsql security definer set search_path = public;

-- Texto del resultado desde el punto de vista de un equipo ("6-4 3-6 6-2").
create or replace function public._texto_sets(p_sets_a jsonb, p_sets_b jsonb, p_equipo text)
returns text as $$
  select string_agg(
           case when p_equipo = 'B' then (b.v || '-' || a.v) else (a.v || '-' || b.v) end,
           ' ' order by a.n)
    from jsonb_array_elements_text(p_sets_a) with ordinality as a(v, n)
    join jsonb_array_elements_text(p_sets_b) with ordinality as b(v, n) on a.n = b.n;
$$ language sql immutable;

-- Avisa a los otros jugadores con cuenta que se cargó el partido.
create or replace function public.avisar_partido_cargado(p_partido uuid)
returns void as $$
declare
  v_res record;
  v_nombre text;
  v_otro record;
begin
  select rp.estado, rp.ganador, pa.organizador_id into v_res
    from public.resultados_partido rp join public.partidos pa on pa.id = rp.partido_id
   where rp.partido_id = p_partido;
  if v_res.organizador_id is distinct from auth.uid() or coalesce(v_res.estado ->> 'cargadoAMano', 'false') <> 'true' then
    raise exception 'no_permitido';
  end if;
  select nombre into v_nombre from public.perfiles where id = auth.uid();

  for v_otro in
    select pj.jugador_id, pj.equipo
      from public.partido_jugadores pj join public.perfiles pe on pe.id = pj.jugador_id
     where pj.partido_id = p_partido and pj.jugador_id is not null and pj.jugador_id <> auth.uid()
       and coalesce(pe.notificaciones_activas, true)
  loop
    insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
    values (
      v_otro.jugador_id, 'partido_cargado',
      v_nombre || ' cargó un partido que jugaron: ' ||
        (case when v_res.ganador = v_otro.equipo then 'ganaron' else 'perdieron' end) || ' ' ||
        public._texto_sets(v_res.estado -> 'setsA', v_res.estado -> 'setsB', v_otro.equipo) ||
        '. Revisalo: si algo está mal, podés corregir el resultado o avisar que no jugaste. Si no hacés nada, queda guardado así.',
      p_partido);
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- Corrige el resultado de un partido cargado a mano (cualquiera de los
-- jugadores con cuenta, hasta 7 días después). p_sets_a / p_sets_b van desde
-- el punto de vista de los equipos A y B del partido.
create or replace function public.corregir_resultado_partido(p_partido uuid, p_sets_a integer[], p_sets_b integer[])
returns void as $$
declare
  v_res record;
  v_mi_equipo text;
  v_nombre text;
  v_nuevo_ganador text;
  v_sets_a jsonb := to_jsonb(p_sets_a);
  v_sets_b jsonb := to_jsonb(p_sets_b);
  v_ganados_a integer := 0;
  v_ganados_b integer := 0;
  v_otro record;
  i integer;
begin
  select rp.estado, rp.ganador, rp.created_at into v_res from public.resultados_partido rp where rp.partido_id = p_partido;
  if v_res.estado is null or coalesce(v_res.estado ->> 'cargadoAMano', 'false') <> 'true' then
    raise exception 'no_es_carga_manual';
  end if;
  select equipo into v_mi_equipo from public.partido_jugadores
   where partido_id = p_partido and jugador_id = auth.uid() and estado = 'confirmado';
  if v_mi_equipo is null then raise exception 'no_jugador'; end if;
  if v_res.created_at < now() - interval '7 days' then raise exception 'plazo_vencido'; end if;

  if coalesce(array_length(p_sets_a, 1), 0) not between 2 and 3 or array_length(p_sets_a, 1) <> array_length(p_sets_b, 1) then
    raise exception 'resultado_invalido';
  end if;
  for i in 1 .. array_length(p_sets_a, 1) loop
    if p_sets_a[i] < 0 or p_sets_b[i] < 0 or p_sets_a[i] > 30 or p_sets_b[i] > 30 or p_sets_a[i] = p_sets_b[i] then
      raise exception 'resultado_invalido';
    end if;
    if p_sets_a[i] > p_sets_b[i] then v_ganados_a := v_ganados_a + 1; else v_ganados_b := v_ganados_b + 1; end if;
  end loop;
  if v_ganados_a <> 2 and v_ganados_b <> 2 then raise exception 'resultado_invalido'; end if;
  v_nuevo_ganador := case when v_ganados_a > v_ganados_b then 'A' else 'B' end;

  -- Quita los puntos del resultado anterior y suma los del nuevo.
  perform public._puntos_ranking_partido(p_partido, v_res.estado -> 'setsA', v_res.estado -> 'setsB', v_res.ganador, -1);
  perform public._puntos_ranking_partido(p_partido, v_sets_a, v_sets_b, v_nuevo_ganador, 1);

  update public.resultados_partido
     set estado = estado || jsonb_build_object('setsA', v_sets_a, 'setsB', v_sets_b, 'corregidoPor', auth.uid()),
         ganador = v_nuevo_ganador
   where partido_id = p_partido;

  select nombre into v_nombre from public.perfiles where id = auth.uid();
  for v_otro in
    select pj.jugador_id, pj.equipo
      from public.partido_jugadores pj join public.perfiles pe on pe.id = pj.jugador_id
     where pj.partido_id = p_partido and pj.jugador_id is not null and pj.jugador_id <> auth.uid()
       and pj.estado = 'confirmado' and coalesce(pe.notificaciones_activas, true)
  loop
    insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
    values (
      v_otro.jugador_id, 'resultado_corregido',
      v_nombre || ' corrigió el resultado del partido: ' ||
        (case when v_nuevo_ganador = v_otro.equipo then 'ganaron' else 'perdieron' end) || ' ' ||
        public._texto_sets(v_sets_a, v_sets_b, v_otro.equipo) || '.',
      p_partido);
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- "No jugué este partido": sale del partido (se le quitan los puntos) y se
-- avisa a los demás. No vale para quien lo cargó.
create or replace function public.no_jugue_partido(p_partido uuid)
returns void as $$
declare
  v_res record;
  v_nombre text;
  v_otro record;
  v_organizador uuid;
begin
  select rp.estado, rp.ganador, pa.organizador_id into v_res
    from public.resultados_partido rp join public.partidos pa on pa.id = rp.partido_id
   where rp.partido_id = p_partido;
  v_organizador := v_res.organizador_id;
  if v_res.estado is null or coalesce(v_res.estado ->> 'cargadoAMano', 'false') <> 'true' then
    raise exception 'no_es_carga_manual';
  end if;
  if v_organizador = auth.uid() then raise exception 'es_quien_cargo'; end if;
  if not exists (select 1 from public.partido_jugadores where partido_id = p_partido and jugador_id = auth.uid() and estado = 'confirmado') then
    raise exception 'no_jugador';
  end if;

  -- Puntos: se quitan solo los de esta persona.
  update public.perfiles pe
     set puntos_ranking = greatest(0, pe.puntos_ranking - (
           select case when pj.equipo = 'A'
                    then coalesce((select sum(g::int) from jsonb_array_elements_text(v_res.estado -> 'setsA') g), 0) * 2 + (case when v_res.ganador = 'A' then 5 else 0 end)
                    else coalesce((select sum(g::int) from jsonb_array_elements_text(v_res.estado -> 'setsB') g), 0) * 2 + (case when v_res.ganador = 'B' then 5 else 0 end) end
             from public.partido_jugadores pj where pj.partido_id = p_partido and pj.jugador_id = pe.id))
   where pe.id = auth.uid();

  -- Primero "rechazado" y después se borra la fila (la regla de no salir
  -- de un partido confirmado no aplica a quien ya figura como rechazado).
  update public.partido_jugadores set estado = 'rechazado' where partido_id = p_partido and jugador_id = auth.uid();
  delete from public.partido_jugadores where partido_id = p_partido and jugador_id = auth.uid();

  select nombre into v_nombre from public.perfiles where id = auth.uid();
  for v_otro in
    select pj.jugador_id
      from public.partido_jugadores pj join public.perfiles pe on pe.id = pj.jugador_id
     where pj.partido_id = p_partido and pj.jugador_id is not null and coalesce(pe.notificaciones_activas, true)
  loop
    insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
    values (v_otro.jugador_id, 'no_jugo', v_nombre || ' avisó que no jugó el partido cargado, así que salió del partido.', p_partido);
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.avisar_partido_cargado(uuid) to authenticated;
grant execute on function public.corregir_resultado_partido(uuid, integer[], integer[]) to authenticated;
grant execute on function public.no_jugue_partido(uuid) to authenticated;
