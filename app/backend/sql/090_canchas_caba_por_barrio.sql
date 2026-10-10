-- Canchas de CABA por barrio en vez de por comuna (2026-10-10, pedido del
-- usuario: en la Ciudad la gente sabe en qué barrio vive, no su número de
-- comuna). 088 y 089 las dejaron como "Comuna 10", "Comuna 11"... porque
-- georef devuelve la comuna. Las armó herramientas/canchas-caba/generar_sql.py
-- ubicando cada cancha por sus coordenadas dentro de los límites oficiales de
-- los barrios (datos abiertos de la Ciudad). El nombre del barrio es el mismo
-- que se elige en el perfil.
--
-- Se corre entero, una vez, en el SQL Editor de Supabase. 64 canchas.

with barrio(origen, id, zona) as (values
  ('atc_id', '180', 'Mataderos'),  -- Evolution Sport
  ('atc_id', '117', 'Mataderos'),  -- Kick FC
  ('atc_id', '1187', 'Villa Real'),  -- Chance Pádel
  ('atc_id', '182', 'Villa Real'),  -- GQG Vip
  ('atc_id', '1104', 'Villa Devoto'),  -- Devoto Pádel
  ('atc_id', '2078', 'Villa Devoto'),  -- Lama Padel
  ('atc_id', '2243', 'Monte Castro'),  -- Lasaigues Padel Devoto
  ('atc_id', '607', 'Monte Castro'),  -- Kuman Club Santo Tome
  ('atc_id', '1244', 'Monte Castro'),  -- Kuman Club Benito Juarez
  ('atc_id', '1344', 'Villa Urquiza'),  -- Padel Bricks
  ('atc_id', '1133', 'Villa Pueyrredón'),  -- Open
  ('atc_id', '636', 'Vélez Sarsfield'),  -- El Guardian Padel
  ('atc_id', '2263', 'Villa Urquiza'),  -- GyG Sports
  ('atc_id', '825', 'Villa del Parque'),  -- El Garage Padel
  ('atc_id', '2347', 'Villa Luro'),  -- Leopardi Sports
  ('atc_id', '1325', 'Villa Urquiza'),  -- Club Río de la Plata
  ('atc_id', '181', 'Villa Luro'),  -- El Mirador Padel
  ('atc_id', '866', 'Villa del Parque'),  -- El Predio Ciudad
  ('atc_id', '1148', 'Vélez Sarsfield'),  -- PDS (Sede Bolaños)
  ('atc_id', '1982', 'Vélez Sarsfield'),  -- Padel Ya
  ('atc_id', '1482', 'Villa Santa Rita'),  -- World Padel Center CABA
  ('atc_id', '46', 'Villa Urquiza'),  -- Las Palmeras
  ('atc_id', '1827', 'Villa Santa Rita'),  -- Lo de Juve
  ('atc_id', '652', 'Villa General Mitre'),  -- Rocket Padel Center
  ('atc_id', '1789', 'Villa Urquiza'),  -- Treina
  ('atc_id', '780', 'Villa General Mitre'),  -- El Predio Padel
  ('atc_id', '2476', 'Villa General Mitre'),  -- La casa rosada Padel
  ('atc_id', '2211', 'Caballito'),  -- El Garage Caballito
  ('atc_id', '397', 'Flores'),  -- Bequin
  ('atc_id', '571', 'Flores'),  -- Village Club
  ('atc_id', '782', 'Belgrano'),  -- Avant Club
  ('atc_id', '535', 'Colegiales'),  -- La Normanda Padel y Gym
  ('atc_id', '2509', 'Chacarita'),  -- Arena Padel
  ('atc_id', '103', 'Caballito'),  -- El Anden
  ('atc_id', '2273', 'Flores'),  -- Daom
  ('atc_id', '1646', 'Caballito'),  -- CPC - Centenario Padel club
  ('atc_id', '678', 'Colegiales'),  -- Cabildo Club
  ('atc_id', '2034', 'Palermo'),  -- Dumont Padel
  ('atc_id', '2494', 'Parque Chacabuco'),  -- Apache 32 Caballito
  ('atc_id', '2257', 'Parque Chacabuco'),  -- Club Centenera
  ('atc_id', '850', 'Belgrano'),  -- Babolat Padel Center
  ('atc_id', '1741', 'Parque Chacabuco'),  -- Lasaigues (Caballito)
  ('atc_id', '1932', 'Parque Chacabuco'),  -- Relax Centro Deportivo
  ('atc_id', '1101', 'Boedo'),  -- Muñiz Padel
  ('atc_id', '2147', 'Boedo'),  -- Polideportivo SPT
  ('atc_id', '259', 'Palermo'),  -- Costa Rica Gym y Tenis
  ('atc_id', '2364', 'Almagro'),  -- Alma
  ('atc_id', '2422', 'Almagro'),  -- Kristal Padel
  ('atc_id', '1516', 'Boedo'),  -- Araoz Pádel Parque Patricios
  ('atc_id', '2234', 'Parque Patricios'),  -- Life Padel
  ('atc_id', '2451', 'La Boca'),  -- El Predio La Boca
  ('atc_id', '1645', 'San Cristóbal'),  -- Distrito Pasco Padel
  ('atc_id', '1188', 'La Boca'),  -- Catalinas Padel
  ('atc_id', '1198', 'San Telmo'),  -- El Gallo Dorado
  ('atc_id', '1467', 'Montserrat'),  -- PadelBolivar
  ('atc_id', '192', 'Montserrat'),  -- Complejo Urquiza
  ('atc_id', '958', 'Palermo'),  -- Araoz Padel
  ('atc_id', '1773', 'Palermo'),  -- Distrito Padel
  ('atc_id', '148', 'Palermo'),  -- Padel Noble
  ('osm_id', 'node/4410664545', 'Belgrano'),  -- Halcry.com
  ('osm_id', 'node/12459833490', 'Agronomía'),  -- First Padel Center
  ('osm_id', 'way/471919216', 'Monte Castro'),  -- Stadium Paddle
  ('osm_id', 'way/1446293671', 'Puerto Madero'),  -- Padel Tour - Fernández Prieto
  ('osm_id', 'way/1510171659', 'Villa Urquiza')  -- Padel Le Bretón
)
update public.canchas c
set zona = b.zona
from barrio b
where c.provincia = 'ciudad_autonoma_de_buenos_aires'
  and ((b.origen = 'atc_id' and c.atc_id = b.id) or (b.origen = 'osm_id' and c.osm_id = b.id));

-- Para revisar: no debería quedar ninguna "Comuna".
select zona, count(*) as canchas
from public.canchas where provincia = 'ciudad_autonoma_de_buenos_aires'
group by zona order by count(*) desc, zona;
