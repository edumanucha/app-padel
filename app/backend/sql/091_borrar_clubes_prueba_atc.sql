-- Borra los clubes de prueba de ATC que se colaron con el 088 (2026-10-10,
-- pedido del usuario). Son 11, todos en Jujuy, con nombres como "Complejo
-- Prueba Comercial", "Complejo Prueba Soporte (sin seña)", "Complejo Prueba
-- Chelo": complejos internos de ATC para probar su sistema, no clubes reales.
-- No existen en Google Maps.
--
-- Se corre entero, una vez, en el SQL Editor de Supabase.
--   1. Si algún partido los eligió como cancha, el partido queda sin cancha
--      enlazada (se mantiene el nombre escrito).
--   2. Se borran sus reseñas, si tuvieran.
--   3. Se borran los 11 clubes.

do $$
declare
  v_ids text[] := array['7', '865', '304', '816', '1494', '1177', '1309', '776', '559', '150', '1082'];
begin
  update public.partidos set cancha_id = null
  where cancha_id in (select id from public.canchas where atc_id = any(v_ids));

  delete from public.resenas_canchas
  where cancha_id in (select id from public.canchas where atc_id = any(v_ids));

  delete from public.canchas where atc_id = any(v_ids);
end $$;

-- Para revisar: no debería quedar ninguna cancha con "prueba" en el nombre.
select atc_id, nombre, provincia from public.canchas where nombre ilike '%prueba%';
