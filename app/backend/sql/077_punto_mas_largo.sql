-- Punto más largo (2026-10-04, pedido del usuario): las estadísticas de un
-- partido del Marcadorcito guardan el punto más largo, calculado como el
-- mayor tiempo (en segundos) entre dos puntos seguidos del mismo game.
-- Es aproximado: incluye el tiempo de preparar el saque.
-- Correr en el SQL Editor de Supabase, después de 076.

alter table public.estadisticas_partido
  add column if not exists punto_mas_largo_s integer not null default 0;
