-- =========================================================
-- 101 · Me falta uno: el aviso llega por provincia (2026-10-11)
-- =========================================================
-- Pedido del usuario: el aviso de "Me falta gente" les llega a los de tu
-- provincia que encajan en el pedido (tipo de partido y categoría), en
-- vez de a tus grupos. Solo cambia a quién le llega el aviso; la cancha del
-- Inicio queda igual que en el 100.
--
-- Correr una vez en el SQL Editor de Supabase, después del 100.

create or replace function public.publicar_pedido(
  p_partido uuid,
  p_faltan integer,
  p_tipo text,
  p_falta_sexo text,
  p_nivel_min integer,
  p_nivel_max integer,
  p_fecha_hora timestamptz,
  p_hora_a_definir boolean,
  p_cancha text,
  p_cancha_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := p_partido;
  v_p public.partidos;
  v_reales integer;
  v_ya_buscaba boolean := false;
  v_nombre text;
  v_tipo_txt text;
  v_cat_txt text;
  v_msg text;
begin
  if v_uid is null then raise exception 'Tenés que iniciar sesión.'; end if;
  if p_faltan is null or p_faltan not between 1 and 3 then
    raise exception 'Elegí cuántos te faltan.';
  end if;
  if p_tipo is not null and p_tipo not in ('femenino', 'masculino', 'mixto') then
    raise exception 'Tipo de partido inválido.';
  end if;
  if p_nivel_min is not null and p_nivel_max is not null
     and (p_nivel_max < p_nivel_min or p_nivel_max - p_nivel_min > 1) then
    raise exception 'Elegí hasta 2 categorías seguidas.';
  end if;

  if v_id is null then
    if p_fecha_hora is null then raise exception 'Elegí el día.'; end if;
    insert into public.partidos (organizador_id, fecha_hora, cancha, cancha_id, cantidad_jugadores,
                                 hora_a_definir, cancha_a_definir)
    values (v_uid, p_fecha_hora,
            coalesce(nullif(btrim(p_cancha), ''), 'A definir'), p_cancha_id, 4,
            coalesce(p_hora_a_definir, false), nullif(btrim(p_cancha), '') is null)
    returning id into v_id;
  else
    select busca_jugador into v_ya_buscaba from public.partidos
     where id = v_id and organizador_id = v_uid and estado in ('abierto', 'completo');
    if not found then raise exception 'Ese partido no es tuyo o ya no está abierto.'; end if;
  end if;

  select count(*) into v_reales from public.partido_jugadores
   where partido_id = v_id and estado in ('anotado', 'confirmado');

  update public.partidos
     set busca_jugador = true,
         tipo_partido = p_tipo,
         falta_sexo = case when p_tipo = 'mixto' then p_falta_sexo else null end,
         nivel_min = p_nivel_min,
         nivel_max = coalesce(p_nivel_max, p_nivel_min),
         lugares_reservados = greatest(0, cantidad_jugadores - v_reales - p_faltan)
   where id = v_id
  returning * into v_p;

  perform public._recalcular_cupo_partido(v_id);

  -- Aviso a los de tu provincia que encajan (solo la primera vez).
  if not coalesce(v_ya_buscaba, false) then
    select split_part(btrim(nombre), ' ', 1) into v_nombre from public.perfiles where id = v_uid;
    v_tipo_txt := case p_tipo when 'femenino' then ' · Femenino' when 'masculino' then ' · Masculino'
                              when 'mixto' then ' · Mixto' else '' end;
    v_cat_txt := case when v_p.nivel_min is null then ''
                      when v_p.nivel_max is null or v_p.nivel_max = v_p.nivel_min then ' · ' || v_p.nivel_min || 'ª'
                      else ' · ' || v_p.nivel_min || 'ª-' || v_p.nivel_max || 'ª' end;
    v_msg := 'A ' || coalesce(v_nombre, 'alguien') || ' le falta' || case when p_faltan > 1 then 'n ' else ' ' end
             || p_faltan || v_tipo_txt || v_cat_txt || ' · ' || public._texto_cuando(v_p.fecha_hora, v_p.hora_a_definir)
             || case when v_p.cancha_a_definir then ', cancha a definir' else ' en ' || v_p.cancha end
             || '. Tocá para sumarte.';

    insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
    select distinct pe.id, 'pedido_jugador', v_msg, v_id
      from public.perfiles pe
      join public.perfiles yo on yo.id = v_uid
     where pe.id <> v_uid
       and yo.provincia is not null
       and pe.provincia = yo.provincia
       and coalesce(pe.notificaciones_activas, true)
       and coalesce(pe.activo, true)
       and not coalesce(pe.es_demo, false)
       and public._encaja_en_pedido(v_p, pe.sexo, pe.nivel)
       and not exists (select 1 from public.partido_jugadores pj
                        where pj.partido_id = v_id and pj.jugador_id = pe.id
                          and pj.estado in ('anotado', 'confirmado'));
  end if;

  return v_id;
end;
$$;
revoke all on function public.publicar_pedido(uuid, integer, text, text, integer, integer, timestamptz, boolean, text, uuid) from public, anon;
grant execute on function public.publicar_pedido(uuid, integer, text, text, integer, integer, timestamptz, boolean, text, uuid) to authenticated;

-- Verificación (debería dar 1):
select count(*) as publicar_pedido_ok from pg_proc where proname = 'publicar_pedido';
