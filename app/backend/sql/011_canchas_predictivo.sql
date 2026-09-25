-- Adelanto chico de la Épica 4 (Directorio de Canchas), a pedido del
-- usuario: el campo "Cancha" de Crear partido y Marcador libre pasa a ser
-- predictivo (mismo patrón que la búsqueda de jugadores) en vez de texto
-- libre siempre. Esto NO reemplaza la Épica 4 completa (listado, detalle,
-- valores, horario, etc. quedan para cuando le toque el turno) -- es solo
-- la tabla mínima + semilla para que el campo tenga con qué autocompletar.
-- Datos: `semilla-canchas-epica4.md` (20 canchas reales de Mendoza,
-- investigadas vía Bing Maps).

create table public.canchas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  zona text,
  telefono text,
  created_at timestamptz not null default now()
);

grant select on public.canchas to authenticated;

alter table public.canchas enable row level security;

create policy "Ver canchas" on public.canchas
  for select to authenticated
  using (true);

insert into public.canchas (nombre, direccion, zona, telefono) values
  ('Canchas de Padel las cañas', 'Calle 25 de Mayo 2425, Villa Nueva', 'Guaymallén', '0261 383-0999'),
  ('La Nave Padel', 'Calle Perú 1110', 'Las Heras', '0261 342-6111'),
  ('Arena Padel Mendoza', 'Calle Pedro del Castillo 3050, Villa Nueva', 'Guaymallén', '0261 557-7800'),
  ('Canchas de Pádel Banco Previsión', 'Calle Salta 2739', 'Ciudad de Mendoza', '0261 537-5810'),
  ('UMaza Padel', 'Dr. Adolfo Calle 4136, Villa Nueva', 'Guaymallén', '0261 674-2993'),
  ('Las Vias Padel', 'Calle Pedro Pascual Segura 1852', 'Godoy Cruz', '0261 720-0538'),
  ('Padel House', 'Cnel. Juan Esteban Rodríguez 205', 'Ciudad de Mendoza', '0261 588-4379'),
  ('Padel Mendoza Tenis', 'Boulogne Sur Mer 520', 'Ciudad de Mendoza', null),
  ('CANO PADEL', 'Timoteo Gordillo 505', 'Ciudad de Mendoza', '0261 246-7277'),
  ('De Volea Padel', 'Juan Isuani 1832, Campo Papa', 'Guaymallén', '0261 485-3697'),
  ('Punto Padel (punto para los amigos)', 'Calle Chacabuco 78', 'Godoy Cruz', '0261 517-4665'),
  ('Punto de Oro Club de Padel', 'Altos Hornos de Zapla 2138', 'Godoy Cruz', '0261 15-774-2319'),
  ('Pádel Club Libertad', 'España 575', 'Godoy Cruz', '0261 661-1734'),
  ('Padel Canchas', 'Independencia 595', 'Godoy Cruz', '0261 419-1991'),
  ('Terrada Padel Club', 'Perdriel', 'Luján de Cuyo', '0261 566-9774'),
  ('VyV Pádel', 'Nahuel Huapí 7721, Chacras de Coria', 'Luján de Cuyo', '0261 15-665-5792'),
  ('Top Padel Guaymallén', 'Europa 9526, Rodeo de la Cruz', 'Guaymallén', '0261 15-279-4975'),
  ('Padel Hípico Mendoza', 'Av. Carlos Thays', 'Ciudad de Mendoza', '0261 533-9531'),
  ('Bandera Center Padel', 'Calle Bandera de los Andes 4397, Villa Nueva', 'Guaymallén', null),
  ('Padel Las Vayas', 'Calle Sarmiento 2945', 'Maipú', '0261 300-8536');
