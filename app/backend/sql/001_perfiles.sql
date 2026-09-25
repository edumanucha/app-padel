-- Épica 1: tabla `perfiles`, base de todo el resto del esquema.
--
-- NOTA DE PROVENIENCIA (2026-09-06): el script original de esta tabla se
-- corrió a mano en el SQL Editor de Supabase ANTES de adoptar esta carpeta
-- como repositorio de migraciones (ver `estado-tecnico-proyecto.md`,
-- sección Épica 1) y nunca quedó guardado en el repo. Este archivo es una
-- RECONSTRUCCIÓN fiel a partir de esa documentación narrativa y de cómo
-- los archivos posteriores (013, 014, 021, 022, 024, 028, 037) alteran
-- esta tabla -- no es un "restore" de un archivo perdido, es una
-- recreación equivalente. Si alguna vez hay que reconstruir la base de
-- cero, correr este archivo primero, y en orden, todo lo demás.
create table public.perfiles (
  id uuid primary key references auth.users(id),
  nombre text not null,
  telefono text not null,
  sexo text not null check (sexo in ('masculino', 'femenino')),
  zona text not null check (zona in (
    'ciudad_de_mendoza', 'godoy_cruz', 'guaymallen', 'las_heras', 'lujan_de_cuyo', 'maipu', 'otra_zona'
  )),
  nivel smallint not null check (nivel between 1 and 7),
  mano_habil text not null check (mano_habil in ('diestro', 'zurdo')),
  posicion text not null check (posicion in ('drive', 'reves')),
  activo boolean not null default true,
  dado_de_baja_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.actualizar_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_perfiles_updated_at
  before update on public.perfiles
  for each row execute function public.actualizar_updated_at();

alter table public.perfiles enable row level security;

-- Sin política ni GRANT de DELETE, a propósito: la baja de cuenta (US-1.6)
-- es un soft delete (`activo = false`), nunca un borrado real de fila.
grant select, insert, update on public.perfiles to authenticated;

create policy "Ver mi propio perfil" on public.perfiles
  for select to authenticated using (id = auth.uid());

create policy "Crear mi propio perfil" on public.perfiles
  for insert to authenticated with check (id = auth.uid());

create policy "Actualizar mi propio perfil" on public.perfiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
