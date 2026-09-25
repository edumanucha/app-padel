-- BUG-013 (encontrado en la pasada de responsive/QA, 2026-09-06): el
-- Directorio de jugadores mostraba "Sin partidos jugados" para TODOS los
-- jugadores, incluso los que sí tienen historial real (ej. las cuentas
-- demo con partidos ya jugados) -- `DirectorioJugadoresForm.js` lee
-- `j.partidos_jugados`/`j.porcentaje_victorias`, pero
-- `listar_directorio_jugadores` nunca los devolvía (se ve que quedaron
-- pendientes de una sesión anterior). `ver_perfil_jugador` (perfil
-- reducido de un jugador, al que se llega tocando una fila del
-- directorio) sí los calcula correctamente -- se reutiliza exactamente
-- el mismo patrón acá.
drop function if exists public.listar_directorio_jugadores(text, integer, text);

create or replace function public.listar_directorio_jugadores(
  p_nombre text default null,
  p_nivel integer default null,
  p_sexo text default null
)
returns table (
  id uuid,
  nombre text,
  nivel integer,
  mano_habil text,
  posicion text,
  sexo text,
  puntos_ranking integer,
  partidos_jugados integer,
  porcentaje_victorias integer
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    pe.id,
    pe.nombre::text,
    pe.nivel::integer,
    pe.mano_habil::text,
    pe.posicion::text,
    pe.sexo::text,
    pe.puntos_ranking::integer,
    coalesce(stats.jugados, 0)::integer,
    coalesce(stats.pct, 0)::integer
  from public.perfiles pe
  left join lateral (
    select
      count(*) as jugados,
      round(100.0 * count(*) filter (where rp.ganador = pj.equipo) / nullif(count(*), 0)) as pct
    from public.partido_jugadores pj
    join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
    where pj.jugador_id = pe.id
  ) stats on true
  where pe.activo = true
    and pe.id <> auth.uid()
    and (p_nombre is null or pe.nombre ilike '%' || p_nombre || '%')
    and (p_nivel is null or pe.nivel = p_nivel)
    and (p_sexo is null or pe.sexo::text = p_sexo)
  order by pe.puntos_ranking desc, pe.nombre asc
  limit 200;
end;
$$;

grant execute on function public.listar_directorio_jugadores(text, integer, text) to authenticated;
