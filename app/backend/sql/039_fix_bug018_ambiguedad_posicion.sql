-- BUG-018: buscar_candidatos_dupla fallaba con
-- "column reference posicion is ambiguous" (42702). El "returns table(...)"
-- declara una columna de salida llamada posicion, que plpgsql expone como
-- variable dentro del cuerpo de la función -- choca con perfiles.posicion
-- si no se califica con el alias de la tabla.
create or replace function public.buscar_candidatos_dupla()
returns table (id uuid, nombre text, nivel integer, posicion text, zona text)
language plpgsql
security definer
stable
as $$
declare
  v_mi_posicion text;
begin
  select pe.posicion into v_mi_posicion from public.perfiles pe where pe.id = auth.uid();

  return query
  select pe.id, pe.nombre, pe.nivel::integer, pe.posicion, pe.zona
  from public.perfiles pe
  where pe.activo = true
    and pe.busca_companero = true
    and pe.id <> auth.uid()
    and pe.posicion <> v_mi_posicion
  order by pe.nombre asc
  limit 30;
end;
$$;
