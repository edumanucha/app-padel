-- Producción limpia, segunda parte (2026-10-10). El 092 escondió solo a los
-- demo con mail @seed.local (32); quedaban a la vista 44 con mail
-- @test.local, 1 con @padelito.local y "Eduardo Demo" (pedido del usuario:
-- "Eduardo Demo esconder").
--
-- Además había UNA cuenta de Gmail (creada el 2026-09-18) marcada como demo:
-- es una persona real que se anotó antes del 063, que marcó como demo a
-- todos los que no se llamaban Eduardo; después el 086 le cambió el nombre.
-- Acá se la devuelve: deja de ser demo y recupera su nombre original del
-- respaldo del 063.
--
-- Se corre entero, una vez, en el SQL Editor de Supabase. Mismos pasos que
-- el 092 para los que se esconden: inactivos, fuera de grupos, sin
-- sugerencias ni disponibilidad. No se borra ninguna cuenta.

-- 0) A quiénes se esconde -----------------------------------------------------
drop table if exists pg_temp.ocultar;
create temp table ocultar as
select p.id
from public.perfiles p
join auth.users u on u.id = p.id
where p.activo
  and ((p.es_demo and (u.email like '%@test.local' or u.email like '%@padelito.local'))
       or p.nombre = 'Eduardo Demo');

-- 1) Inactivos ------------------------------------------------------------------
update public.perfiles set activo = false where id in (select id from ocultar);

-- 2) Fuera de los grupos ----------------------------------------------------------
do $$
declare
  v_grupo record;
  v_nuevo uuid;
begin
  for v_grupo in select id from public.grupos where creador_id in (select id from ocultar) loop
    select jugador_id into v_nuevo
      from public.grupo_miembros
     where grupo_id = v_grupo.id and jugador_id not in (select id from ocultar)
       and jugador_id in (select id from public.perfiles where activo)
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

delete from public.grupo_miembros where jugador_id in (select id from ocultar);
delete from public.grupo_invitaciones
 where jugador_id in (select id from ocultar) or invitado_por in (select id from ocultar);

-- 3) Sugerencias y disponibilidad ---------------------------------------------------
delete from public.grupos_sugeridos_jugadores where jugador_id in (select id from ocultar);
delete from public.disponibilidad_habitual where jugador_id in (select id from ocultar);

-- 4) La persona real que había quedado como demo ---------------------------------------
drop table if exists pg_temp.real_gmail;
create temp table real_gmail as
select p.id, p.nombre as nombre_inventado
from public.perfiles p
join auth.users u on u.id = p.id
where p.es_demo and p.activo and u.email like '%@gmail.com';

update public.perfiles p
   set es_demo = false,
       nombre = coalesce(
         (select r.nombre_anterior from public._respaldo_nombres_063 r
           where r.tabla = 'perfiles' and r.fila_id = p.id),
         p.nombre)
 where p.id in (select id from real_gmail);

-- Para revisar: los jugadores que ve la gente ahora. Columnas:
--   recuperado = true en la persona real que volvió a su nombre;
--   nombre_inventado = el que tenía por error;
--   partidos_inventados = en cuántos partidos falsos del 063/065 quedó metida
--     (ad hoc, todos los demás jugadores demo). Si es más de 0, se limpian
--     en un paso aparte.
select p.nombre,
       p.es_demo,
       (p.id in (select id from real_gmail)) as recuperado,
       (select g.nombre_inventado from real_gmail g where g.id = p.id) as nombre_inventado,
       case when p.id in (select id from real_gmail) then (
         select count(*) from public.partidos pa
         join public.partido_jugadores pj on pj.partido_id = pa.id and pj.jugador_id = p.id
         where pa.es_adhoc
           and not exists (
             select 1 from public.partido_jugadores o
             join public.perfiles op on op.id = o.jugador_id
             where o.partido_id = pa.id and o.jugador_id <> p.id and not op.es_demo)
       ) end as partidos_inventados,
       (select count(*) from ocultar) as escondidos_ahora
from public.perfiles p
where p.activo
order by recuperado desc, p.nombre;
