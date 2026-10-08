-- Borrar notificaciones (2026-10-08, pedido del usuario): cada persona puede
-- borrar sus notificaciones (una por una o todas) y las de más de 30 días se
-- borran solas todos los días.
-- Correr en el SQL Editor de Supabase, después de 084.

-- 1. Borrar las mías -------------------------------------------------------
grant delete on public.notificaciones to authenticated;

drop policy if exists "Borrar mis notificaciones" on public.notificaciones;
create policy "Borrar mis notificaciones" on public.notificaciones
  for delete to authenticated
  using (jugador_id = auth.uid());

-- 2. Limpieza diaria de las de más de 30 días ------------------------------
create or replace function public.borrar_notificaciones_viejas()
returns void as $$
  delete from public.notificaciones where creado_en < now() - interval '30 days';
$$ language sql security definer set search_path = public;

-- Solo la base lo corre (no se expone a la app).
revoke all on function public.borrar_notificaciones_viejas() from public, anon, authenticated;

-- Todos los días a las 7:00 UTC (4 de la mañana en Argentina).
create extension if not exists pg_cron;
select cron.unschedule('borrar-notificaciones-viejas')
where exists (select 1 from cron.job where jobname = 'borrar-notificaciones-viejas');
select cron.schedule('borrar-notificaciones-viejas', '0 7 * * *', $$select public.borrar_notificaciones_viejas()$$);

-- Para comprobar que quedó programado:
select jobname, schedule, command from cron.job where jobname = 'borrar-notificaciones-viejas';
