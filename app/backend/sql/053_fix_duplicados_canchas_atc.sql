-- Fix: 051/052 no revisaron 012_mas_canchas_mendoza.sql (otra tanda vieja
-- de canchas mock), que ya tenía variantes de nombre de varios clubes que
-- 051 volvió a insertar con el nombre y dirección reales de atcsports.io
-- -- quedaron duplicados. Se borra la fila VIEJA de cada uno (identificada
-- por nombre + dirección de 012, para no tocar la nueva), primero
-- liberando cualquier reseña de demo que colgara de esa fila (FK).
do $$
declare
  v_duplicados text[][] := array[
    array['Pacífico Padel y Fútbol', 'Av. Perú 2280'],
    array['Jaime Serrano Padel', 'Carlos Washington Lencinas'],
    array['Las Cañas Padel Club', 'Las Cañas 1511'],
    array['Indoor Efecto Padel', 'Hornos de Zapla 1710'],
    array['FOX Padel', 'Carril Rodríguez Peña 2032'],
    array['Academia Arena Pádel', 'Pedro del Castillo 3050'],
    array['Garden Padel', 'C. Tapón Moyano S/N'],
    array['HACHE CLUB', 'Terrada 7551'],
    array['J3 Sport Padel', 'Almte. Brown']
  ];
  v_par text[];
  v_id uuid;
begin
  foreach v_par slice 1 in array v_duplicados loop
    select id into v_id from public.canchas where nombre = v_par[1] and direccion = v_par[2];
    if v_id is not null then
      delete from public.resenas_canchas where cancha_id = v_id;
      delete from public.canchas where id = v_id;
    end if;
  end loop;

  delete from public.resenas_canchas where cancha_id in (
    select id from public.canchas where nombre = 'Terra Padel Club' and direccion is null
  );
  delete from public.canchas where nombre = 'Terra Padel Club' and direccion is null;
end $$;
