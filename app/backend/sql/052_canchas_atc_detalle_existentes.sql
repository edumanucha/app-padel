-- Completa descripcion/valores (mismo origen que 051: atcsports.io) para
-- los 11 clubes que YA estaban cargados desde 011_canchas_predictivo.sql
-- (por eso van por UPDATE, matcheando el nombre exacto de esa siembra
-- original, y no por INSERT -- evita duplicar y no toca las reseñas de
-- demo que ya cuelgan de esos ids).
update public.canchas set
  descripcion = '12 canchas (6 techadas, 6 descubiertas, blindex-synthetic) · Wi-Fi, Vestuario, Gimnasio, Estacionamiento, Ayuda Médica, Torneos, Cumpleaños, Parrilla, Escuelita deportiva, Bar / Restaurante, Quincho, Disposicion de paletas · Lun a Vie 07:00-01:00hs',
  valores = 'Desde $24.000 los 90 min'
  where nombre = 'Arena Padel Mendoza';

update public.canchas set
  descripcion = '5 canchas (0 techadas, 5 descubiertas, blindex-synthetic/synthetic) · Wi-Fi, Vestuario, Estacionamiento, Torneos, Cumpleaños, Parrilla, Escuelita deportiva, Bar / Restaurante, Quincho, Disposicion de paletas · Lun a Vie 08:00-23:30hs',
  valores = 'Desde $44.000 los 90 min'
  where nombre = 'Padel House';

update public.canchas set
  descripcion = '1 cancha (0 techadas, 1 descubiertas, blindex-synthetic) · Bar / Restaurante, Disposicion de paletas · Lun a Vie 08:30-22:00hs',
  valores = 'Desde $28.000 los 90 min'
  where nombre = 'Padel Mendoza Tenis';

update public.canchas set
  descripcion = '4 canchas (0 techadas, 4 descubiertas, blindex-synthetic) · Wi-Fi, Vestuario, Estacionamiento, Torneos, Cumpleaños, Escuelita deportiva · Lun a Vie 09:00-24:00hs',
  valores = 'Desde $28.000 los 90 min'
  where nombre = 'CANO PADEL';

update public.canchas set
  descripcion = '7 canchas (0 techadas, 7 descubiertas, blindex-synthetic) · Wi-Fi, Vestuario, Estacionamiento, Torneos, Cumpleaños, Escuelita deportiva, Bar / Restaurante, Disposicion de paletas · Lun a Vie 07:00-01:00hs',
  valores = 'Desde $40.000 los 90 min'
  where nombre = 'Canchas de Padel las cañas';

update public.canchas set
  descripcion = '3 canchas (0 techadas, 3 descubiertas, blindex-synthetic) · Estacionamiento, Torneos, Parrilla, Escuelita deportiva, Bar / Restaurante, Quincho · Lun a Vie 15:00-24:30hs',
  valores = 'Desde $32.000 los 90 min'
  where nombre = 'La Nave Padel';

update public.canchas set
  descripcion = '3 canchas (0 techadas, 3 descubiertas, blindex-synthetic) · Vestuario, Estacionamiento, Bar / Restaurante, Disposicion de paletas · Lun a Vie 09:30-24:30hs',
  valores = 'Desde $40.000 los 120 min'
  where nombre = 'Pádel Club Libertad';

update public.canchas set
  descripcion = '6 canchas (0 techadas, 6 descubiertas, blindex-synthetic) · Wi-Fi, Vestuario, Estacionamiento, Torneos, Parrilla, Escuelita deportiva, Bar / Restaurante, Quincho, Disposicion de paletas · Lun a Vie 08:00-24:30hs',
  valores = null
  where nombre = 'Punto de Oro Club de Padel';

update public.canchas set
  descripcion = '1 cancha (0 techadas, 1 descubiertas, blindex-synthetic) · Wi-Fi, Estacionamiento, Bar / Restaurante, Quincho, Disposicion de paletas · Lun a Vie 07:00-23:30hs',
  valores = 'Desde $25.000 los 90 min'
  where nombre = 'Bandera Center Padel';

update public.canchas set
  descripcion = '2 canchas (0 techadas, 2 descubiertas, synthetic-wall) · Vestuario, Gimnasio, Estacionamiento, Ayuda Médica, Torneos, Cumpleaños, Parrilla, Escuelita deportiva, Bar / Restaurante, Quincho, Disposicion de paletas · Lun a Vie 13:00-24:30hs',
  valores = 'Desde $30.000 los 120 min'
  where nombre = 'Padel Hípico Mendoza';

update public.canchas set
  descripcion = '4 canchas (0 techadas, 4 descubiertas, synthetic) · Wi-Fi, Vestuario, Estacionamiento, Ayuda Médica, Torneos, Cumpleaños, Parrilla, Escuelita deportiva, Colegios, Bar / Restaurante, Quincho, Disposicion de paletas · Lun a Vie 08:00-02:00hs',
  valores = 'Desde $28.000 los 90 min'
  where nombre = 'De Volea Padel';
