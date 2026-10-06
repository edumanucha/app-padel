-- Estadísticas de uso, parte 2 (2026-10-06, pedido del usuario): partidos
-- terminados que se llevaron con el Marcadorcito vs. los cargados a mano
-- ("Cargar un partido jugado"), para el panel del superusuario.
-- Los cargados a mano tienen estado.cargadoAMano = true (ver SQL 073).
-- Mismo criterio que el resto del panel: solo partidos con algún jugador que
-- cuenta (sin demo ni superusuarios), no cancelados y terminados.
-- Correr en el SQL Editor de Supabase, después de 082.

create or replace function public.estadisticas_partidos_admin()
returns jsonb as $$
declare
  v_tz constant text := 'America/Argentina/Mendoza';
  v_hoy date := (now() at time zone 'America/Argentina/Mendoza')::date;
  r jsonb;
begin
  if not exists (select 1 from public.perfiles where id = auth.uid() and es_superusuario = true) then
    raise exception 'no_permitido';
  end if;

  with terminados as (
    select rp.partido_id,
           (rp.updated_at at time zone v_tz)::date as dia,
           coalesce((rp.estado ->> 'cargadoAMano') = 'true', false) as a_mano
      from public.resultados_partido rp
      join public.partidos pa on pa.id = rp.partido_id
     where rp.finalizado = true and pa.estado <> 'cancelado'
       and exists (select 1 from public.partido_jugadores pj
                     join public.usuarios_para_metricas() u on u.id = pj.jugador_id
                    where pj.partido_id = rp.partido_id and pj.estado = 'confirmado')
  )
  select jsonb_build_object(
    'a_mano_total', count(*) filter (where a_mano),
    'a_mano_7d', count(*) filter (where a_mano and dia >= v_hoy - 6),
    'a_mano_30d', count(*) filter (where a_mano and dia >= v_hoy - 29),
    'marcadorcito_total', count(*) filter (where not a_mano),
    'marcadorcito_7d', count(*) filter (where not a_mano and dia >= v_hoy - 6),
    'marcadorcito_30d', count(*) filter (where not a_mano and dia >= v_hoy - 29),
    'usuarios_a_mano', (select count(distinct pj.jugador_id)
                          from terminados t
                          join public.partido_jugadores pj on pj.partido_id = t.partido_id and pj.estado = 'confirmado'
                          join public.usuarios_para_metricas() u on u.id = pj.jugador_id
                         where t.a_mano)
  ) into r
  from terminados;

  return r;
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function public.estadisticas_partidos_admin() to authenticated;
