-- US-6.7: vista pública mínima de un partido (para compartir por link a
-- alguien sin cuenta todavía). Sin teléfono ni nombres de participantes
-- -- eso sigue protegido por US-2.6, esta vista es deliberadamente más
-- chica que ver_participantes_partido.
create or replace function public.ver_partido_publico(p_id uuid)
returns table (
  id uuid,
  fecha_hora timestamptz,
  cancha text,
  cantidad_jugadores integer,
  lugares_ocupados integer,
  estado text
)
language sql
security definer
stable
as $$
  select id, fecha_hora, cancha, cantidad_jugadores, lugares_ocupados, estado
  from public.partidos
  where id = p_id;
$$;

-- A propósito para `anon` además de `authenticated`: alguien sin sesión
-- tiene que poder ver esto al abrir el link compartido.
grant execute on function public.ver_partido_publico(uuid) to anon, authenticated;
