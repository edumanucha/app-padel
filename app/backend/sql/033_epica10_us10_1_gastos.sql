-- Épica 10: Economía del Partido (post-MVP).
-- US-10.1: calculadora de gastos -- solo informativa, no procesa pagos
-- reales (decisión explícita del usuario, 2026-09-06).
alter table public.partidos
  add column if not exists costo_cancha numeric;

-- El organizador es quien carga el costo (mismo criterio que "Cancelar
-- partido", solo el dueño del partido lo toca); ver/calcular el
-- desglose es para todos los participantes vía RLS de select ya
-- existente ("Ver partidos", using(true)).
create policy "Organizador carga el costo de cancha" on public.partidos
  for update to authenticated
  using (organizador_id = auth.uid())
  with check (organizador_id = auth.uid());
