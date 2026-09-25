-- Home (US-5.3): al tocar "Racha" o "% jugados", se muestra el historial
-- de partidos jugados (rival, resultado, gané/perdí) -- a pedido del
-- usuario (2026-09-05). Devuelve todos los partidos finalizados del
-- usuario logueado, más recientes primero.
create or replace function public.mi_historial_partidos()
returns table (
  partido_id uuid,
  fecha_hora timestamptz,
  cancha text,
  gano boolean,
  sets_a jsonb,
  sets_b jsonb,
  mi_equipo text,
  rival_nombres text
)
language plpgsql
security definer
stable
as $$
declare
  v_user uuid := auth.uid();
begin
  return query
  select
    rp.partido_id,
    pa.fecha_hora,
    pa.cancha,
    (rp.ganador = pj.equipo) as gano,
    rp.estado -> 'setsA',
    rp.estado -> 'setsB',
    pj.equipo,
    (
      select string_agg(coalesce(pe.nombre, pj2.invitado_nombre), ' / ')
      from public.partido_jugadores pj2
      left join public.perfiles pe on pe.id = pj2.jugador_id
      where pj2.partido_id = rp.partido_id and pj2.equipo <> pj.equipo
    )
  from public.resultados_partido rp
  join public.partido_jugadores pj on pj.partido_id = rp.partido_id and pj.jugador_id = v_user
  join public.partidos pa on pa.id = rp.partido_id
  where rp.finalizado = true
  order by pa.fecha_hora desc
  limit 50;
end;
$$;

grant execute on function public.mi_historial_partidos() to authenticated;
