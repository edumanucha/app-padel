-- =========================================================
-- 070 · Inicio en una sola consulta (2026-10-03, velocidad 4)
-- =========================================================
-- Hoy el Inicio hace 3 pedidos a la base: tu perfil, el resumen
-- (resumen_home) y las notificaciones (listar_notificaciones). Esta función
-- los junta en UNO solo, así el celu espera una vuelta de red en vez de dos.
--
-- No cambia nada de seguridad: NO es security definer, así que el perfil se
-- lee con la misma regla de siempre ("Ver mi propio perfil"); resumen_home y
-- listar_notificaciones ya eran security definer y se llaman igual.
--
-- La app, si esta función todavía no existe o falla (por ejemplo, en una
-- cuenta nueva sin perfil), vuelve sola al camino de los 3 pedidos.
--
-- Correr una vez en el SQL Editor de Supabase.

create or replace function public.home_inicial()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'perfil', (select to_jsonb(p) from public.perfiles p where p.id = auth.uid()),
    'resumen', public.resumen_home(),
    'notificaciones', coalesce(
      (select jsonb_agg(to_jsonb(n) order by n.creado_en desc) from public.listar_notificaciones() n),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.home_inicial() from public, anon;
grant execute on function public.home_inicial() to authenticated;

-- Verificación (debería dar 1):
-- select count(*) from pg_proc where proname = 'home_inicial';
