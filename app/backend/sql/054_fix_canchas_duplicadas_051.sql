-- Fix: 051 se corrió dos veces (una versión sin descripcion/valores, antes
-- de agregárselos, y la versión final) -- cada uno de los 40 clubes nuevos
-- quedó dos veces: una copia completa y una con descripcion/valores en
-- null. Se borra la copia INCOMPLETA de cada par (liberando antes
-- cualquier reseña de demo que colgara de ella), genérico por nombre en
-- vez de listar los 40 a mano.
do $$
declare
  v_id_borrar uuid;
begin
  for v_id_borrar in
    select c1.id
    from public.canchas c1
    join public.canchas c2 on c2.nombre = c1.nombre and c2.id <> c1.id
    where c1.descripcion is null and c2.descripcion is not null
  loop
    delete from public.resenas_canchas where cancha_id = v_id_borrar;
    delete from public.canchas where id = v_id_borrar;
  end loop;
end $$;
