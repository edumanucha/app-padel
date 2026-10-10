-- Saca la cuenta "edu" de las estadísticas (2026-10-10, pedido del usuario:
-- "sacá esa edu"). Es una cuenta de prueba del propio usuario, ya escondida
-- en el 095; acá deja de contar como usuario en /admin/estadisticas.
-- Igual que el 082, más el filtro por esa cuenta.

create or replace function public.usuarios_para_metricas()
returns table (id uuid, n bigint, created_at timestamptz, dia_alta date) as $$
  select t.id, t.n, t.created_at, t.dia_alta
    from (
      select pe.id, pe.nombre,
             row_number() over (order by pe.created_at) as n,
             pe.created_at,
             (pe.created_at at time zone 'America/Argentina/Mendoza')::date as dia_alta
        from public.perfiles pe
       where coalesce(pe.es_demo, false) = false and coalesce(pe.es_superusuario, false) = false
         and pe.nombre <> 'Jugador eliminado'
         and not exists (select 1 from auth.users u
                          where u.id = pe.id and u.email = 'eduardomanucha@gmail.com')
    ) t;
$$ language sql stable security definer set search_path = public;

revoke all on function public.usuarios_para_metricas() from public, anon, authenticated;

-- Para revisar: cuántos usuarios reales cuentan ahora.
select count(*) as usuarios_en_estadisticas from public.usuarios_para_metricas();
