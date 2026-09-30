-- Keep-alive v2 (2026-09-30): el proyecto se pausó igual con el
-- "select 1" diario de 060_keep_alive.sql. Ahora cada ping ESCRIBE en la
-- base (una fila por origen, se actualiza la fecha), que cuenta más como
-- actividad real que una lectura vacía. Dos orígenes independientes:
-- 'vercel' (cron diario de /api/keep-alive) y 'github' (GitHub Actions).
--
-- Seguridad: anon solo puede ejecutar la función, no tocar la tabla, y la
-- función acepta solo esos dos orígenes -- la tabla nunca crece más de 2
-- filas aunque alguien llame la función a mano.
create table if not exists public.keep_alive_latidos (
  origen text primary key check (origen in ('vercel', 'github')),
  ultimo_latido timestamptz not null default now(),
  cantidad bigint not null default 1
);

alter table public.keep_alive_latidos enable row level security;
-- sin políticas: nadie la lee/escribe por API, solo la función de abajo.
revoke all on public.keep_alive_latidos from anon, authenticated;

create or replace function public.latido(p_origen text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fecha timestamptz;
begin
  if p_origen not in ('vercel', 'github') then
    raise exception 'origen no válido';
  end if;

  insert into public.keep_alive_latidos (origen) values (p_origen)
  on conflict (origen) do update
    set ultimo_latido = now(),
        cantidad = keep_alive_latidos.cantidad + 1
  returning ultimo_latido into v_fecha;

  return v_fecha;
end;
$$;

revoke execute on function public.latido(text) from public;
grant execute on function public.latido(text) to anon, authenticated;
