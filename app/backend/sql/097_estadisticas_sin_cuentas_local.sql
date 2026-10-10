-- Saca de las estadísticas las cuentas de prueba con mail ".local" (2026-10-10).
-- "Eduardo Demo" (@test.local) no estaba marcada como demo y contaba como
-- usuario real. Igual que el 096, más el filtro por mails terminados en .local.

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
                          where u.id = pe.id
                            and (u.email = 'eduardomanucha@gmail.com' or u.email like '%.local'))
    ) t;
$$ language sql stable security definer set search_path = public;

revoke all on function public.usuarios_para_metricas() from public, anon, authenticated;

-- Para revisar: cuántos usuarios reales cuentan ahora (deberían ser 4).
select count(*) as usuarios_en_estadisticas from public.usuarios_para_metricas();
