-- Épica 3: US-3.5 (Directorio de jugadores) -- lista filtrable de
-- jugadores activos con su vista reducida de perfil (nombre, nivel,
-- ranking por puntos, mano hábil, sexo -- sin teléfono ni otros datos de
-- contacto), ordenada por ranking. Resuelve la pregunta abierta de
-- privacidad de US-1.4: ya no hace falta compartir un partido para ver
-- esta vista reducida de otro jugador.
--
-- Nota (2026-09-05): los campos se castean explícitamente (::text/::int)
-- porque "structure of query does not match function result type" indica
-- que `sexo` (no usado en ninguna función anterior) no es exactamente
-- `text` en la tabla real -- probablemente un tipo enum de Postgres en vez
-- de texto + CHECK. Castear evita tener que confirmar el tipo exacto.
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
  puntos_ranking integer
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
    pe.puntos_ranking::integer
  from public.perfiles pe
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
