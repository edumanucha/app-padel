-- Avatar de perfil (a pedido del usuario, 2026-09-05): imagen de la
-- persona, opcional (no es uno de los 7 campos obligatorios de US-1.2).
-- Usa Supabase Storage (bucket público "avatars"), cada usuario solo puede
-- subir/reemplazar dentro de su propia carpeta (<user_id>/...).

alter table public.perfiles
  add column avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar publico para lectura" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Subir mi propio avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Reemplazar mi propio avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
