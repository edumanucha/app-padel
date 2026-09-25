-- Reaplica las políticas de reportes_mensajes por si no quedaron
-- aplicadas correctamente en 030_us7_4_mensajeria.sql.
drop policy if exists "Crear un reporte" on public.reportes_mensajes;
drop policy if exists "Superusuario ve los reportes" on public.reportes_mensajes;

create policy "Crear un reporte" on public.reportes_mensajes
  for insert to authenticated
  with check (reportado_por = auth.uid());

create policy "Superusuario ve los reportes" on public.reportes_mensajes
  for select to authenticated
  using (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );
