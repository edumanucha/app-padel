-- Keep-alive para que Supabase no pause el proyecto por inactividad
-- (plan free: se pausa tras 7 días sin actividad -- aviso recibido el
-- 2026-09-25). Vercel Cron llama una vez por día a /api/keep-alive del
-- frontend, que ejecuta este RPC: es una consulta real a la base, que es
-- lo que Supabase cuenta como actividad.
--
-- Devuelve solo un número fijo: no expone ningún dato, por eso es seguro
-- dejarlo ejecutable por anon (la ruta corre sin usuario logueado).
create or replace function public.keep_alive()
returns integer
language sql
stable
as $$
  select 1;
$$;

revoke execute on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
