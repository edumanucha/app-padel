-- Cierre automático de Marcadorcitos que quedaron abiertos (2026-10-05, pedido
-- del usuario: "un partido no dura más de 2,5 horas; más que eso es un error").
-- Cada 15 minutos se buscan los partidos con el marcador sin terminar que
-- empezaron hace más de 2 horas y media y se cancelan: no cuentan para el
-- ranking ni las estadísticas, y los jugadores reciben el aviso de partido
-- cancelado que ya existía.
-- Necesita pg_cron (ya se usa para los partidos demo, SQL 065).
-- Correr en el SQL Editor de Supabase, después de 078.

create or replace function public.cerrar_marcadores_vencidos()
returns integer as $$
declare
  v_cerrados integer;
begin
  with vencidos as (
    select pa.id
      from public.resultados_partido rp
      join public.partidos pa on pa.id = rp.partido_id
     where rp.finalizado = false
       and pa.estado in ('abierto', 'completo')
       and rp.created_at < now() - interval '150 minutes'
  ), cancelados as (
    update public.partidos set estado = 'cancelado'
     where id in (select id from vencidos)
    returning id
  )
  select count(*) into v_cerrados from cancelados;
  return v_cerrados;
end;
$$ language plpgsql security definer set search_path = public;

-- Solo la base lo corre (no se expone a la app).
revoke all on function public.cerrar_marcadores_vencidos() from public, anon, authenticated;

select cron.schedule('cerrar-marcadores-vencidos', '*/15 * * * *', 'select public.cerrar_marcadores_vencidos()');

-- Una pasada ahora mismo, para cerrar los que ya estén vencidos.
select public.cerrar_marcadores_vencidos();
