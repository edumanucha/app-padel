-- =========================================================
-- 102 · Me falta uno: la cancha del Inicio por provincia (2026-10-11)
-- =========================================================
-- Pedido del usuario ("no quiero el limitante de los grupos"): la cancha
-- muestra los pedidos y los disponibles de tu provincia, igual que el
-- aviso (101). Ya no depende de los grupos.
-- ('tiene_grupo' ahora dice si tenés provincia cargada; la app lo usa para
-- avisarte que la completes.)
--
-- Correr una vez en el SQL Editor de Supabase, después del 101.

-- Todo lo que necesita la cancha del Inicio, en una sola consulta.
create or replace function public.cancha_inicio()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_yo record;
  v_mi jsonb;
  v_pedidos jsonb;
  v_disp record;
  v_otros jsonb;
begin
  if v_uid is null then return null; end if;
  select id, sexo, nivel, provincia into v_yo from public.perfiles where id = v_uid;

  -- 1. Tu pedido publicado ("Me falta gente") que todavía tiene lugar.
  --    No se adivina nada de los partidos armados con "Crear partido".
  select jsonb_build_object(
           'id', p.id, 'fecha_hora', p.fecha_hora, 'hora_a_definir', p.hora_a_definir,
           'cancha', p.cancha, 'cancha_a_definir', p.cancha_a_definir,
           'busca_jugador', p.busca_jugador, 'tipo_partido', p.tipo_partido, 'falta_sexo', p.falta_sexo,
           'nivel_min', p.nivel_min, 'nivel_max', p.nivel_max,
           'cantidad', p.cantidad_jugadores, 'reservados', p.lugares_reservados,
           'libres', public._lugares_libres(p.id))
    into v_mi
    from public.partidos p
   where p.organizador_id = v_uid
     and p.estado = 'abierto'
     and p.busca_jugador
     and p.fecha_hora > now()
     and public._lugares_libres(p.id) > 0
   order by p.fecha_hora
   limit 1;

  -- 2. Pedidos de tu provincia donde encajás.
  select coalesce(jsonb_agg(x order by x->>'fecha_hora'), '[]'::jsonb) into v_pedidos
    from (
      select jsonb_build_object(
               'id', p.id, 'fecha_hora', p.fecha_hora, 'hora_a_definir', p.hora_a_definir,
               'cancha', p.cancha, 'cancha_a_definir', p.cancha_a_definir,
               'tipo_partido', p.tipo_partido, 'falta_sexo', p.falta_sexo,
               'nivel_min', p.nivel_min, 'nivel_max', p.nivel_max,
               'libres', public._lugares_libres(p.id),
               'reservados', p.lugares_reservados,
               'cantidad', p.cantidad_jugadores,
               'organizador_id', p.organizador_id,
               'organizador', split_part(btrim(org.nombre), ' ', 1)) as x
        from public.partidos p
        join public.perfiles org on org.id = p.organizador_id
       where p.busca_jugador
         and p.estado = 'abierto'
         and p.fecha_hora > now()
         and p.organizador_id <> v_uid
         and v_yo.provincia is not null
         and org.provincia = v_yo.provincia
         and not exists (select 1 from public.partido_jugadores pj
                          where pj.partido_id = p.id and pj.jugador_id = v_uid
                            and pj.estado in ('anotado', 'confirmado'))
         and public._encaja_en_pedido(p, v_yo.sexo, v_yo.nivel)
         and public._lugares_libres(p.id) > 0
       order by p.fecha_hora
       limit 10
    ) t;

  -- 3/4. ¿Estás disponible hoy? ¿Quiénes más de tu provincia?
  select dia, desde into v_disp from public.disponibles where jugador_id = v_uid and dia = public._hoy_ar();

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pe.id, 'nombre', split_part(btrim(pe.nombre), ' ', 1),
           'avatar_url', pe.avatar_url, 'desde', d.desde) order by d.created_at), '[]'::jsonb)
    into v_otros
    from public.disponibles d
    join public.perfiles pe on pe.id = d.jugador_id
   where d.dia = public._hoy_ar()
     and d.jugador_id <> v_uid
     and v_yo.provincia is not null
     and pe.provincia = v_yo.provincia;

  return jsonb_build_object(
    'mi_partido', v_mi,
    'pedidos', v_pedidos,
    'disponible', v_disp.dia is not null,
    'disponible_desde', v_disp.desde,
    'disponibles', v_otros,
    'tiene_grupo', v_yo.provincia is not null
  );
end;
$$;
revoke all on function public.cancha_inicio() from public, anon;
grant execute on function public.cancha_inicio() to authenticated;

-- Verificación (debería dar 1):
select count(*) as cancha_inicio_ok from pg_proc where proname = 'cancha_inicio';
