-- Marcador en vivo para quien solo mira (2026-10-04): se asegura que la tabla
-- resultados_partido esté en la publicación de Supabase Realtime. En el SQL 009
-- esto quedó como un paso manual del panel (Database > Replication); si nunca
-- se hizo, quien mira el marcador no recibe los puntos hasta recargar. Esta
-- versión lo deja listo sin importar si ya estaba (no falla si ya está).
-- Correr en el SQL Editor de Supabase, después de 075.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'resultados_partido'
  ) then
    alter publication supabase_realtime add table public.resultados_partido;
  end if;
end $$;

-- Con "full" los cambios llegan completos al celu de quien mira.
alter table public.resultados_partido replica identity full;
