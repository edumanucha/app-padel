-- Linkear la cancha elegida a la fila real de `canchas` (2026-09-13, a
-- pedido del usuario) -- hoy `partidos.cancha` es solo texto libre (el
-- campo predictivo de CampoCancha.js sugiere nombres pero tira el id al
-- elegir). Se agrega `cancha_id`, NULLABLE: partidos viejos y los que se
-- carguen con un nombre que no matchea ninguna fila real (cancha nueva,
-- typo, etc.) siguen funcionando igual que antes, solo con este dato de
-- más cuando se puede.
alter table public.partidos
  add column if not exists cancha_id uuid references public.canchas(id);
