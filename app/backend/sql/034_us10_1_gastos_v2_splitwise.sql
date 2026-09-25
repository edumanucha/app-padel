-- US-10.1 (rediseño, 2026-09-06, a pedido del usuario): en vez de un solo
-- costo total dividido en partes iguales, se carga cuánto gastó cada
-- persona (nombre libre, sin vincularlo a una cuenta real ni tablas
-- nuevas -- decisión explícita del usuario, "no es necesario crear una
-- conexión entre jugadores") y se calculan los saldos: quién le debe a
-- quién y cuánto. Reemplaza el costo único de la versión anterior.
alter table public.partidos
  add column if not exists gastos jsonb;

-- No hace falta una política nueva: "Organizador carga el costo de
-- cancha" (033) ya permite al organizador actualizar cualquier columna
-- de su propio partido, `gastos` incluida.
