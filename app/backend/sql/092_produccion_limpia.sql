-- Producción limpia antes de publicar en Instagram (2026-10-10, pedido del
-- usuario: "quiero que quede limpio", "que no se vea lo que vamos probando").
--
-- Qué hace (se corre entero, una vez, en el SQL Editor de Supabase):
--   1. Esconde a los jugadores demo (cuentas creadas por el script de demo,
--      mail @seed.local): quedan inactivos, así no salen en el directorio, el
--      ranking, los buscadores, las invitaciones, el compañero fijo ni las
--      sugerencias de grupo. No se borran: siguen marcados con es_demo.
--   2. Los saca de los grupos (el ranking de grupo y el cartel VS del Inicio
--      no miran si están activos). Si un grupo lo había creado un demo y tiene
--      miembros reales, pasa al miembro real más antiguo; si no queda nadie
--      real, el grupo se borra.
--   3. Borra sus sugerencias de grupo pendientes y su disponibilidad.
--   4. Frena los partidos demo diarios (tarea programada de 065).
--   5. Elimina las cuentas de prueba eduardomanucha+prueba...@gmail.com con
--      el mismo borrado de "Eliminar mi cuenta" (081). La cuenta real
--      eduardomanucha@gmail.com no se toca.
--
-- Para volver a mostrar a los demo (los grupos no vuelven):
--   update public.perfiles p set activo = true from auth.users u
--   where u.id = p.id and p.es_demo and u.email like '%@seed.local';

-- 0) Quiénes son demo -------------------------------------------------------
drop table if exists pg_temp.demo;
create temp table demo as
select p.id
from public.perfiles p
join auth.users u on u.id = p.id
where p.es_demo and u.email like '%@seed.local';

-- 1) Inactivos ----------------------------------------------------------------
update public.perfiles set activo = false where id in (select id from demo);

-- 2) Fuera de los grupos --------------------------------------------------------
do $$
declare
  v_grupo record;
  v_nuevo uuid;
begin
  for v_grupo in select id from public.grupos where creador_id in (select id from demo) loop
    select jugador_id into v_nuevo
      from public.grupo_miembros
     where grupo_id = v_grupo.id and jugador_id not in (select id from demo)
     order by created_at
     limit 1;
    if v_nuevo is not null then
      update public.grupos set creador_id = v_nuevo where id = v_grupo.id;
      update public.grupo_miembros set rol = 'admin' where grupo_id = v_grupo.id and jugador_id = v_nuevo;
    else
      delete from public.grupos where id = v_grupo.id;
    end if;
    v_nuevo := null;
  end loop;
end $$;

delete from public.grupo_miembros where jugador_id in (select id from demo);
delete from public.grupo_invitaciones
 where jugador_id in (select id from demo) or invitado_por in (select id from demo);

-- 3) Sugerencias y disponibilidad -------------------------------------------------
delete from public.grupos_sugeridos_jugadores where jugador_id in (select id from demo);
delete from public.disponibilidad_habitual where jugador_id in (select id from demo);

-- 4) Sin partidos demo diarios ------------------------------------------------------
select cron.unschedule('partidos-demo-diarios')
where exists (select 1 from cron.job where jobname = 'partidos-demo-diarios');

-- 5) Cuentas de prueba ----------------------------------------------------------------
-- eliminar_mi_cuenta usa auth.uid(): se corre "como" cada cuenta de prueba.
do $$
declare
  v_cuenta record;
begin
  for v_cuenta in
    select u.id from auth.users u
    join public.perfiles p on p.id = u.id
    where u.email like 'eduardomanucha+prueba%@gmail.com'
      and p.nombre <> 'Jugador eliminado'
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', v_cuenta.id, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_cuenta.id::text, true);
    perform public.eliminar_mi_cuenta('ELIMINAR');
  end loop;
end $$;

-- Para revisar: los jugadores que ve la gente (deberían ser solo personas
-- reales) y, en cada fila, cuántos demo quedaron escondidos (unos 40).
select p.nombre, p.provincia, p.es_demo,
       (select count(*) from demo) as demo_escondidos
from public.perfiles p
where p.activo
order by p.nombre;
