-- Espacio de comentarios/feedback general de la app (a pedido del
-- usuario, 2026-09-06) -- no es una historia de usuario formal, es un
-- canal simple para que cualquier jugador deje una sugerencia o
-- comentario libre. Solo el superusuario lo revisa (mismo patrón que
-- reportes_mensajes, US-7.4).
create table public.feedback_app (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.perfiles(id),
  comentario text not null check (char_length(comentario) between 1 and 1000),
  creado_en timestamptz not null default now()
);

grant select, insert on public.feedback_app to authenticated;

alter table public.feedback_app enable row level security;

create policy "Dejar mi comentario" on public.feedback_app
  for insert to authenticated
  with check (jugador_id = auth.uid());

create policy "Superusuario ve el feedback" on public.feedback_app
  for select to authenticated
  using (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );
