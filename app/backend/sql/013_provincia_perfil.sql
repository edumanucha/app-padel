-- Campo "Provincia" en el perfil (US-1.2/US-1.3), a pedido del usuario
-- (2026-09-05): hoy toda la app asume Mendoza (zona, canchas). Se agrega
-- este campo ahora para poder, más adelante (no en este cambio), filtrar
-- el directorio de canchas según la provincia elegida en el perfil -- ej.
-- cuando se cargue una semilla de canchas de San Juan, un jugador de esa
-- provincia vería esas en vez de las de Mendoza. Por ahora `zona` y las
-- canchas sembradas siguen siendo solo de Mendoza.
alter table public.perfiles
  add column provincia text not null default 'mendoza';
