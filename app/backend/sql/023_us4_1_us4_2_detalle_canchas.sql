-- Épica 4: US-4.1 (listado) y US-4.2 (detalle) del Directorio de Canchas.
-- `descripcion` y `valores` quedan nullable a propósito: son datos reales
-- de negocios reales investigados por fuera (ver semilla-canchas-epica4.md)
-- -- no corresponde inventarles descripción/precio ficticios. La UI
-- muestra un fallback ("Consultar valores") cuando no hay dato cargado.
alter table public.canchas
  add column if not exists descripcion text,
  add column if not exists valores text;

-- Lectura de una sola cancha por id (US-4.2) -- la política "Ver canchas"
-- ya cubre esto (using true), no hace falta una función aparte.
