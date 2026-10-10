-- Canchas de pádel de toda la Argentina, sacadas de atcsports.io
-- (2026-10-10, pedido del usuario: "entremos a ATC y busquemos todas las
-- canchas de Argentina así tenemos eso en la base actualizado"; mismo origen
-- que 051, que trajo solo Mendoza). Las juntó
-- herramientas/canchas-atc/juntar_canchas_atc.py: 593 clubes con pádel.
-- La provincia y el departamento (zona) salen de georef (datos.gob.ar) con las
-- coordenadas de cada club; el departamento "Capital" va como "Ciudad de
-- <provincia>", igual que en el perfil.
--
-- Qué hace (se corre entero, una vez, en el SQL Editor de Supabase):
--   1. Agrega a canchas el id de ATC y las coordenadas.
--   2. Las canchas que ya estaban (por ejemplo las de Mendoza de 011/051) se
--      reconocen por nombre parecido en la misma provincia: se les completa
--      el id de ATC y las coordenadas, sin tocar el resto (las reseñas
--      siguen colgadas de la misma fila).
--   3. Agrega las que faltan.
--   4. Borra las "Cancha Demo (dato de prueba)" de 015: los partidos demo que
--      las usaban pasan a una cancha real de Mendoza y sus reseñas se borran.
--   5. Los partidos demo diarios (065/067) eligen solo canchas de Mendoza,
--      porque los jugadores demo son de Mendoza.
--
-- Por provincia: buenos_aires 206, catamarca 5, chaco 11, chubut 1, ciudad_autonoma_de_buenos_aires 59, cordoba 73, corrientes 8, entre_rios 12, formosa 18, jujuy 11, la_pampa 11, mendoza 58, misiones 5, neuquen 14, rio_negro 9, salta 10, san_juan 15, san_luis 2, santa_fe 42, santiago_del_estero 8, tierra_del_fuego 1, tucuman 14.

-- 1) Columnas nuevas ---------------------------------------------------------
alter table public.canchas
  add column if not exists atc_id text unique,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Nombre comparable: minúsculas, sin tildes ni signos, sin la palabra pádel.
create or replace function pg_temp.nombre_comparable(t text) returns text
language sql immutable as $f$
  select trim(regexp_replace(regexp_replace(regexp_replace(
    translate(lower(coalesce(t, '')), 'áéíóúüñ', 'aeiouun'),
    '[^a-z0-9 ]', ' ', 'g'),
    '\m(padel|club|de|la|el|del)\M', ' ', 'g'),
    '\s+', ' ', 'g'))
$f$;

drop table if exists pg_temp.atc;
create temp table atc (
  atc_id text, nombre text, direccion text, zona text, provincia text, telefono text,
  lat double precision, lng double precision
);

insert into atc values
  ('1855', '12 de Junio', 'San Sebastián 1705', 'Esteban Echeverría', 'buenos_aires', '1130226001', -34.7317387, -58.5040268),
  ('1678', '3+1 Padel', 'CASEROS, Caporale &, B1748', 'General Rodríguez', 'buenos_aires', '1121932811', -34.6070212, -58.9310399),
  ('516', '360 padel', 'Solís 9565', 'General Pueyrredón', 'buenos_aires', '2233438644', -37.9993772, -57.5985603),
  ('913', 'Acapulco Padel', 'Guemes 980', 'Avellaneda', 'buenos_aires', '1127317754', -34.6647371, -58.3674882),
  ('1960', 'Aire Puro Club', 'Boulevard Santa Catalina 4', 'Lomas de Zamora', 'buenos_aires', '1171736263', -34.794868, -58.435596),
  ('2067', 'Aleph Sport', 'Reverendo Padre Fahy 1635', 'Moreno', 'buenos_aires', '1168352038', -34.649529, -58.8191745),
  ('847', 'Alsina Padel', 'Senador Jose Pallares 2258', 'Lanús', 'buenos_aires', '5491122366815', -34.6759017, -58.403996),
  ('2285', 'Apache 32 Padel Bella Vista', 'Av Leon Gallardo 111', 'San Miguel', 'buenos_aires', '+5491179055903', -34.553281, -58.698055),
  ('2023', 'Araoz Futbol Padel', 'Carlos Villate 400', 'Vicente López', 'buenos_aires', '1155862802', -34.5101039, -58.4766512),
  ('274', 'Area Chica', 'Cuyo 1925, B1640 Martínez, Provincia de Buenos Aires', 'San Isidro', 'buenos_aires', '5491130775286', -34.4944133, -58.5254758),
  ('1317', 'Arena Padel', 'Av Eva Perón 2264', 'Morón', 'buenos_aires', '+5491160113037', -34.673307, -58.6304947),
  ('1504', 'Arena Padel Barcala', 'Avenida Gaona 7243', 'Ituzaingó', 'buenos_aires', '+5491156516261', -34.6313649, -58.6662813),
  ('2453', 'Atletico Pádel y Tenis', 'RP8 & Jorge Manfredi', 'Pilar', 'buenos_aires', '541178216795', -34.4539457, -58.8881937),
  ('858', 'Attitude Sport Club', 'Av. Gral. Lemos 1415', 'Malvinas Argentinas', 'buenos_aires', '+5491122935893', -34.52603, -58.6922641),
  ('1933', 'Aura Pádel', 'Paraguay 320 Villa Martelli Vicente Lopez', 'Vicente López', 'buenos_aires', '1130080320', -34.5489252, -58.5069778),
  ('918', 'Avellaneda Padel Club', 'Av. Rivadavia 640', 'Avellaneda', 'buenos_aires', '1127331111', -34.668445, -58.388064),
  ('1070', 'Babolat Padel Center Remeros', 'Av Santa María de las conchas 4711', 'Tigre', 'buenos_aires', '1176138752', -34.4001946, -58.6215129),
  ('1156', 'Backyard Pilar', 'El Chingolo 869', 'Pilar', 'buenos_aires', '1139097477', -34.4498378, -58.9243993),
  ('831', 'Banfield Padel Club', 'Belgrano 1053', 'Lanús', 'buenos_aires', '5491162496153', -34.7351465, -58.3915739),
  ('2229', 'Bassa', 'Canal de Beagle 550', 'Pilar', 'buenos_aires', '+5491138835665', -34.465269, -58.9653165),
  ('648', 'Basticourt', 'Martín Miguens 7886, Villa Bosch', 'Tres de Febrero', 'buenos_aires', '1150440684', -34.5732401, -58.5897799),
  ('2046', 'BeJota', 'Catamarca 519', 'Azul', 'buenos_aires', '2281418620', -36.7678665, -59.8487324),
  ('477', 'Belgrano Padel', 'Belgrano 1063', 'La Matanza', 'buenos_aires', '+541168314113', -34.6438812, -58.5797225),
  ('1629', 'Bella Vista Paddle', 'Entre Ríos 851, Bella Vista, San Miguel', 'San Miguel', 'buenos_aires', '1149278222', -34.5650968, -58.6884629),
  ('1183', 'Bm Padel Center', 'Calle Falucho Entre Libertad y Av. de Los Lagos, Belén de Escobar', 'Escobar', 'buenos_aires', '+5491134815178', -34.3443788, -58.7520319),
  ('2271', 'Bosques Centro de Padel', 'Osorio 1481', 'Merlo', 'buenos_aires', '1138437668', -34.6552464, -58.7133409),
  ('570', 'Campus El Irlandés', 'Av. Bartolomé Mitre 1650, Béccar, Provincia de Buenos Aires', 'San Isidro', 'buenos_aires', '1133374680', -34.4564608, -58.5082968),
  ('2297', 'Canva Pádel', 'Bufano 6050', 'La Matanza', 'buenos_aires', '01157325436', -34.6998741, -58.5349357),
  ('2068', 'Casa Padel', 'Int. Quindimil 40', 'Lanús', 'buenos_aires', '+5491128170327', -34.6981232, -58.3925377),
  ('2086', 'Casablanca Padel', 'Urquiza 952', 'San Miguel', 'buenos_aires', '1165546712', -34.5433828, -58.7005333),
  ('1510', 'Central Padel Club Cafe', 'Puente del Inca 2450 Polo Industrial de Ezeiza', 'Ezeiza', 'buenos_aires', '1176041011', -34.8696981, -58.6138565),
  ('1430', 'Circulo Club de Padel', 'El Leñatero 1889', 'La Matanza', 'buenos_aires', '1123874915', -34.7317681, -58.5255215),
  ('602', 'Club 18D Fútbol y Padel', '18 de Diciembre 1953, entre Belgrano y Moreno. San Martín', 'General San Martín', 'buenos_aires', '1130064870', -34.5795796, -58.5385955),
  ('1685', 'Club Aera', 'Av. 25 de Mayo 1268, B1650 Villa Lynch, Provincia de Buenos Aires', 'General San Martín', 'buenos_aires', '1125210000', -34.58078, -58.52468),
  ('1841', 'Club Altos Bella Vista', 'Chaperrouge y Defensa', 'San Miguel', 'buenos_aires', '1122722664', -34.5837059, -58.7062236),
  ('1602', 'Club De Padel', 'Constitucion 658', 'San Miguel', 'buenos_aires', '1123442024', -34.5607712, -58.7132814),
  ('1764', 'Club Ferrocarril Mitre', 'Av Colectora Gral Paz 2702', 'General San Martín', 'buenos_aires', '1139070507', -34.5802561, -58.5161577),
  ('1905', 'Club Gimnasia y Esgrima de Ituzaingo', 'Niceto Vega 2298', 'Ituzaingó', 'buenos_aires', '1176081108', -34.6752598, -58.6672002),
  ('1667', 'Club Juventud Unida', '28 y 29', 'Punta Indio', 'buenos_aires', '2214342175', -35.3887991, -57.3366125),
  ('111', 'Club Melian', 'Av. Melian 7760, Martin Coronado', 'Tres de Febrero', 'buenos_aires', '1170751616', -34.586673, -58.6014333),
  ('2145', 'Club Social Deportivo y Cultural La Fraternidad San Martin', 'Lincoln 3136', 'General San Martín', 'buenos_aires', '1168856585', -34.5750173, -58.5300596),
  ('1668', 'Club Sportivo Escobar', 'CONSTITUCIÓN 118 (Padel - Básquet 3x3) - COLÓN 533 (Voley - Básquet 5x5) - Escobar', 'Escobar', 'buenos_aires', '+5491123364398', -34.355902, -58.791066),
  ('1917', 'Complejo DEPORTIVO y GASTRONÓMICO Leblón', 'Pellegrini 351', 'Almirante Brown', 'buenos_aires', '1141724399', -34.8308897, -58.3899517),
  ('1182', 'Complejo Filippo', 'Av Leon Gallardo 70', 'San Miguel', 'buenos_aires', '1144401713', -34.5526382, -58.6972072),
  ('2299', 'Complejo Las Malvinas', 'Aristobulo del Valle 1350', 'Brandsen', 'buenos_aires', '2223490296', -35.1852507, -58.2399091),
  ('2465', 'Complejo Rebote', 'San Ramon 2090', 'Tres de Febrero', 'buenos_aires', '+5491126499810', -34.585625, -58.5955967),
  ('1056', 'Complejo Solana', 'Las Tacuaras 2975', 'Ituzaingó', 'buenos_aires', '1138450094', -34.6259765, -58.7125065),
  ('879', 'Complejo Top Ten', 'Av Pellegrini 3657', 'Pergamino', 'buenos_aires', '2477652021', -33.9262937, -60.5937957),
  ('2396', 'Conecta Padel', 'Zapiola 52', 'Quilmes', 'buenos_aires', '+5491176117396', -34.7125055, -58.2760821),
  ('1425', 'Court Central Padel', 'Vicente López 263', 'Hipólito Yrigoyen', 'buenos_aires', '2314557126', -36.2921844, -61.7195307),
  ('2322', 'Drop pádel club', 'San Roque 961', 'Luján', 'buenos_aires', '2323331150', -34.559053, -59.1259254),
  ('2186', 'Duomo Lomas', 'Laureano Oliver 1685 entre Santander y Sucre', 'Lomas de Zamora', 'buenos_aires', '5491160008621', -34.7779813, -58.4204719),
  ('835', 'Efecto Padel', 'Av. Dr. Ricardo Balbín 5070, San Miguel, Provincia de Buenos Aires', 'San Miguel', 'buenos_aires', '1141646709', -34.5731763, -58.7437049),
  ('2426', 'El Cedro Padel', 'Tomas Godoy Cruz 1476', 'Lomas de Zamora', 'buenos_aires', '1160116848', -34.7349604, -58.4150627),
  ('2053', 'El Corralon FC', 'Semana de Mayo 1035', 'Moreno', 'buenos_aires', '1144455671', -34.6362421, -58.8578297),
  ('1985', 'El Galpon', 'Estanislao lopez 459', 'Pilar', 'buenos_aires', '1127334025', -34.454024, -58.9110217),
  ('1854', 'El Nuevo Pinar', 'Lomas Valentinas 634', 'Lanús', 'buenos_aires', '1128694444', -34.667317, -58.4132363),
  ('1139', 'El Parque Club de Padel', 'Hipolito Yrigoyen 13944', 'Almirante Brown', 'buenos_aires', '1167253668', -34.8159088, -58.3958269),
  ('1675', 'El Portal', 'Triunvirato 969', 'Quilmes', 'buenos_aires', '1123908326', -34.7385119, -58.263479),
  ('2143', 'El Potrero', 'Coronel aguilar 3508', 'Lanús', 'buenos_aires', '1161535832', -34.7353621, -58.375884),
  ('1298', 'Eleven Route', 'Ruta 11 e/ 641 y 642', 'La Plata', 'buenos_aires', '2215045757', -34.9510238, -57.8363478),
  ('1487', 'Espacio Vergara', 'Av. Valentín Vergara 5265', 'Berazategui', 'buenos_aires', '1123986034', -34.808055, -58.2052672),
  ('2054', 'Estación Futbol', 'Rosetti 6240', 'Tres de Febrero', 'buenos_aires', '1123466466', -34.6042991, -58.59653),
  ('1893', 'Exclusive Padel', 'Tropezon 1174', 'Tres de Febrero', 'buenos_aires', '1124731519', -34.5926014, -58.5602092),
  ('1787', 'Extremo Sur Padel', '659 y 26', 'La Plata', 'buenos_aires', '2215474082', -35.005338, -57.8695128),
  ('717', 'Flow Sports', 'Av. Gral. Juan G. Lemos 167', 'Malvinas Argentinas', 'buenos_aires', '+5491150510002', -34.5296125, -58.7014834),
  ('1215', 'Fultito', 'MARIANO MORENO 4 ROJAS (b)', 'Pergamino', 'buenos_aires', '2475555888', -33.8922729, -60.5629042),
  ('1476', 'Fun Padel Club', 'Los Alamos 803', 'Ezeiza', 'buenos_aires', '1138832524', -34.8745487, -58.5438834),
  ('1778', 'Fútbol class', 'Alberdi 326', 'Ezeiza', 'buenos_aires', '1128778268', -34.8959715, -58.5691336),
  ('1211', 'Gioco', 'Luis de Camoens 2017', 'Moreno', 'buenos_aires', '1151227439', -34.6159416, -58.834754),
  ('488', 'GM Sports', 'Calle 21 A 6480, B1880 Berazategui, Provincia de Buenos Aires', 'Berazategui', 'buenos_aires', '1150965362', -34.758659, -58.187264),
  ('1300', 'Go Padel', 'Sicilia 6514', 'General Pueyrredón', 'buenos_aires', '2233485660', -38.0361572, -57.5929627),
  ('2247', 'Goles y Gambetas Villa Tesei', 'Juan de Salazar 265', 'Hurlingham', 'buenos_aires', '1133315768', -34.6302451, -58.6290811),
  ('1727', 'Grizzly Padel y Futbol', 'El Zonda 1769', 'San Miguel', 'buenos_aires', '11535760691', -34.566524, -58.7413948),
  ('2080', 'Hangar', 'Honorio pueyrredon 1621', 'Pilar', 'buenos_aires', '5491141400227', -34.4395771, -58.8956328),
  ('789', 'Head Padel Club Hindu', 'Av. Angel T. de Alvear 400 (Ruta 202); Don Torcuato (Buenos Aires)', 'Tigre', 'buenos_aires', '1138335000', -34.4992085, -58.6433237),
  ('765', 'Head Padel Club San Isidro', 'Av. Bartolome Mitre 1650, San Isidro BSAS', 'San Isidro', 'buenos_aires', '1132924000', -34.4575012, -58.5111339),
  ('2250', 'Hipólito Pádel', 'Darwin 150, Villa Domínico', 'Avellaneda', 'buenos_aires', '1178956638', -34.6916554, -58.3301962),
  ('2435', 'Hotel Spa Secla', 'Avenida Cariboni 2275', 'Florencio Varela', 'buenos_aires', '1156336470', -34.8371998, -58.2602074),
  ('2092', 'Hoyo19', 'Aconcagua y Los Nogales', 'Junín', 'buenos_aires', '2364572562', -34.616028, -60.947139),
  ('2215', 'Impacto Padel', 'Av 25 entre 506 y 507', 'La Plata', 'buenos_aires', '2213551167', -34.8958443, -58.0163106),
  ('2231', 'Independiente de Junín', 'Carlos Washington Castro 1415', 'Junín', 'buenos_aires', '2364647145', -34.57347, -60.91956),
  ('2268', 'Juventud Unida Padel', 'Arevalo 1955, Caseros', 'Tres de Febrero', 'buenos_aires', '1168708795', -34.5990122, -58.5735182),
  ('2310', 'Kauri Club', 'Triunvirato 1572', 'La Matanza', 'buenos_aires', '1135071122', -34.6538727, -58.5777127),
  ('1751', 'Kb Padel Club', 'Reina Elena 2277, B1856 Glew, Provincia de Buenos Aires', 'Almirante Brown', 'buenos_aires', '1171518612', -34.8837248, -58.3824536),
  ('2099', 'Kiwi Padel', 'Alsina 1298', 'Tres Arroyos', 'buenos_aires', '542983415014', -38.3677774, -60.2894637),
  ('2167', 'La Bandeja', 'Libertad 4360', 'José C. Paz', 'buenos_aires', '1139253972', -34.5300141, -58.7490458),
  ('980', 'La bandeja Padel Center', 'Ruta 228 km 135', 'Tres Arroyos', 'buenos_aires', '2983457386', -38.3828865, -60.2425201),
  ('1541', 'La Birra Paddle', 'Valparaíso 604', 'Lanús', 'buenos_aires', '1156008352', -34.6684247, -58.4112549),
  ('1035', 'La Carmela Padel Club', 'Tucuman 3099', 'Lanús', 'buenos_aires', '20980639', -34.719125, -58.3675546),
  ('2135', 'La Catedral Padel', 'Ruta 3, kilómetro 67.300', 'Cañuelas', 'buenos_aires', '2226548827', -35.0647686, -58.7379667),
  ('1248', 'La Catedral Padel Y Futbol', 'Monseñor Bufano 2 A', 'La Matanza', 'buenos_aires', '1169783535', -34.6668547, -58.5981138),
  ('1486', 'La Cautiva Tenis y Padel', 'La Cautiva 7651', 'Tres de Febrero', 'buenos_aires', '1123965949', -34.5732105, -58.5865129),
  ('849', 'La Chimenea Pádel & Pickleball', 'Entre Ríos 642 - Avellaneda', 'Avellaneda', 'buenos_aires', '+541125872240', -34.6719871, -58.3903437),
  ('1334', 'La Fabrica Padel Club', 'Cervetti 563', 'Esteban Echeverría', 'buenos_aires', '1126670096', -34.8163167, -58.4871399),
  ('1767', 'La Fortaleza Padel', 'Tuyutí 565, B1824 Gerli, Provincia de Buenos Aires', 'Lanús', 'buenos_aires', '1141727465', -34.6903447, -58.3895764),
  ('2146', 'La Jungla', 'Caseros 421', 'Quilmes', 'buenos_aires', '1124910331', -34.7052257, -58.2703872),
  ('1116', 'La Meca Club de Amig@s', 'Autopista Buenos Aires La Plata km 9 (Shopping parque Avellaneda)', 'Avellaneda', 'buenos_aires', '1165077973', -34.6777439, -58.3328698),
  ('1869', 'La Meca Club de Amig@s - Quilmes', 'Av.calchaqui 700', 'Quilmes', 'buenos_aires', '1121909556', -34.7330323, -58.2957659),
  ('2004', 'La Nave', 'Ruta 3 y Roca', 'Azul', 'buenos_aires', '2281504876', -36.7958341, -59.845509),
  ('1661', 'La Ola Padel', 'Talcahuano 920', 'Tres Arroyos', 'buenos_aires', '2983382131', -38.3793586, -60.2961371),
  ('1492', 'La Paleta', 'Alsina 2761', 'Luján', 'buenos_aires', '2324467646', -34.5835635, -59.126522),
  ('2015', 'La Volea Padel', 'Neuquen 3030', 'General Pueyrredón', 'buenos_aires', '2234546214', -37.9993351, -57.5764674),
  ('2224', 'Laguna Point Padel', 'Ruta 205 46200 S/N, Rn205 46200', 'Ezeiza', 'buenos_aires', '+5491176606192', -34.9263861, -58.6110403),
  ('1930', 'Las Heras Sports', 'Las Heras 1512', 'Lomas de Zamora', 'buenos_aires', '1158407270', -34.74728, -58.4165),
  ('906', 'Las Lomitas Padel Club', 'José Pereyra Lucena 257', 'Lomas de Zamora', 'buenos_aires', '1156333333', -34.7543514, -58.3990771),
  ('1199', 'Las Marias Club de Padel', 'Av Espora 2198', 'Almirante Brown', 'buenos_aires', '1540788938', -34.81763, -58.3896686),
  ('997', 'Lasaigues Padel Canning', 'Mariano Castex 3173', 'Ezeiza', 'buenos_aires', '1160520467', -34.879977, -58.5043698),
  ('2487', 'Lasaigues Padel Leloir', 'De la Tradición 2042', 'Ituzaingó', 'buenos_aires', '+5491134352020', -34.6200176, -58.700596),
  ('1569', 'Lobosport', 'Alberdi 1310', 'San Miguel', 'buenos_aires', '+5491171748524', -34.5525964, -58.7013292),
  ('1347', 'Locura Padel', 'Ruau 44', 'Mar Chiquita', 'buenos_aires', '2236699442', -37.4510109, -57.728322),
  ('959', 'Los Vientos Racket Center', 'Sgto cabral 2506', 'Tigre', 'buenos_aires', '1133250052', -34.4984603, -58.6084855),
  ('2200', 'LQX sport', 'Av Monteverde 8191', 'Almirante Brown', 'buenos_aires', '1151647527', -34.818115, -58.3557403),
  ('2277', 'Mala Mia', 'Jerónimo Jaime', 'Lezama', 'buenos_aires', '2241576691', -35.8720788, -57.9061468),
  ('859', 'Marinas Golf', 'Av. Santa María y R. Carrillo (Ruta 27, Alt. 5200) Rincón De Milberg – Tigre – Bs.As', 'Tigre', 'buenos_aires', '1136851267', -34.404332, -58.6274684),
  ('2036', 'Master Sport', 'av belgrano y av 21', 'Berazategui', 'buenos_aires', '1170952101', -34.7901876, -58.2452746),
  ('1640', 'Match Point', 'Bedoya 7078, Isidro Casanova', 'La Matanza', 'buenos_aires', '1132198039', -34.7375958, -58.5657359),
  ('2097', 'Match Point Castelar', 'Tucumán 3000', 'Morón', 'buenos_aires', '1127142948', -34.6388482, -58.6484668),
  ('139', 'MegaFutbol San Justo', 'Rincon 2875', 'La Matanza', 'buenos_aires', '1131935211', -34.6720106, -58.5550089),
  ('1238', 'MG Padel Center', 'Vicente López 710', 'Esteban Echeverría', 'buenos_aires', '1166370606', -34.8218223, -58.4654742),
  ('2148', 'Mirazur Secla Padel', '29 de septiembre 2850 Remedios de escalada Lanus', 'Lanús', 'buenos_aires', '1138080454', -34.7180111, -58.3915062),
  ('680', 'Modena Pádel Center', 'Av mitre 1924, Avellaneda', 'Avellaneda', 'buenos_aires', '1130424219', -34.6692651, -58.3545238),
  ('2316', 'Mundo Fairplay Canning', 'Juan Gregorio Diaz 702', 'Ezeiza', 'buenos_aires', '541135142830', -34.8537943, -58.5064377),
  ('1715', 'Murciélago Padel', 'Muñoz 730', 'Ayacucho', 'buenos_aires', '2494352242', -37.145019, -58.4737464),
  ('2282', 'Nexo Pádel', 'Vergara 2', 'Alberti', 'buenos_aires', '2346602340', -35.0330891, -60.2754607),
  ('2255', 'NeXus Padel', 'Maipu 895, B6530 Carlos Casares, Provincia de Buenos Aires', 'Carlos Casares', 'buenos_aires', '2395416592', -35.611216, -61.370007),
  ('1040', 'Nexus Sports', 'Belgrano 975', 'Tandil', 'buenos_aires', '2494629093', -37.3269992, -59.1297513),
  ('1180', 'Nivel Uno', 'Juan Jose Paso 234 Moron', 'Morón', 'buenos_aires', '1150209778', -34.648894, -58.6101352),
  ('1669', 'NODO Club de pádel & Co', 'Av Jorge Newbery 695', 'Ramallo', 'buenos_aires', '3407522292', -33.4976595, -60.055472),
  ('1303', 'North Padel', 'Ruta Prov. 25 y colectora. Escobar Portal Shopping', 'Escobar', 'buenos_aires', '1127345562', -34.350378, -58.7982937),
  ('1861', 'Nova Padel Center', 'Ayacucho 2653', 'General San Martín', 'buenos_aires', '1131637481', -34.5687611, -58.5402969),
  ('1809', 'Nápoles', 'Av. Tte. Gral. Juan Domingo Perón 2267', 'Florencio Varela', 'buenos_aires', '1164012264', -34.8023381, -58.2498152),
  ('2412', 'ODpro Pádel Experience', 'Av René Favaloro s/n', 'Monte', 'buenos_aires', '1178928290', -35.4701591, -58.7873743),
  ('1155', 'Olivos Padel Club', 'Av. Olivos 86', 'Malvinas Argentinas', 'buenos_aires', '1123242891', -34.4873523, -58.6944738),
  ('1306', 'Origone Football Club', 'Saavedra 270', 'Junín', 'buenos_aires', null, -34.5067912, -60.8595502),
  ('1897', 'Padel "LP" zona Oeste', 'Padre Varvello 4427', 'Moreno', 'buenos_aires', '1149377499', -34.63565, -58.735262),
  ('2163', 'Padel +', 'Felipe Amoedo 1998 esquina Madame curie', 'Quilmes', 'buenos_aires', '1141928527', -34.7406424, -58.2761243),
  ('2039', 'Padel - Inn', 'Manuel Acevedo 47', 'Ituzaingó', 'buenos_aires', '01169726252', -34.6637209, -58.6932482),
  ('2003', 'Padel 740', 'Muñoz 2255', 'San Miguel', 'buenos_aires', '1173564673', -34.5343197, -58.7173245),
  ('2399', 'Padel AAC', 'Monseñor Piaggio 161', 'Avellaneda', 'buenos_aires', '1130023659', -34.6643253, -58.3651709),
  ('1902', 'Padel Bomberos Piedritas', 'Santa Cruz s/n', 'General Villegas', 'buenos_aires', '3388531990', -34.7718433, -62.9859805),
  ('1029', 'Padel Center', 'RN188 km 110, 2705 Rojas, Provincia de Buenos Aires', 'Rojas', 'buenos_aires', '2474564585', -34.2030059, -60.7182307),
  ('2397', 'Padel Korn La Cotona', 'Av. Hipólito Yrigoyen 28929', 'San Vicente', 'buenos_aires', '2224552816', -34.9667046, -58.3806674),
  ('2304', 'Padel Leiva', 'Leiva 1149', 'Luján', 'buenos_aires', '02323675547', -34.5737602, -59.0952712),
  ('998', 'Padel los amigos', 'Combate de los pozos 3653', 'José C. Paz', 'buenos_aires', '1136179717', -34.5369263, -58.763654),
  ('2238', 'Padel PAC', 'French 983', 'General Rodríguez', 'buenos_aires', '1162340000', -34.5998393, -58.9394704),
  ('862', 'Padel Park', 'Guillermo White 4400', 'Vicente López', 'buenos_aires', '1151139103', -34.5144931, -58.5267921),
  ('729', 'Padel Plaza', 'Arenales 126 Chascomús', 'Chascomús', 'buenos_aires', '2241575641', -35.5761883, -58.0119903),
  ('2493', 'Padel Portugal', 'Leonidas 1 numero 672', 'Pilar', 'buenos_aires', '1144443163', -34.4896405, -58.8521343),
  ('1817', 'Padel Total Tres Arroyos', 'Ruta 3 km 490', 'Tres Arroyos', 'buenos_aires', '2983534907', -38.368575, -60.2962724),
  ('1114', 'Padel unido', 'Avenida Roca 1115', 'Avellaneda', 'buenos_aires', '1125585744', -34.661492, -58.3569524),
  ('2265', 'PadelHaus', '11 de Noviembre 1055', 'Merlo', 'buenos_aires', '1159633333', -34.68162, -58.69703),
  ('1495', 'Parador 3 Club de Padel', 'Entre Rios 2649', 'La Matanza', 'buenos_aires', '541163322222', -34.6732282, -58.5644613),
  ('1748', 'Passing Club', 'Santiago del Estero 4665', 'La Costa', 'buenos_aires', '2257614675', -36.6644823, -56.6858936),
  ('2462', 'Pecan Campo Deportivo', 'La Crujia 5099', 'General San Martín', 'buenos_aires', '1128374012', -34.5784739, -58.5576074),
  ('1613', 'PFC Padel', 'Santa Fe 51', 'Bragado', 'buenos_aires', '1134118728', -34.9010591, -60.7573729),
  ('1804', 'PicaPadel', 'Arturo Boote 1090', 'Escobar', 'buenos_aires', '1141961090', -34.3279556, -58.8576678),
  ('1454', 'Picky Baires', 'General San Martin 406 Vicente López', 'Vicente López', 'buenos_aires', '1172810049', -34.5188108, -58.4723332),
  ('796', 'Pico Deportes', 'Colectora Sur J. C. Pugliese 2256, B7000 Tandil, Provincia de Buenos Aires, Argentina', 'Tandil', 'buenos_aires', '2494606790', -37.3006166, -59.1285868),
  ('1062', 'Pilar Padel Center', 'Sgto belieras 1900/ 1901', 'Pilar', 'buenos_aires', '1124565765', -34.4495794, -58.8685927),
  ('1720', 'PPF arena R21', 'Avenida Otero 522 esquina Bella Vista, Pontevedra, Merlo, Buenos Aires', 'Merlo', 'buenos_aires', '1123643324', -34.7221272, -58.7180947),
  ('2405', 'Proyecto Padel', 'Av. Gral. José de San Martín 1235', 'Florencio Varela', 'buenos_aires', '1180264000', -34.7876448, -58.279214),
  ('2513', 'Pádel 360', 'Figueredo 640', 'La Matanza', 'buenos_aires', '1124808356', -34.7803325, -58.6376059),
  ('1758', 'Pádel LTC', 'Dr Real 550', 'Luján', 'buenos_aires', '1171079554', -34.5610165, -59.1123174),
  ('2427', 'Pádel Spot', 'Alberdi 2836 esquina Contreras', 'Florencio Varela', 'buenos_aires', '5492214541448', -34.8047766, -58.2729405),
  ('2375', 'Raices Pádel Club', 'Rawson 793, San Vicente', 'San Vicente', 'buenos_aires', '1171368197', -35.0328696, -58.429276),
  ('2445', 'Ranch Padel', 'Av benavidez 2400', 'Tigre', 'buenos_aires', '+5491162559555', -34.4091936, -58.695007),
  ('1032', 'Redfit Padel', 'Luis De Camoens 1435, La Reja, Moreno', 'Moreno', 'buenos_aires', '1158151975', -34.6201121, -58.8414215),
  ('1765', 'RedFit Pádel', 'Av. Victorica 1128', 'Moreno', 'buenos_aires', '1169604530', -34.6360727, -58.7924757),
  ('2062', 'Río Pádel Club', 'Sarmiento 119', 'Tigre', 'buenos_aires', '1150037565', -34.4179064, -58.5724993),
  ('993', 'Saavedra Padel Club', 'Saavedra 941', 'La Matanza', 'buenos_aires', '1123957166', -34.6493833, -58.5735501),
  ('2417', 'Saavedra Padel Club Ciudadela', 'Brandsen 4780', 'Tres de Febrero', 'buenos_aires', '1123957166', -34.6287338, -58.5619206),
  ('2368', 'Samaa Padel', 'Avenida Rivadavia 22834', 'Ituzaingó', 'buenos_aires', '1178999950', -34.6639004, -58.6815543),
  ('2355', 'San Marino Pádel', 'Felix Ballester 645', 'Tres de Febrero', 'buenos_aires', '01135800715', -34.6337971, -58.548674),
  ('77', 'San Remo', 'Av. Antártida Argentina 4328', 'General Pueyrredón', 'buenos_aires', '2236232944', -38.0511453, -57.6042),
  ('1679', 'SanFer Padel', 'Sarmiento y Escalada', 'San Fernando', 'buenos_aires', '1131640011', -34.4365546, -58.5543488),
  ('902', 'SET Padel House', 'Tribulato 540, San Miguel, Buenos Aires', 'San Miguel', 'buenos_aires', '1141644488', -34.5355318, -58.7081378),
  ('2363', 'Shark', 'Av. Gaona 1745', 'Moreno', 'buenos_aires', '1136623560', -34.6176646, -58.842414),
  ('1719', 'Smash Club de Padel', 'Ramón Carrillo 2568', 'General San Martín', 'buenos_aires', '+541151590910', -34.5721676, -58.5430608),
  ('2260', 'Sobrepadel', 'Estrada 2035', 'San Fernando', 'buenos_aires', '1124705568', -34.45506, -58.5516794),
  ('2386', 'Sportclub pádel', '11 de Septiembre 198', 'La Matanza', 'buenos_aires', '1136401607', -34.6514496, -58.5495181),
  ('1095', 'Tenis & Padel Point', 'De los Aromos 1071', 'Pinamar', 'buenos_aires', '02254401854', -37.1031306, -56.8500512),
  ('1513', 'Tennis Ranch Pinamar', 'Fragata victoria 4300', 'Pinamar', 'buenos_aires', '2267447859', -37.0819692, -56.8338338),
  ('1792', 'Tercer Tiempo Padel Club', 'Suipacha, Provincia de Buenos Aires', 'Suipacha', 'buenos_aires', '1157253931', -34.7720035, -59.6847924),
  ('2041', 'The Padel Club', 'Salvador Curutchet 2961', 'Morón', 'buenos_aires', '1169604530', -34.6339183, -58.6473599),
  ('1305', 'Tiger Padel', 'Av Gaona 10502', 'Moreno', 'buenos_aires', '1136747275', -34.6211588, -58.8328997),
  ('2241', 'Tiger Padel Lanús', 'Dr. A Melo 1545', 'Lanús', 'buenos_aires', '1123978661', -34.6965428, -58.3926377),
  ('1250', 'Top Padel - Tortuguitas Point Club', 'Av. Patricias Argentinas 3155', 'Escobar', 'buenos_aires', '01136185805', -34.432325, -58.7551833),
  ('1210', 'Torcuadel', 'Chile 1920 - Don Torcuato', 'Tigre', 'buenos_aires', '1132150264', -34.4935502, -58.6266829),
  ('2353', 'Towers Padel', 'Donovan 1845', 'La Matanza', 'buenos_aires', '1163982849', -34.7060395, -58.5038985),
  ('895', 'Universitario Pádel Tenis', '501 e 14 y 15, B1897 Gonnet', 'La Plata', 'buenos_aires', '2216809751', -34.8759704, -58.0119528),
  ('2455', 'Uruguay Sportscenter', 'Uruguay 3250', 'San Isidro', 'buenos_aires', '541122396952', -34.4665506, -58.5560912),
  ('743', 'Vairo Padel Center', 'Av. Agustín M. García 8852, B1621 Benavidez, Provincia de Buenos Aires', 'Tigre', 'buenos_aires', '+5491159354473', -34.3966065, -58.6586743),
  ('2140', 'Vairo Pádel Center Benavidez', 'Colectora este panamericana 40179', 'Tigre', 'buenos_aires', '1138208861', -34.4092469, -58.728185),
  ('2098', 'Vic Padel', 'Calle 527 3647', 'Berazategui', 'buenos_aires', '1138060854', -34.9035703, -58.1853937),
  ('2414', 'Vichoca Padel Club', 'Doctor Canepa 1629', 'Tres de Febrero', 'buenos_aires', '1132526038', -34.5959985, -58.5475204),
  ('646', 'Vilanova Padel', 'Cacique Coliqueo 1041', 'Morón', 'buenos_aires', '1160522655', -34.6322348, -58.5833449),
  ('689', 'Vixen Club', 'Las Azucenas 3941, Del Viso', 'Pilar', 'buenos_aires', '1137730713', -34.4301856, -58.794952),
  ('2447', 'Wilde Padel Club', 'Patagones 946', 'Avellaneda', 'buenos_aires', '1165740011', -34.6879753, -58.3173237),
  ('1842', 'World Padel Center Pilar', 'Calle Caamaño y Verdi', 'Pilar', 'buenos_aires', '1124542893', -34.4287257, -58.8354024),
  ('1559', 'World Pádel Center Campana', 'Antartida Argentina 140', 'Campana', 'buenos_aires', '3487664137', -34.1906775, -58.946696),
  ('672', 'WPC Nordelta', 'Av. de los Colegios 160', 'Tigre', 'buenos_aires', '1151415391', -34.425906, -58.659038),
  ('1658', 'X3 Premier Padel', 'Lorenzo Bonino 595', 'Alberti', 'buenos_aires', '2346330026', -35.0448785, -60.28941),
  ('911', 'Z Club Luján', 'Victoria y General Savio', 'Luján', 'buenos_aires', '2323660961', -34.5975256, -59.1119676),
  ('2356', 'Zeta Club Regatas', 'Luis Gogna 504', 'Luján', 'buenos_aires', '2323293934', -34.5596315, -59.1229628),
  ('2214', 'Álamos Padel Club', 'Leopoldo Lugones entre calle Del Pilar, barrio Los Álamos 2', 'Luján', 'buenos_aires', '2323331831', -34.5452832, -59.0904875),
  ('2115', 'Il Padel', 'Adán Quiroga 782', 'Ciudad de Catamarca', 'catamarca', '3834607804', -28.47106, -65.7950129),
  ('2109', 'Imperio Complejo Deportivo', 'Av Rodolfo Moran s/n - Chaquiago Sur', 'Andalgalá', 'catamarca', '3835691710', -27.5711066, -66.3214997),
  ('2267', 'Mamy Club', 'Ruta Provincial 46 km 132', 'Andalgalá', 'catamarca', '3835160098', -27.5823937, -66.3148776),
  ('2151', 'New Face', 'Av. Ocampo y Av. Camino a Ojo de Agua', 'Ciudad de Catamarca', 'catamarca', '3834406990', -28.471208, -65.8096116),
  ('1868', 'Nieva Club', 'Avenida Calchaqui n°544', 'Belén', 'catamarca', '03835590027', -27.652992, -67.030758),
  ('753', 'Alea Padel', 'Av. 25 de Mayo 3355, Fontana - Chaco', 'San Fernando', 'chaco', '3624115355', -27.4225571, -59.0179324),
  ('2105', 'Canchas San Jose', 'Almirante Brown 1445', 'San Fernando', 'chaco', '3624555936', -27.4606455, -58.9718859),
  ('2087', 'CF Padel', 'Av Sarmiento 1420', 'San Fernando', 'chaco', '3624125517', -27.4396915, -58.9735522),
  ('887', 'Complejo Don Layo', 'San Martin 1200', 'General Güemes', 'chaco', '3644118092', -25.8843859, -60.6291205),
  ('1704', 'Complejo Gral. San Martín', 'Alte. Brown y Junin', 'O''Higgins', 'chaco', '3735560412', -27.2903836, -60.7057076),
  ('1734', 'El Patio Padel', 'Salta Prolong. CH 14 PC 2', 'General Güemes', 'chaco', '3644674918', -25.9326317, -60.6253444),
  ('1884', 'Fabril Padel', 'Avenida 9 De Julio 2874', 'San Fernando', 'chaco', '3624383082', -27.4744679, -58.9610281),
  ('1866', 'Las Naves Padel Club', 'Av. Juan Manuel de Rosas 3150', 'San Fernando', 'chaco', '3625187523', -27.404871, -58.9778279),
  ('1690', 'Making Padel', 'Jose Hernandez 565', 'San Fernando', 'chaco', '3624926153', -27.4520615, -58.9755716),
  ('2331', 'Punto Norte', 'Ruta Nicolas Avellaneda km 13,4', 'San Fernando', 'chaco', '3624358231', -27.4162332, -58.9630591),
  ('1088', 'Tridente Padel Club', 'Avenida brown 268', 'Libertador General San Martín', 'chaco', '3624357382', -26.5441047, -59.3440798),
  ('1631', 'Impulso complejo deportivo', 'Ingeniero Pigretti 252', 'Futaleufú', 'chubut', '2945636376', -42.9095281, -71.3143117),
  ('2364', 'Alma', 'Mexico 3526', 'Comuna 5', 'ciudad_autonoma_de_buenos_aires', '1171587352', -34.6196893, -58.4156919),
  ('2494', 'Apache 32 Caballito', 'Cachimayo 953, C1424ARE Cdad. Autónoma de Buenos Aires', 'Comuna 7', 'ciudad_autonoma_de_buenos_aires', '1132361490', -34.6314265, -58.4401851),
  ('958', 'Araoz Padel', 'Araoz 2456', 'Comuna 14', 'ciudad_autonoma_de_buenos_aires', '+5491168743419', -34.5843772, -58.4163247),
  ('1516', 'Araoz Pádel Parque Patricios', 'Av. Chiclana 3346', 'Comuna 5', 'ciudad_autonoma_de_buenos_aires', '1168762821', -34.6349511, -58.4117025),
  ('2509', 'Arena Padel', 'Dorrego 681', 'Comuna 15', 'ciudad_autonoma_de_buenos_aires', '1124795791', -34.5927746, -58.4488128),
  ('782', 'Avant Club', 'Cabildo 2160', 'Comuna 13', 'ciudad_autonoma_de_buenos_aires', '1131260677', -34.5614421, -58.4576679),
  ('850', 'Babolat Padel Center', 'Av figueroa alcorta 7101 (Club CASA)', 'Comuna 13', 'ciudad_autonoma_de_buenos_aires', '+5491138002326', -34.546476, -58.4430541),
  ('397', 'Bequin', 'Granaderos 475 CABA', 'Comuna 7', 'ciudad_autonoma_de_buenos_aires', '1125633253', -34.6220964, -58.4615562),
  ('678', 'Cabildo Club', 'Av Cabildo 450', 'Comuna 13', 'ciudad_autonoma_de_buenos_aires', '1166288212', -34.571931, -58.4414217),
  ('1188', 'Catalinas Padel', 'Azopardo 1560', 'Comuna 4', 'ciudad_autonoma_de_buenos_aires', '1171749001', -34.6260633, -58.3663043),
  ('1187', 'Chance Pádel', 'Simbron 5449', 'Comuna 10', 'ciudad_autonoma_de_buenos_aires', '46399978', -34.6175113, -58.5237637),
  ('2257', 'Club Centenera', 'Av. Del Barco Centenera 951', 'Comuna 7', 'ciudad_autonoma_de_buenos_aires', '1538171011', -34.6305794, -58.438463),
  ('1325', 'Club Río de la Plata', 'Ibera 5257', 'Comuna 12', 'ciudad_autonoma_de_buenos_aires', '1137602534', -34.5677018, -58.4925309),
  ('192', 'Complejo Urquiza', 'Piedras 150, Monserrat, CABA', 'Comuna 1', 'ciudad_autonoma_de_buenos_aires', '1168068226', -34.610029, -58.377609),
  ('259', 'Costa Rica Gym y Tenis', 'Costa Rica 4863', 'Comuna 14', 'ciudad_autonoma_de_buenos_aires', '1155142196', -34.587001, -58.428656),
  ('1646', 'CPC - Centenario Padel club', 'Av Diaz Velez 5262', 'Comuna 6', 'ciudad_autonoma_de_buenos_aires', '1132302486', -34.6088753, -58.4408941),
  ('2273', 'Daom', 'Avenida Varela 1802', 'Comuna 7', 'ciudad_autonoma_de_buenos_aires', '1161876507', -34.6470098, -58.4488279),
  ('1104', 'Devoto Pádel', 'Griveo 4165', 'Comuna 11', 'ciudad_autonoma_de_buenos_aires', '1149924748', -34.5938207, -58.5197598),
  ('1773', 'Distrito Padel', 'Avenida Sarmiento 4270', 'Comuna 14', 'ciudad_autonoma_de_buenos_aires', '+5491126292303', -34.5666714, -58.4057118),
  ('1645', 'Distrito Pasco Padel', 'Cochabamba 2258, C1225 Cdad. Autónoma de Buenos Aires', 'Comuna 3', 'ciudad_autonoma_de_buenos_aires', '1126381642', -34.6242826, -58.3968676),
  ('2034', 'Dumont Padel', 'Santos Dumont 2664, Palermo', 'Comuna 14', 'ciudad_autonoma_de_buenos_aires', '1125725030', -34.5755797, -58.4404536),
  ('103', 'El Anden', 'Yerbal 1201', 'Comuna 6', 'ciudad_autonoma_de_buenos_aires', '1171821201', -34.6214966, -58.4475765),
  ('1198', 'El Gallo Dorado', 'Chacabuco 1260', 'Comuna 1', 'ciudad_autonoma_de_buenos_aires', '1133918494', -34.6229223, -58.3754439),
  ('2211', 'El Garage Caballito', 'Sor Juana ines de la cruz 1380', 'Comuna 6', 'ciudad_autonoma_de_buenos_aires', '1137717643', -34.6107282, -58.4602372),
  ('825', 'El Garage Padel', 'Marcos Sastre 3152, CABA', 'Comuna 11', 'ciudad_autonoma_de_buenos_aires', '1121601385', -34.6000681, -58.490491),
  ('636', 'El Guardian Padel', 'Carrasco 825, Floresta, CABA', 'Comuna 10', 'ciudad_autonoma_de_buenos_aires', '1169740825', -34.6283735, -58.4960245),
  ('181', 'El Mirador Padel', 'Av. Rivadavia 9222 Villa Luro', 'Comuna 10', 'ciudad_autonoma_de_buenos_aires', '1130238518', -34.6368298, -58.4939746),
  ('866', 'El Predio Ciudad', 'Arregui 2540', 'Comuna 11', 'ciudad_autonoma_de_buenos_aires', '1178380604', -34.6026065, -58.4815315),
  ('2451', 'El Predio La Boca', 'Wenceslao Villafañe 1161', 'Comuna 4', 'ciudad_autonoma_de_buenos_aires', '1178380604', -34.6344237, -58.3692332),
  ('780', 'El Predio Padel', 'Boyaca 1766', 'Comuna 11', 'ciudad_autonoma_de_buenos_aires', '11625272560', -34.6099464, -58.46936),
  ('180', 'Evolution Sport', 'Av. Cnel Cardenas 2681', 'Comuna 9', 'ciudad_autonoma_de_buenos_aires', '1158426045', -34.6671112, -58.5020451),
  ('182', 'GQG Vip', 'Irigoyen 2050, Buenos Aires', 'Comuna 10', 'ciudad_autonoma_de_buenos_aires', '46417215', -34.621751, -58.5243639),
  ('2263', 'GyG Sports', 'Av. Olazabal 5654', 'Comuna 12', 'ciudad_autonoma_de_buenos_aires', '1156605123', -34.5803307, -58.4925937),
  ('117', 'Kick FC', 'Saladillo 2051, Buenos Aires', 'Comuna 9', 'ciudad_autonoma_de_buenos_aires', '1128299801', -34.6619594, -58.5162286),
  ('2422', 'Kristal Padel', 'Maza 631', 'Comuna 5', 'ciudad_autonoma_de_buenos_aires', '01156399884', -34.6188372, -58.4158139),
  ('1244', 'Kuman Club Benito Juarez', 'Benito Juarez 2654, Monte Castro, CABA', 'Comuna 10', 'ciudad_autonoma_de_buenos_aires', '1154782654', -34.6166954, -58.5084372),
  ('607', 'Kuman Club Santo Tome', 'Santo Tome 4769, Monte Castro, CABA', 'Comuna 10', 'ciudad_autonoma_de_buenos_aires', '1134901540', -34.615114, -58.5092466),
  ('2476', 'La casa rosada Padel', 'Camarones 1555', 'Comuna 11', 'ciudad_autonoma_de_buenos_aires', '5491167665478', -34.6040026, -58.463535),
  ('535', 'La Normanda Padel y Gym', 'Delgado 864', 'Comuna 13', 'ciudad_autonoma_de_buenos_aires', '116167557', -34.578558, -58.453421),
  ('2078', 'Lama Padel', 'Desaguadero 3180, Villa devoto', 'Comuna 11', 'ciudad_autonoma_de_buenos_aires', '1144303472', -34.6124689, -58.5151739),
  ('46', 'Las Palmeras', 'E. Holmberg 3430', 'Comuna 12', 'ciudad_autonoma_de_buenos_aires', '1124946877', -34.560514, -58.483694),
  ('1741', 'Lasaigues (Caballito)', 'Tejedor 244', 'Comuna 7', 'ciudad_autonoma_de_buenos_aires', '1134709279', -34.6300358, -58.4296322),
  ('2243', 'Lasaigues Padel Devoto', 'Arregui 5138', 'Comuna 10', 'ciudad_autonoma_de_buenos_aires', '1131755782', -34.6207977, -58.5115804),
  ('2347', 'Leopardi Sports', 'Cajaravilla 4980', 'Comuna 10', 'ciudad_autonoma_de_buenos_aires', '1130084980', -34.6408355, -58.4968371),
  ('2234', 'Life Padel', 'Zavaleta 155, C1437 Cdad. Autónoma de Buenos Aires', 'Comuna 4', 'ciudad_autonoma_de_buenos_aires', '1124854305', -34.6386424, -58.4034909),
  ('1827', 'Lo de Juve', 'Luis Viale 2956', 'Comuna 11', 'ciudad_autonoma_de_buenos_aires', '1170619749', -34.6197582, -58.4756745),
  ('1101', 'Muñiz Padel', 'Muñiz 1253', 'Comuna 5', 'ciudad_autonoma_de_buenos_aires', '1141450021', -34.6285179, -58.4252466),
  ('1133', 'Open', 'Bolivia 5202', 'Comuna 12', 'ciudad_autonoma_de_buenos_aires', '+5491162236309', -34.5799761, -58.5026976),
  ('1344', 'Padel Bricks', 'Av. de los Constituyentes 6153', 'Comuna 12', 'ciudad_autonoma_de_buenos_aires', '+5491136093214', -34.5707933, -58.5070522),
  ('148', 'Padel Noble', 'Julio Argentino Noble 4100', 'Comuna 14', 'ciudad_autonoma_de_buenos_aires', '1158211410', -34.5607317, -58.4223436),
  ('1982', 'Padel Ya', 'Av Rivadavia 8511', 'Comuna 10', 'ciudad_autonoma_de_buenos_aires', '1171005160', -34.6340309, -58.4833867),
  ('1467', 'PadelBolivar', 'Bolivar 651', 'Comuna 1', 'ciudad_autonoma_de_buenos_aires', '1159436273', -34.6152661, -58.3734547),
  ('1148', 'PDS (Sede Bolaños)', 'Bolaños 167, C1407', 'Comuna 10', 'ciudad_autonoma_de_buenos_aires', '1158205252', -34.6368093, -58.4844955),
  ('2147', 'Polideportivo SPT', 'Quintino Bocayuva 1274', 'Comuna 5', 'ciudad_autonoma_de_buenos_aires', '1167223426', -34.6233099, -58.4220112),
  ('1932', 'Relax Centro Deportivo', 'Avenida La Plata 1711', 'Comuna 7', 'ciudad_autonoma_de_buenos_aires', '1136743398', -34.6350324, -58.4249181),
  ('652', 'Rocket Padel Center', 'Alejandro Magariños Cervantes 2455', 'Comuna 11', 'ciudad_autonoma_de_buenos_aires', '1133422962', -34.610125, -58.4739052),
  ('1789', 'Treina', 'Donado 2244', 'Comuna 12', 'ciudad_autonoma_de_buenos_aires', '1146737216', -34.5716354, -58.4762487),
  ('571', 'Village Club', 'Tandil 2650', 'Comuna 7', 'ciudad_autonoma_de_buenos_aires', '1130591721', -34.6359039, -58.4636326),
  ('1482', 'World Padel Center CABA', 'Belaustegui 3041', 'Comuna 11', 'ciudad_autonoma_de_buenos_aires', '1123340784', -34.6167096, -58.4792474),
  ('2360', 'Area93', 'General Paz 1990', 'Ciudad de Corrientes', 'corrientes', '3794001828', -27.4795654, -58.826016),
  ('1009', 'Arena 3 pádel', 'Av. Raúl Alfonsín 4470', 'Ciudad de Corrientes', 'corrientes', '3794891600', -27.475223, -58.795847),
  ('2013', 'Los Tilos Padel', 'RP5 Km 1.7, W3400 Corrientes', 'Ciudad de Corrientes', 'corrientes', '3795075007', -27.4909861, -58.7525922),
  ('1997', 'Maravive', 'Gervasio Blanco 237', 'General Paz', 'corrientes', '3781400427', -27.750862, -57.6190622),
  ('2369', 'Match Point Padel Club', 'Moreno 500', 'Mburucuyá', 'corrientes', '3782522225', -28.0408173, -58.2288582),
  ('1277', 'Padel Procaacati', 'Itati 88', 'General Paz', 'corrientes', '3781441002', -27.7545314, -57.622893),
  ('1291', 'San José SRL', 'Industria 1320', 'Bella Vista', 'corrientes', '3777308125', -28.509526, -59.03222),
  ('1664', 'Star Padel Santa Rosa', 'Av. Independencia 300', 'Concepción', 'corrientes', '3794386524', -28.2703483, -58.1275379),
  ('2437', '40/30 Pádel Club', 'Pasaje Público 457', 'Tercero Arriba', 'cordoba', '543534405524', -32.4271587, -63.733553),
  ('1292', '5ta proo', 'Montevideo 2359', 'Ciudad de Córdoba', 'cordoba', '3512461116', -31.4140198, -64.2166783),
  ('1846', '6-0 6-0 Padel Club', 'Haedo 1131', 'Ciudad de Córdoba', 'cordoba', '3518183506', -31.4218873, -64.2149216),
  ('953', 'A 3 set Pádel Club', 'Diag. Pedro Bruno 381', 'Río Segundo', 'cordoba', '+543537323605', -32.0163324, -62.9242054),
  ('1909', 'Apex Pro', 'Enrique Muiño 128', 'Ciudad de Córdoba', 'cordoba', '3518842233', -31.3694493, -64.1670585),
  ('647', 'Arena Padel', 'Av. San Martín 4980', 'Colón', 'cordoba', '3543570619', -31.1670969, -64.3207674),
  ('2288', 'ArenaMM', 'Ruta provincial numero 11', 'Unión', 'cordoba', '3468546202', -33.2058729, -62.6164512),
  ('741', 'Aton Multiespacio', 'Madre Sacramento 1535 Cordoba', 'Ciudad de Córdoba', 'cordoba', '3517635119', -31.4797312, -64.173746),
  ('411', 'Botánico Pádel', 'Av Chancay 700', 'Ciudad de Córdoba', 'cordoba', '5493518608290', -31.386753, -64.25106),
  ('199', 'Canchas Rivera', 'Av. Bodereau 7783', 'Ciudad de Córdoba', 'cordoba', '3512086085', -31.332273, -64.28828),
  ('1230', 'Chateau Padel', 'Cárcano, Av. del Piamonte casi, 5000 Córdoba', 'Ciudad de Córdoba', 'cordoba', '3518732074', -31.37701, -64.2530537),
  ('2019', 'Chester pádel club', 'Los patricios 327', 'Presidente Roque Sáenz Peña', 'cordoba', '3385461697', -34.1307986, -63.3853964),
  ('2027', 'Club Atletico San Martin', 'Almirante Brown 507', 'Marcos Juárez', 'cordoba', '3467434871', -32.9216099, -62.4578141),
  ('1041', 'Club De Padel Punto De Oro', 'San Juan 1064', 'Unión', 'cordoba', '3468544954', -33.199898, -62.609157),
  ('961', 'Club Del Sur', 'Loteo San Severino', 'Río Segundo', 'cordoba', '+5493572677080', -31.9330246, -63.68298),
  ('1197', 'Complejo Cruz Roja', 'Av Cruz Roja 1350', 'Ciudad de Córdoba', 'cordoba', '3512123252', -31.440188, -64.1696609),
  ('530', 'Complejo Deportivo Pádel Box', 'Av. De circunvalación Agustín tosco 630', 'Ciudad de Córdoba', 'cordoba', '3516678845', -31.4644977, -64.2100886),
  ('2168', 'Complejo Deportivo Teniente Origone', 'Avenida Vanderhoeven N°1397', 'Unión', 'cordoba', '03537471400', -32.8792297, -62.6876093),
  ('925', 'Complejo Lomas Sports', 'Molino de Torres 6710', 'Ciudad de Córdoba', 'cordoba', '3513899999', -31.3478289, -64.2985058),
  ('470', 'Complejo Olibert', 'Av. Sagrada Familia 1084, X5000 Córdoba', 'Ciudad de Córdoba', 'cordoba', '3513255869', -31.388332, -64.229049),
  ('2488', 'Costa Sport Club', 'Av. José María Eguía Zanón 9630', 'Ciudad de Córdoba', 'cordoba', '3514038414', -31.3368902, -64.2989304),
  ('946', 'Costanera Padel', 'Independencia 34', 'Juárez Celman', 'cordoba', '3584405124', -33.415808, -63.305857),
  ('1568', 'Distrito Social', 'Docta, Lote 1 Manzana 46', 'Santa María', 'cordoba', '3513414241', -31.4699391, -64.3103003),
  ('791', 'El Quincho Padel', 'Mariano Moreno 100, Hernando, Cordoba', 'Tercero Arriba', 'cordoba', '3534444787', -32.4252867, -63.7228162),
  ('1194', 'Elclub', 'Blvd Corredor Verde S/N , Manantiales ll', 'Ciudad de Córdoba', 'cordoba', '3516510052', -31.4810711, -64.2697779),
  ('2118', 'Espacio Coloccini', 'Ruta c45', 'Santa María', 'cordoba', '3547347233', -31.6567416, -64.40125),
  ('2440', 'Estacion Arguello', 'Raul Rina 8451', 'Ciudad de Córdoba', 'cordoba', '3518691711', -31.3408422, -64.2799201),
  ('1218', 'Estanzuela Villadeportiva', 'Jorge Luis Borges 400', 'Colón', 'cordoba', '3513696497', -31.3628379, -64.3386483),
  ('772', 'Estatus Pádel y Bar', 'Ruta E53, km19, Rio Ceballos', 'Colón', 'cordoba', '+5493513129378', -31.1918457, -64.2873299),
  ('1275', 'Etruria Padel', 'Eliseo Soria 760', 'General San Martín', 'cordoba', '3534175682', -32.9410322, -63.2520091),
  ('1030', 'Gama padel club', 'Nelso Chiaretta 1532', 'Unión', 'cordoba', '3537663078', -32.8888695, -62.6902665),
  ('860', 'Garden Arena', 'Rene Bracamonte 6155', 'Ciudad de Córdoba', 'cordoba', '3512565757', -31.3431983, -64.2483075),
  ('2094', 'Gringos', 'Magnasco 250', 'Tercero Arriba', 'cordoba', '5493571344000', -32.1741578, -64.1068605),
  ('591', 'Hiper Fútbol', 'Intendente Poretti esquina Arenales', 'General San Martín', 'cordoba', '3534783044', -32.38961, -63.2388717),
  ('2189', 'Inaudi Pádel', 'Jorge Ordoñez 246', 'Ciudad de Córdoba', 'cordoba', '3513888151', -31.472378, -64.1986932),
  ('1144', 'Jardin Padel', 'Celso Barrios 2261', 'Ciudad de Córdoba', 'cordoba', '3516623136', -31.4583182, -64.1658176),
  ('2367', 'La Arbolada Padel', 'Colectora, Rodríguez Peña 20, Malagueño, Córdoba', 'Ciudad de Córdoba', 'cordoba', '5493512306219', -31.4116922, -64.1972823),
  ('1266', 'La Gran 7 Celso Barrios', 'Celso Barrios 3100', 'Ciudad de Córdoba', 'cordoba', '3513656558', -31.4541462, -64.1556871),
  ('736', 'La Pecera Padel Club', '25 de Mayo 313, La Carlota, Córdoba', 'Juárez Celman', 'cordoba', '3584409588', -33.4235274, -63.2943396),
  ('1749', 'La Quinta', 'Julio argentino roca ( sin numeración)', 'General Roca', 'cordoba', '3385401648', -34.7864193, -63.7804271),
  ('786', 'La Recta Padel', 'Albert Sabin 6073', 'Ciudad de Córdoba', 'cordoba', '3517062907', -31.3467329, -64.2710769),
  ('2506', 'La Sede Club', 'Juan lafinur 3112', 'Ciudad de Córdoba', 'cordoba', '3517622767', -31.3882445, -64.2229717),
  ('2026', 'La Urbana', 'Albano M. de Laberge 6141', 'Ciudad de Córdoba', 'cordoba', '3518080304', -31.3535466, -64.2441951),
  ('2210', 'Las Toscas Padel', 'Calle Las Toscas 250', 'Ciudad de Córdoba', 'cordoba', '3515940403', -31.3737995, -64.116081),
  ('1445', 'Level', 'Av. córdoba y los laureles', 'Punilla', 'cordoba', '03541270993', -31.3634415, -64.5221247),
  ('658', 'LG 7 Padel', 'Av. Sabattini 499', 'Ciudad de Córdoba', 'cordoba', '3516997090', -31.4271288, -64.1715672),
  ('740', 'Los Cuervos Tenis', 'Tucuman 1800, Cordoba', 'Unión', 'cordoba', '3537313283', -32.626414, -62.712326),
  ('1332', 'Maipú Padel', 'Maipú 180', 'Punilla', 'cordoba', '3541287050', -31.4197987, -64.4917516),
  ('1235', 'Nueva Cordoba padel', 'Belgrano 1044', 'Ciudad de Córdoba', 'cordoba', '3513148476', -31.4268743, -64.1933777),
  ('2499', 'Orfilio Padel', 'Acceso Italo', 'General Roca', 'cordoba', '3385591245', -34.790568, -63.7815683),
  ('2209', 'Padel Buchardo', 'Velez sarfiel (s/n)', 'General Roca', 'cordoba', '3584816715', -34.7262928, -63.5093139),
  ('1554', 'Padel Indoor Cosquin', 'Avenida Omar Castillo 2105', 'Punilla', 'cordoba', '+5493541659076', -31.1063375, -64.4407122),
  ('937', 'Padel Poligono', 'Av. Valparaíso 5113', 'Ciudad de Córdoba', 'cordoba', '3512102181', -31.4764099, -64.1883708),
  ('1950', 'Padel Urbano', 'Maestro Vidal 866', 'Ciudad de Córdoba', 'cordoba', '3513867799', -31.4158686, -64.2265399),
  ('898', 'Palos Verdes Padel', 'Caseros 1727', 'Ciudad de Córdoba', 'cordoba', '3513562920', -31.4097027, -64.2082225),
  ('2205', 'Pilka', 'Avenida Vélez Sarfield 5281', 'Ciudad de Córdoba', 'cordoba', '3512300073', -31.4764595, -64.2024655),
  ('826', 'Planeta Padel', 'Av. Colón 5736, Córdoba', 'Ciudad de Córdoba', 'cordoba', '03513614861', -31.393878, -64.2569757),
  ('1790', 'Posada del Sol Padel', 'Ruta E55 Km 31 1/2', 'Punilla', 'cordoba', '3541561212', -31.3228542, -64.4543032),
  ('1507', 'Punto Cero', 'A-180', 'San Justo', 'cordoba', '03564585864', -31.2484113, -62.3631847),
  ('1716', 'Punto Cero Padel', 'Av. J. F. Konekamp 36 Bis', 'Tercero Arriba', 'cordoba', '3467499671', -32.2968402, -63.580611),
  ('703', 'Punto Padel', 'DEAN FUNES Esq INDEPENDENCIA', 'San Javier', 'cordoba', '3544646620', -31.954505, -65.1861615),
  ('1011', 'Punto Pádel Canals', 'Urquiza 31', 'Unión', 'cordoba', '3463401545', -33.5654605, -62.888093),
  ('1755', 'Pádel Cruz Indoor', 'Calle sin nombre continuación de av Japón entre rancagua y Juan B Justo', 'Ciudad de Córdoba', 'cordoba', '+5493513559909', -31.3366368, -64.1628079),
  ('1042', 'Rivera Padel', 'y, Los Reartes & Barreto, Córdoba', 'Ciudad de Córdoba', 'cordoba', '03516267863', -31.3311927, -64.2972814),
  ('941', 'Sacala X4', 'Av Pueyrredón 2660', 'Ciudad de Córdoba', 'cordoba', '3515502961', -31.4186868, -64.2205323),
  ('2144', 'Smash Padel', 'Francisco Maino 500-400', 'Juárez Celman', 'cordoba', '3585142576', -32.750893, -63.7996939),
  ('2501', 'Stellium Padel', 'Los piamonteses 1226', 'Marcos Juárez', 'cordoba', '3472465514', -32.6817738, -62.1159085),
  ('657', 'Sur Padel Club', 'Bernardo O''Higgins 5435', 'Ciudad de Córdoba', 'cordoba', '3516412711', -31.4751691, -64.1675386),
  ('612', 'Terrazas Padel Club', 'Av. Goycoechea 2013', 'Colón', 'cordoba', '3512652516', -31.3062647, -64.2816386),
  ('934', 'Via Libre Padel Center', 'Antonio Sobral 673', 'General San Martín', 'cordoba', '3534281866', -32.4178359, -63.2396198),
  ('919', 'Vias Padel', 'Ing Olmos y España', 'Unión', 'cordoba', '3463586481', -33.5649263, -62.8906664),
  ('2469', 'Villa Allegra Pádel', 'Ruta E53 Km 8,5', 'Colón', 'cordoba', '3543300186', -31.259223, -64.244666),
  ('1227', 'Wolfy Padel House', 'Av. Las Colonias 1595', 'Marcos Juárez', 'cordoba', '0347215593799', -32.6802031, -62.1012601),
  ('861', 'Black Padel Club', 'Virgen de itatí 2150, Gualeguaychú, Entre Ríos', 'Gualeguaychú', 'entre_rios', '3446581310', -33.0258669, -58.5386739),
  ('1471', 'Complejo Capitán', 'Roque Saenz Peña 1148', 'Paraná', 'entre_rios', '3434662200', -31.742129, -60.4926787),
  ('1747', 'Falta UNO club', 'Moises Lebensohn 3820', 'Paraná', 'entre_rios', '3436958961', -31.7722295, -60.5302687),
  ('1330', 'La Quinta', 'Rojas entre calle Río Negro y Eva Perón', 'Gualeguay', 'entre_rios', '3444626653', -33.1332288, -59.3209426),
  ('1222', 'Los Pinos', 'Av. Eva Perón 355', 'Gualeguay', 'entre_rios', '3444437496', -33.1315957, -59.3214345),
  ('1874', 'Mundo Padel', 'Cura Gordillo 1700', 'Gualeguaychú', 'entre_rios', '3446500165', -33.0356714, -58.5390022),
  ('2270', 'Patio Pádel', 'Alem 18', 'Gualeguaychú', 'entre_rios', '+5493446404777', -33.0088063, -58.506762),
  ('1550', 'Plaza Padel Club', 'Martin Fierro y Meliton Juarez', 'Gualeguay', 'entre_rios', '3444634866', -33.1415755, -59.3115975),
  ('761', 'Seba''s Club', 'Malvinas Argentinas 375, Puiggari, Entre Ríos', 'Diamante', 'entre_rios', '3755492352', -32.0563541, -60.4436589),
  ('2496', 'TDS Padel Club', 'San Martin 2100', 'Gualeguaychú', 'entre_rios', '543446213844', -33.0111907, -58.5416781),
  ('973', 'Terrazas Padel Club', 'División de los Andes 368', 'Paraná', 'entre_rios', '3435056072', -31.7482767, -60.5133187),
  ('1346', 'World Padel Center Concordia', 'Jj Valle 380', 'Concordia', 'entre_rios', '3455020733', -31.3684655, -58.0203404),
  ('2381', '20x10 pádel club', 'Belgrano 301', 'Formosa', 'formosa', '3705221859', -26.1769866, -58.167358),
  ('1268', 'Blue Pádel', 'Av. del Libertador e/Fortin Lugones y Avda. Loncharich Cabral', 'Patiño', 'formosa', '3718446510', -24.9379922, -59.0270282),
  ('1743', 'Complejo Deportivo Descamisadito del Palmar', 'San Martin s/n', 'Pilcomayo', 'formosa', '3718690254', -25.1124999, -58.2591807),
  ('1520', 'Costa Pádel Formosa', 'Corrientes Este 525', 'Formosa', 'formosa', '3704524071', -26.177796, -58.164581),
  ('1010', 'Drive Padel la nueva era', 'Moreno 661', 'Formosa', 'formosa', '3704837766', -26.1813128, -58.1681983),
  ('2395', 'El Bosque', 'Av. Vuelta de Obligado esq. Arturo Illia', 'Pilcomayo', 'formosa', '543718549423', -25.2269894, -58.1206094),
  ('1660', 'El cruce padel', 'Ruta 2', 'Pilcomayo', 'formosa', '3718450107', -25.1462634, -58.2296182),
  ('2081', 'Fair Play', 'Saavedra 431, Formosa', 'Formosa', 'formosa', '+5493705058898', -26.1813593, -58.1701864),
  ('2043', 'Gabb pádel club', 'Sgto. Cabral, P3624 Formosa', 'Patiño', 'formosa', '3704239098', -25.2089632, -59.8567192),
  ('1928', 'Invictus Multiespacio', 'Pacifico Scozzina 2705', 'Formosa', 'formosa', '5493704926585', -26.1792271, -58.1996648),
  ('1774', 'La Nueva Estación Padel', 'Salta 30', 'Formosa', 'formosa', '3704772360', -26.187131, -58.1622228),
  ('2031', 'La Yulieta Padel', 'Villa Dostrece Formosa', 'Pirané', 'formosa', '3704561065', -26.1893231, -59.3612961),
  ('437', 'Le Club', 'Leclub 1 Ypf Av.Lelong 1705 / Leclub 2 Gutnisky Y Freitas', 'Formosa', 'formosa', '3704807366', -26.1892045, -58.1871443),
  ('2383', 'Nova Padel Formosa', 'Juan José Castelli 835', 'Formosa', 'formosa', '3705288851', -26.192903, -58.1961172),
  ('1521', 'Padel center', 'Hipólito Irigoyen 1295', 'Formosa', 'formosa', '3704419989', -26.1897652, -58.177773),
  ('1576', 'Padel Guss', 'Carlos Girola 4255', 'Formosa', 'formosa', '3704006443', -26.1804845, -58.2134088),
  ('2480', 'Pádel Express', 'Avenida San Martín y Martín fierro', 'Pirané', 'formosa', '3794826356', -26.3110419, -59.3668886),
  ('2319', 'Pádel Room', 'Av. Dr. Luis Gutniski 4555', 'Formosa', 'formosa', '3704378964', -26.1965396, -58.2103063),
  ('865', 'Complejo Prueba', 'De la Ermita 3609, Ushuaia, Tierra del Fuego', 'Yavi', 'jujuy', '543816395821', -22.1054179, -65.6028843),
  ('7', 'complejo prueba back', 'De la Ermita 3609, Ushuaia, Tierra del Fuego', 'Yavi', 'jujuy', '1199999999', -22.1054179, -65.6028843),
  ('1177', 'Complejo Prueba Chelo', 'De la Ermita 3609, Ushuaia, Tierra del Fuego', 'Yavi', 'jujuy', '1199999999', -22.1054179, -65.6028843),
  ('1082', 'Complejo Prueba Chelo (sin seña)', 'De la Ermita 3609, Ushuaia, Tierra del Fuego', 'Yavi', 'jujuy', '1199999999', -22.1054179, -65.6028843),
  ('304', 'Complejo Prueba Comercial', 'De la Ermita 3609, Ushuaia, Tierra del Fuego', 'Yavi', 'jujuy', '3513805696', -22.1054179, -65.6028843),
  ('776', 'Complejo prueba Front (sin seña)', 'San Martín 573, La Quiaca, Jujuy', 'Yavi', 'jujuy', '1199999999', -22.1054179, -65.6028843),
  ('150', 'Complejo Prueba Gasti (sin seña)', 'De la Ermita 3609, Ushuaia, Tierra del Fuego', 'Yavi', 'jujuy', '1199999999', -22.1054179, -65.6028843),
  ('1494', 'Complejo Prueba Producto', 'De la Ermita 3609, Ushuaia, Tierra del Fuego', 'Yavi', 'jujuy', '+5491159231167', -22.1054179, -65.6028843),
  ('1309', 'Complejo Prueba Producto (sin seña)', 'De la Ermita 3609, Ushuaia, Tierra del Fuego', 'Yavi', 'jujuy', '+5491159231167', -22.1054179, -65.6028843),
  ('559', 'Complejo Prueba Soporte', 'De la Ermita 3609, Ushuaia, Tierra del Fuego', 'Yavi', 'jujuy', '119999999', -22.1054179, -65.6028843),
  ('816', 'Complejo Prueba Soporte (sin seña)', 'De la Ermita 3609, Ushuaia, Tierra del Fuego', 'Yavi', 'jujuy', '+5493513805696', -22.1054179, -65.6028843),
  ('1557', '9T Padel Club', 'Polideportivo Victor Arriaga Club Estudiantes', 'Ciudad de La Pampa', 'la_pampa', '2954554467', -36.5949263, -64.2662892),
  ('1293', 'Cristal Padel Club', 'Varela 1671', 'Ciudad de La Pampa', 'la_pampa', '2954544073', -36.644047, -64.2895252),
  ('2073', 'Efecto pádel', 'Larraoude , esquina colonia baron', 'Puelén', 'la_pampa', '2995159449', -37.771139, -67.7128052),
  ('2335', 'El Bosque Padel Center', 'Av. Peron 6200', 'Toay', 'la_pampa', '2954212208', -36.6594873, -64.3475262),
  ('805', 'Energy Padel', '31 número 176, General Pico, La Pampa', 'Maracó', 'la_pampa', '2302535539', -35.653583, -63.7544084),
  ('1995', 'Fenix Padel Club', 'J67H+V23 Alpachiri, La Pampa', 'Guatraché', 'la_pampa', '2954557267', -37.3852943, -63.7724755),
  ('1457', 'Los Medanos', 'Calle 20 bis N° 531', 'Maracó', 'la_pampa', '2302412607', -35.6502953, -63.7651331),
  ('974', 'Me Pinta', 'Av. Felice 560', 'Ciudad de La Pampa', 'la_pampa', '2954217848', -36.629244, -64.3205964),
  ('1828', 'Padel El Quincho', 'Ferrando 1115', 'Ciudad de La Pampa', 'la_pampa', '1121628353', -36.6379946, -64.2977714),
  ('1786', 'Sport center', 'Colectora 201 N°2223', 'Maracó', 'la_pampa', '2302593108', -35.6389231, -63.7567656),
  ('1137', 'X4 Padel Club', 'H. Rebolini 45 - Macachin - La Pampa', 'Atreucó', 'la_pampa', '2954854963', -37.1327492, -63.6728421),
  ('2511', 'Aconcagua Pádel', 'Martinez de Rosas 931', 'Godoy Cruz', 'mendoza', '5492612659020', -32.9485405, -68.8380204),
  ('2044', 'Africa Padel', 'Rodríguez Peña 3341', 'Maipú', 'mendoza', '2615139013', -32.9401493, -68.7665977),
  ('693', 'Al Cubo Fútbol', 'Independencia 650, esquina Cubillos, Godoy Cruz', 'Godoy Cruz', 'mendoza', '2616723000', -32.9350875, -68.8259422),
  ('2290', 'Alto Las Cañas Padel', 'Las Cañas 1511', 'Guaymallén', 'mendoza', '2617679227', -32.9105299, -68.8197214),
  ('684', 'Arena Padel Mendoza', 'Pedro del castillo 3050 Villa Nueva', 'Ciudad de Mendoza', 'mendoza', '2616960182', -32.8899166, -68.8445919),
  ('1994', 'Azcuenaga Padel', 'Azcuenaga 3432 - Lujan de Cuyo', 'Maipú', 'mendoza', '2617563824', -33.0378618, -68.8582666),
  ('1821', 'Bandera Center', 'Bandera de Los Andes 4399', 'Guaymallén', 'mendoza', '2615535343', -32.9035578, -68.7881723),
  ('1534', 'Boedo Camp', 'Boedo y Acceso Sur', 'Luján de Cuyo', 'mendoza', '2612746808', -32.9860489, -68.846728),
  ('670', 'Cano Padel', 'Timoteo Gordillo 303', 'Ciudad de Mendoza', 'mendoza', '2612467277', -32.8714069, -68.8631714),
  ('1926', 'City Pádel', 'Perito Moreno 2699', 'Godoy Cruz', 'mendoza', '2617123415', -32.9555926, -68.852246),
  ('1081', 'Club Vistalba', 'Guardia Vieja 1428, Vistalba', 'Luján de Cuyo', 'mendoza', '+5492616640584', -33.0191494, -68.9096347),
  ('2346', 'Cofam padel center', 'C. Antonelli 300, M5521 Rodeo de la Cruz, Mendoza', 'Guaymallén', 'mendoza', '2616343232', -32.9119859, -68.7538725),
  ('1935', 'Complejo Alsina', 'Alsina 2545', 'Maipú', 'mendoza', '2616974010', -32.9421062, -68.7852431),
  ('1731', 'Coquimbito Padel', 'Carril Gomez 3084', 'Maipú', 'mendoza', '2613681167', -32.963202, -68.7479342),
  ('1038', 'De Volea - Padel y Fútbol', 'Isuani 1800', 'Godoy Cruz', 'mendoza', '2614853697', -32.9411349, -68.8655928),
  ('1099', 'DePrimera', 'San Martin y Ruta 40', 'San Carlos', 'mendoza', '2622631420', -33.9448267, -69.0785899),
  ('2251', 'Dorrego Padel', 'Remedios de Escalada 2976, M5519 Guaymallén, Mendoza', 'Guaymallén', 'mendoza', '2616605530', -32.923264, -68.8362509),
  ('1901', 'Efecto padel indoor', 'Altos Hornos de Zapla y Terrada', 'Godoy Cruz', 'mendoza', '2617022127', -32.9307077, -68.8172048),
  ('939', 'El Ombu', 'Remedios de Escalada 3458, guaymallen, Mendoza', 'Guaymallén', 'mendoza', '+5492614853898', -32.9267926, -68.8375024),
  ('1321', 'Fox Padel', 'Rodriguez Peña 2032', 'Godoy Cruz', 'mendoza', '2613994317', -32.9277081, -68.8146617),
  ('1100', 'Full pádel indoor', 'Leandro alem 1031', 'San Martín', 'mendoza', '2634348845', -33.0882012, -68.4584982),
  ('1693', 'Full Pádel Outdoor', 'Calle de la Armonía y lateral Norte Acceso este', 'San Martín', 'mendoza', '2634348845', -33.0623661, -68.4826484),
  ('2291', 'Garden pádel', 'Tapón Moyano s/n a 100 mts de Elpidio González', 'Guaymallén', 'mendoza', '2616908813', -32.9279519, -68.773619),
  ('1916', 'Go Padel', 'Godoy Cruz 184 Rivadavia Mendoza', 'Rivadavia', 'mendoza', '2616575794', -33.1828835, -68.4538313),
  ('2021', 'Gol Gana', 'Vieytes y Palma S/N', 'Maipú', 'mendoza', '5492612633714', -32.9804672, -68.8208351),
  ('2117', 'Golden pádel club Mendoza', 'Acceso este 10020 lateral norte', 'Guaymallén', 'mendoza', '2615703835', -32.9379464, -68.7411496),
  ('2060', 'Gran Reserva Padel', 'San Martin 4871', 'Luján de Cuyo', 'mendoza', '+5492615911738', -32.9928695, -68.8633395),
  ('2225', 'Greengo pádel club', 'Bandera de los Andes 5965', 'Guaymallén', 'mendoza', '2616519015', -32.9099068, -68.7732962),
  ('1544', 'H.Club', 'Terrada y A Terrada', 'Luján de Cuyo', 'mendoza', '+542617110615', -32.9700919, -68.835096),
  ('2429', 'H.P.G Pádel', 'Padre vera 181', 'Maipú', 'mendoza', '+5492615565620', -32.9831104, -68.7943417),
  ('1890', 'Indoor Mendoza Padel Center', 'Lat. Acceso Sur y Malabia', 'Luján de Cuyo', 'mendoza', '2617474909', -32.9759805, -68.844522),
  ('1216', 'J3 Sport Padel', 'Almirante Brown 2051', 'Las Heras', 'mendoza', '2617098901', -32.8459616, -68.8539193),
  ('1272', 'Kondor Padel Club', 'Adolfo Villanueva 548', 'Maipú', 'mendoza', '+5492617108879', -32.9500444, -68.810251),
  ('910', 'La Nave Padel Mendoza', 'Peru 1110', 'Las Heras', 'mendoza', '2613426111', -32.8544072, -68.846495),
  ('2394', 'Los Duendes Pádel', 'Urquiza 1708 Guaymallen', 'Guaymallén', 'mendoza', '2617786256', -32.9229086, -68.7917225),
  ('1589', 'Marista Camp', 'Avda. Champagnat 2045', 'Las Heras', 'mendoza', '2612211873', -32.8522132, -68.8937296),
  ('1597', 'Mendoza Tenis Club', 'Av. Boulogne Sur Mer 520, Mendoza', 'Ciudad de Mendoza', 'mendoza', '+5492612745677', -32.8935231, -68.8632188),
  ('2434', 'Moron Indoor', 'Bruno Moron Y Geronimo Ruiz', 'Maipú', 'mendoza', '2613362542', -32.9536526, -68.7723979),
  ('2348', 'Olivos Premier Padel', 'Portillo de Piuquenes 1451', 'Luján de Cuyo', 'mendoza', '2617742902', -33.0213459, -68.903342),
  ('2000', 'PACIFICO Padel', 'Perú 2280', 'Ciudad de Mendoza', 'mendoza', '2612054178', -32.8762713, -68.8454084),
  ('1937', 'Padel CPBM', 'Liniers S/N', 'Luján de Cuyo', 'mendoza', '2612172099', -32.9869103, -68.8665301),
  ('2483', 'Padel CRYDAA', 'Maza 4210, Cruz de Piedra', 'Maipú', 'mendoza', '+542612795630', -33.0163646, -68.8171578),
  ('1324', 'Padel House', 'Coronel Rodriguez y Lamadrid', 'Ciudad de Mendoza', 'mendoza', '2615884379', -32.8982918, -68.853917),
  ('938', 'Padel Hípico', 'Av Thays - Parque San Martín Mendoza', 'Ciudad de Mendoza', 'mendoza', '02615020641', -32.8978754, -68.870952),
  ('2237', 'Padel Independencia', 'Arroyo 223', 'Ciudad de Mendoza', 'mendoza', '2612352567', -32.8632214, -68.8477013),
  ('2402', 'PadelPlass', 'Alem 1245', 'San Martín', 'mendoza', '5492634344432', -33.0887529, -68.4573846),
  ('1206', 'Padeltime Liceo Rugby Club', 'Vieytes y boedo', 'Maipú', 'mendoza', '2613413994', -32.9882823, -68.8254949),
  ('2320', 'Pasosurpadel', 'Emilio Civit 3074', 'Maipú', 'mendoza', '2615634054', -32.9695135, -68.830236),
  ('2127', 'Ponce Padel', 'Carril Ponce 214- Rodeo de la cruz -Guaymallen', 'Guaymallén', 'mendoza', '2612441227', -32.9332776, -68.7456971),
  ('2352', 'Pro Court', 'Ruta Provincial 82, esquina calle Chaco sin numero, Vistalba', 'Luján de Cuyo', 'mendoza', '+5492612197182', -32.9984745, -68.9046694),
  ('1638', 'Punto de Oro Club de Padel', 'Altos hornos de zapla 1662', 'Godoy Cruz', 'mendoza', '2617742319', -32.930005, -68.8182503),
  ('1643', 'Punto de Oro Sede Maipu', 'Alsina y Maza', 'Maipú', 'mendoza', '2616865085', -32.9416678, -68.7850132),
  ('2125', 'Pádel libertad', 'Joaquín gonzalez n°450 , centro comercial hiper libertad', 'Godoy Cruz', 'mendoza', '2616611734', -32.930509, -68.8558628),
  ('2181', 'Terra Padel', 'Vieytes sin numero esquina bulnes', 'Maipú', 'mendoza', '02614164666', -33.0014952, -68.8311444),
  ('1831', 'Terrada Pádel Club', 'Terrada 3900', 'Luján de Cuyo', 'mendoza', '2615669774', -33.0737987, -68.8650741),
  ('1253', 'Terrazas Padel', 'Carlos Washington lencinas 985', 'Ciudad de Mendoza', 'mendoza', '2615993232', -32.8832528, -68.8645328),
  ('2261', 'Vista Pádel Club', 'Ozamis Sur 1605 - MAIPÚ - Mendoza', 'Maipú', 'mendoza', '2617788066', -33.0039864, -68.796067),
  ('1753', 'Vistalba Open Padel', 'Roque Saenz peña 2972, Vistalba', 'Luján de Cuyo', 'mendoza', '2615553340', -33.0353866, -68.9117255),
  ('694', 'Blue Padel', 'Cervantes 651', 'Eldorado', 'misiones', '3751349622', -26.4011431, -54.609838),
  ('1276', 'Blue Padel Quincho', 'La colina 1512', 'Eldorado', 'misiones', '3751616626', -26.4044082, -54.6107643),
  ('2418', 'Complejo 3 Fronteras', 'Rivadavia esquina Ramon Romero', 'Iguazú', 'misiones', '543757574481', -25.6153364, -54.5811891),
  ('1341', 'Inosport', 'Mateo Durañona y Aparicio Grondona', 'San Pedro', 'misiones', '+543751603578', -26.6263509, -54.1062024),
  ('2074', 'Libertad Padel Center', 'Avenida Libertad 499, Leandro N. Alem', 'Leandro N. Alem', 'misiones', '3754457575', -27.5960207, -55.3240749),
  ('1314', 'Biguá Padel Club', 'Pueyrredon N 375 esquina Santa Cruz', 'Confluencia', 'neuquen', '2996745443', -38.9708212, -68.0536581),
  ('2208', 'Bpn padel', 'Saturninos torres y paseo costero', 'Confluencia', 'neuquen', '2996095216', -38.978449, -68.03801),
  ('1475', 'Casco Viejo Pádel', 'Darrieux 146', 'Confluencia', 'neuquen', '2994165843', -38.9516784, -68.0591888),
  ('2371', 'Club Alemán Neuquén', 'Urmenio del Carmen Figueroa 3750', 'Confluencia', 'neuquen', '2994013366', -38.9596636, -68.009113),
  ('1624', 'Club Camioneros Neuquen', 'Beltran 4021', 'Confluencia', 'neuquen', '2995240404', -38.9618675, -68.1150477),
  ('1833', 'Club La Barda', 'Ruta 17 km 157.30 Añelo Neuquen', 'Añelo', 'neuquen', '5492995341260', -38.352257, -68.82592),
  ('1523', 'Complejo La Villa', 'Alberdi 735', 'Loncopué', 'neuquen', '2995783093', -38.1523612, -70.410833),
  ('1744', 'Complejo Los Gallegos', 'Calle Fernando Guerrico', 'Confluencia', 'neuquen', '2995682422', -38.9547198, -68.2619866),
  ('1046', 'Fusión Padel', 'Martin Fierro 44', 'Confluencia', 'neuquen', '02996320516', -38.9680507, -68.0605954),
  ('1574', 'Hotel Howard Johnson', 'Caracas 50', 'Confluencia', 'neuquen', '299154764574', -38.9571697, -68.1592885),
  ('1772', 'Ohana Club', 'Rio Senguer 731', 'Confluencia', 'neuquen', '2995060041', -38.9787418, -68.0693313),
  ('2472', 'Padel Cem', 'humauaca 35', 'Confluencia', 'neuquen', '2996037080', -38.9783502, -68.0585865),
  ('1771', 'Sitio Sport', 'Avenida Olascoaga 2121', 'Confluencia', 'neuquen', '92995172894', -38.9775968, -68.0600173),
  ('2207', 'Tenis club Neuquen', 'Avenida Olascoaga 1355', 'Confluencia', 'neuquen', '+5492994738045', -38.9693724, -68.0597523),
  ('2093', 'De Palo a Palo', 'Ruta nac. 250 acceso Brown', 'Avellaneda', 'rio_negro', '2984745329', -39.4149027, -65.6897328),
  ('1205', 'El Faldeo Padel', 'Austria 272', 'Bariloche', 'rio_negro', '2944510543', -41.1402598, -71.3199923),
  ('1684', 'Esandi Padel', 'Esandi 2787', 'Bariloche', 'rio_negro', '2944123960', -41.1519289, -71.2622155),
  ('2064', 'Giver', 'Radonich 126', 'General Roca', 'rio_negro', '2995508789', -38.8322559, -68.0627935),
  ('1588', 'Level 40/15', 'Mosconi y El manso', 'General Roca', 'rio_negro', '2993270804', -37.8615925, -67.7926738),
  ('901', 'Nuevo Palau', 'Alsina 1370', 'General Roca', 'rio_negro', '2984536559', -39.0332212, -67.5848451),
  ('2452', 'Sportsman Club "AD"', 'Av. San Martin 950', 'Avellaneda', 'rio_negro', '542984401417', -39.2933925, -65.6609227),
  ('1143', 'World Padel Center Patagonia', 'Ruta 151 km 0.8', 'General Roca', 'rio_negro', '2994592507', -38.9304972, -68.0129734),
  ('1439', 'Zona Padel', 'Mendoza 65', 'General Roca', 'rio_negro', '2984705573', -39.0440727, -67.5666741),
  ('1948', 'Cafayate Padel Club', 'Lamadrid 940 Cafayate', 'Cafayate', 'salta', '3868639545', -26.0656066, -65.9879063),
  ('943', 'Canchas Central Fútbol & Pádel', 'Av. Entre Ríos 1450', 'Ciudad de Salta', 'salta', '3876844385', -24.7793503, -65.4219928),
  ('2045', 'Club Raqueta', 'Avenida Yerba Buena S/N Camino a la Aguada', 'Ciudad de Salta', 'salta', '3874437863', -24.791704, -65.4812453),
  ('524', 'Green Fútbol Club', 'Av. John F. Kennedy, Salta Capital', 'Ciudad de Salta', 'salta', '3874627620', -24.83954, -65.459716),
  ('1313', 'Güemes padel center', 'Tte. Ibañez', 'General Güemes', 'salta', '3875817435', -24.6714436, -65.0521287),
  ('217', 'Il Calcio', 'Los Alamos esquina Los Juncos', 'Ciudad de Salta', 'salta', '3875846544', -24.7546621, -65.3945267),
  ('2227', 'La Loma Padel', 'Complejo Deportivo La Loma', 'Ciudad de Salta', 'salta', '3875532867', -24.78416, -65.46583),
  ('1121', 'La Sirio Padel', 'Ruta 28 camino al Lesser (Frente a los Monoambientes)', 'Ciudad de Salta', 'salta', '038751234', -24.7555663, -65.4623341),
  ('2280', 'Paraíso Club', 'Las Paltas 595', 'Ciudad de Salta', 'salta', '3872285598', -24.7655515, -65.3892273),
  ('957', 'Sporting Futbol Club', 'Los Cebiles 274', 'Ciudad de Salta', 'salta', '5493874735520', -24.7752979, -65.3945583),
  ('1130', 'Camping Santa Lucia (CCISL)', 'PELLEGRINI - ESTE 4855 SANTA LUCIA (C.P. 5411) (Club Santa Lucia)', 'Albardón', 'san_juan', '2644452185', -31.4125935, -68.4553877),
  ('2228', 'Club olivos arena', 'Av.ignacio de la rosa (S/N) esquina Calivar', 'Rivadavia', 'san_juan', '2646242406', -31.5386624, -68.590838),
  ('2180', 'Complejo Mendoza', 'Mendoza 2003 Sur', 'Ciudad de San Juan', 'san_juan', '542646106465', -31.5590709, -68.5240044),
  ('2365', 'De La Roza Padel', 'Av. Ignacio de la Roza y Meglioli', 'Rivadavia', 'san_juan', '2646759383', -31.5384877, -68.5787754),
  ('1984', 'Del bono sport', 'Lateral de circunvalación oeste 729', 'Ciudad de San Juan', 'san_juan', '2645812897', -31.5394782, -68.5553635),
  ('2150', 'Glass Padel', 'Lateral de Circunvalación Norte s/n casi Paula A. Sarmiento', 'Ciudad de San Juan', 'san_juan', '2646618800', -31.5239034, -68.554438),
  ('2298', 'Juga en primera', 'Cristóbal Colón 1037', 'Ciudad de San Juan', 'san_juan', '2646624455', -31.522479, -68.5457266),
  ('2315', 'La Cantera Complejo Deportivo', 'Calle independencia y gobernador rojas', 'Pocito', 'san_juan', '5492645095424', -31.5933872, -68.5417786),
  ('2256', 'Padel Alem', 'Av ALem sur 1260', 'Ciudad de San Juan', 'san_juan', '2644554579', -31.5497602, -68.5272659),
  ('2366', 'Padel Set Point', 'Laprida 1445', 'Ciudad de San Juan', 'san_juan', '2646214127', -31.5341356, -68.5472295),
  ('2284', 'Punto de Encuentro', 'Sgto. Cabral 624 Oeste', 'Ciudad de San Juan', 'san_juan', '2646242233', -31.5179432, -68.5378459),
  ('1666', 'ROU complejo Deportivo', 'Comandante Cabot 167 oeste', 'Rawson', 'san_juan', '2645613801', -31.559607, -68.5272608),
  ('2354', 'San Juan Padel', 'Suipacha 369 Sur', 'Ciudad de San Juan', 'san_juan', '2645651117', -31.5388486, -68.5388077),
  ('781', 'Sioux Padel', 'Jose Marti 1146 sur, San Juan', 'Ciudad de San Juan', 'san_juan', '2645821142', -31.5451154, -68.5476064),
  ('1700', 'Urquiza SportCenter', 'Urquiza sur 1660', 'Ciudad de San Juan', 'san_juan', '2644433682', -31.5545396, -68.5435628),
  ('1921', 'La Ceramica', 'Ruta 3 y Av. IV Centenario', 'Juan Martín de Pueyrredón', 'san_luis', '2664375245', -33.3137488, -66.3286852),
  ('656', 'Tamarindos Padel Club', '9 de Julio 123', 'Gobernador Dupuy', 'san_luis', '2658410479', -34.7592601, -65.2505293),
  ('2242', '3ra Via Padel', 'Calle 2 775 entre calle 15 y 17', 'General Obligado', 'santa_fe', '3482592737', -29.11962, -59.66517),
  ('1175', 'A3SET Padel Club', '9 de Julio 1699', 'General Obligado', 'santa_fe', '3482754444', -29.1548124, -59.6487853),
  ('2133', 'Armstrong padel club', 'Peru 1642', 'Belgrano', 'santa_fe', '3412627038', -32.7834718, -61.6035241),
  ('2466', 'Arroyo Padel', 'San Nicolás y María Garaghan', 'Rosario', 'santa_fe', '5493402484919', -33.1667255, -60.5152135),
  ('2512', 'Arroyo Pádel 2', 'General Aramburu km 266, Predio Estación Shell', 'Rosario', 'santa_fe', '+5493402572043', -33.1665866, -60.5285303),
  ('2126', 'Asociacion Vecinal Barrio La Alegria', 'Italia 1159', 'Constitución', 'santa_fe', '3465665565', -33.5363894, -61.1185876),
  ('1281', 'Atlas Padel Center', 'Caseros 2275', 'General López', 'santa_fe', '3462336162', -33.7278011, -61.9680395),
  ('829', 'Ave Fenix', 'Pres. Roca 3650, Rosario, Santa Fe', 'Rosario', 'santa_fe', '3412743906', -32.977614, -60.6535379),
  ('1840', 'Baigorria Padel', 'Los Aromos 651', 'Rosario', 'santa_fe', '543412422824', -32.8628881, -60.6927968),
  ('1976', 'Blue Pádel Bigand', 'Ruta 178, km 86. Bigand, Santa Fe', 'Caseros', 'santa_fe', '3464581606', -33.3713249, -61.1756087),
  ('884', 'Camber Padel', 'Angel Marino Gervasso y Autopista Rosario Santa Fe', 'San Lorenzo', 'santa_fe', '3415794540', -32.8208813, -60.74026),
  ('1326', 'Chacras Padel', '9 de Julio y Lavalle', 'Castellanos', 'santa_fe', '+5493406406962', -31.6763989, -61.7504613),
  ('1469', 'Citta Deportes', 'Ruta nro 177, km 2', 'Constitución', 'santa_fe', '3417209249', -33.2394365, -60.3385878),
  ('1987', 'Club Atletico Peñarol Elortondo', 'Italia y Austria', 'General López', 'santa_fe', '3462339094', -33.699303, -61.6220886),
  ('1181', 'Club Atlético Susanense', 'Santiago Del Estero 901', 'San Martín', 'santa_fe', '03401466229', -32.2598357, -61.9053213),
  ('1086', 'Club Los Cardos', 'Irigoyen 927,Puerto Gral. San Martin, Santa Fe, Argentina', 'San Lorenzo', 'santa_fe', '3476300488', -32.7081663, -60.747871),
  ('1775', 'Complejo La Terraza', 'Juan Domingo Peron 1531', 'Constitución', 'santa_fe', '3400538380', -33.2401528, -60.3325638),
  ('2155', 'El Castillo Paddle', 'Arroyo Ceibal, Santa Fe, Argentina', 'General Obligado', 'santa_fe', '3482457517', -28.7223433, -59.4802571),
  ('2518', 'El Premier', 'San Juan 1371', 'Caseros', 'santa_fe', '3464507122', -33.1478509, -61.4810711),
  ('1172', 'EL92', 'Ruta 92 y Rawson', 'Caseros', 'santa_fe', '3467439361', -33.1088328, -61.6966793),
  ('2217', 'Elite pádel club', '12 de octubre y Ocampo', 'Iriondo', 'santa_fe', '3471330763', -32.9586671, -61.5471239),
  ('1084', 'Estación 23', '20 de Noviembre 8529', 'Rosario', 'santa_fe', '3416950181', -32.9035612, -60.7482286),
  ('1864', 'KM 8 Club de Padel', 'Ángel marino Gervaso y autopista Rosario - Santa Fe', 'San Lorenzo', 'santa_fe', '3417380449', -32.8370684, -60.7401331),
  ('1654', 'La Palmera', 'Mitre 735', 'General López', 'santa_fe', '3465449854', -33.6617477, -61.4571714),
  ('2035', 'La Peña Padel', 'Gervaso 361', 'San Lorenzo', 'santa_fe', '3416740303', -32.820333, -60.729694),
  ('2377', 'Los Ciruelos Padel', 'Catamarca 82', 'Constitución', 'santa_fe', '3364586149', -33.2527981, -60.3733083),
  ('1619', 'Los Troncos', 'Avenida Williner 588', 'Castellanos', 'santa_fe', '3492705762', -31.2615227, -61.5002064),
  ('1856', 'MN Padel', 'Lanso 145', 'La Capital', 'santa_fe', '3424210988', -31.2714388, -60.7603456),
  ('2048', 'Modo Padel', 'Iraci y Ruta 9', 'Belgrano', 'santa_fe', '3471348278', -32.7737597, -61.6046644),
  ('1910', 'Nuevo Club Atletico y Deportivo Piamonte', 'Sargento Cabral 1701', 'San Martín', 'santa_fe', '3406517089', -32.1386136, -61.982418),
  ('1246', 'Ova Pádel', 'Colectora 25 de mayo 4151', 'Rosario', 'santa_fe', '+5493412587520', -32.8524363, -60.7733431),
  ('1608', 'Platense Padel Club', 'Bv Lovato 1200', 'General Obligado', 'santa_fe', '+5493482624660', -29.1551675, -59.6534497),
  ('2314', 'Primer Nivel Padel Club', 'Almafuerte 500', 'Las Colonias', 'santa_fe', '3496593517', -31.4428478, -60.9169563),
  ('960', 'Pro Padel', 'Maipu y Guemes', 'Belgrano', 'santa_fe', '3471682660', -32.4842087, -61.5811636),
  ('2516', 'Punto Country', '96GV+6Q, Santo Tomé, Santa Fe', 'La Capital', 'santa_fe', '3424359905', -31.624164, -60.755578),
  ('2389', 'Punto pádel', 'Sarmiento y Entre Rios', 'General López', 'santa_fe', '3462505106', -33.8909977, -61.6988673),
  ('1333', 'Red Star Padel', 'Urquiza 2300', 'San Lorenzo', 'santa_fe', '3476693756', -32.7332374, -60.7569935),
  ('754', 'Ricardone Padel', 'Islas Malvinas 750, Ricardone', 'San Lorenzo', 'santa_fe', '3476324972', -32.7656391, -60.7724682),
  ('1737', 'San Lorenzo Pádel Center', 'Irigoyen 738', 'San Lorenzo', 'santa_fe', '3476592500', -32.7088849, -60.7476556),
  ('1599', 'Sunset Complejo Recreativo', 'Bulevar Brown', 'General Obligado', 'santa_fe', '3424479291', -28.4791421, -59.3491082),
  ('2161', 'Terra Padel Club', '9 de julio 1048', 'San Jerónimo', 'santa_fe', '3471418941', -32.3625564, -61.3405799),
  ('1852', 'World Padel Center Rafaela', 'Padre Dimas Mateo 1068', 'Castellanos', 'santa_fe', '3492249154', -31.2633888, -61.488378),
  ('1889', 'Amin Padel', 'Prolongación Sarmiento Barrio Jardín', 'Ciudad de Santiago del Estero', 'santiago_del_estero', '3857470593', -27.7983635, -64.2743253),
  ('2293', 'Box Padel', 'Saavedra y Quintana s/n', 'Belgrano', 'santiago_del_estero', '3857489748', -28.8921641, -62.2661527),
  ('2411', 'Club Nb Padel', 'Av San Martin y Av Nestor Kirchner', 'Río Hondo', 'santiago_del_estero', '3858499003', -27.480165, -64.8726768),
  ('2123', 'Complejo Los Álamos', 'Daniel Prado 2190', 'Banda', 'santiago_del_estero', '3855347634', -27.7563211, -64.233527),
  ('2104', 'Padel Club Pinto', '27 de abril 400', 'Aguirre', 'santiago_del_estero', '3857401759', -29.1401604, -62.6536285),
  ('1134', 'Polideportivo Municipal Termas de Rio Hondo', 'Avda. Belgrano esq. Córdoba', 'Río Hondo', 'santiago_del_estero', '3858519274', -27.4941465, -64.8672992),
  ('2010', 'PRO Pádel Club', 'Suipacha 602. pleno centro de la ciudad', 'Río Hondo', 'santiago_del_estero', '+543858507883', -27.5014741, -64.8675061),
  ('1993', 'Termas Pádel Club', 'Av. Perón 830', 'Río Hondo', 'santiago_del_estero', '3858400766', -27.5034529, -64.8739763),
  ('1452', 'Ushuaia Padel Center', 'Perito Moreno 1565', 'Ushuaia', 'tierra_del_fuego', '2901307871', -54.7974646, -68.2797371),
  ('228', 'Alemania Padel & Club', 'Pje Alemania 67 - altura crisostomo alvarez 2950', 'Ciudad de Tucumán', 'tucuman', '3813283465', -26.823451, -65.243125),
  ('1612', 'Alpha Padel', 'Mexico 950', 'Ciudad de Tucumán', 'tucuman', '3814468298', -26.802394, -65.2045781),
  ('1522', 'Capitán Juan', 'Ruta Provincial 308', 'Juan Bautista Alberdi', 'tucuman', '3865318102', -27.6124764, -65.6474776),
  ('748', 'El club', 'San Juan 3000', 'Ciudad de Tucumán', 'tucuman', '3812077704', -26.8179397, -65.240751),
  ('996', 'Epico Sports', 'San Luis 940', 'Yerba Buena', 'tucuman', '3816581358', -26.8252429, -65.2927833),
  ('1954', 'Full Pádel', 'Islas Malvinas al final Loteo plaza norte lote 7', 'Monteros', 'tucuman', '3863567742', -27.1567062, -65.4986725),
  ('1980', 'Guillermina Padel', 'Boyacá 54', 'Ciudad de Tucumán', 'tucuman', '3815228818', -26.8200074, -65.262253),
  ('2474', 'HammerX Padel', 'Av. Aconquija 2044', 'Yerba Buena', 'tucuman', '543816497448', -26.8121396, -65.3000575),
  ('1650', 'Las Cañas Padel', 'Av Presidente Peron 800', 'Yerba Buena', 'tucuman', '3814019923', -26.8024259, -65.2746726),
  ('2323', 'Las Paltas pádel club', 'Fray Luis Beltran 293', 'Cruz Alta', 'tucuman', '3812982020', -26.846309, -65.1615581),
  ('872', 'MAD Padel Club', 'Boulevard 9 de julio 1153 (esq Ruben Dario)', 'Yerba Buena', 'tucuman', '3815588888', -26.820562, -65.281199),
  ('2294', 'Match Point Padel Club', 'Adolfo de la Vega 680', 'Ciudad de Tucumán', 'tucuman', '3813408684', -26.8313187, -65.2534155),
  ('1262', 'Padel Point', 'Av. Solano Vera 1099', 'Yerba Buena', 'tucuman', '3814542193', -26.8303904, -65.3065712),
  ('1844', 'Usina Play - Sport Club - F5 y Padel', 'Lucas Córdoba 655', 'Ciudad de Tucumán', 'tucuman', '3815051088', -26.8183986, -65.2191277);

-- 2) Las que ya estaban --------------------------------------------------------
-- De a una, así ninguna fila queda enganchada a dos clubes de ATC ni al revés.
do $$
declare
  a record;
  v_id uuid;
  v_enlazadas integer := 0;
begin
  for a in select * from atc order by atc_id loop
    select c.id into v_id
    from public.canchas c
    where c.atc_id is null
      and c.provincia = a.provincia
      and c.nombre not ilike '%dato de prueba%'
      and (
        pg_temp.nombre_comparable(c.nombre) = pg_temp.nombre_comparable(a.nombre)
        or (length(pg_temp.nombre_comparable(a.nombre)) >= 6
            and pg_temp.nombre_comparable(c.nombre) like '%' || pg_temp.nombre_comparable(a.nombre) || '%')
        or (length(pg_temp.nombre_comparable(c.nombre)) >= 6
            and pg_temp.nombre_comparable(a.nombre) like '%' || pg_temp.nombre_comparable(c.nombre) || '%')
        -- "La Nave Padel" / "La Nave Padel Mendoza": uno empieza con el otro.
        or (length(pg_temp.nombre_comparable(c.nombre)) >= 4
            and pg_temp.nombre_comparable(a.nombre) || ' ' like pg_temp.nombre_comparable(c.nombre) || ' %')
        or (length(pg_temp.nombre_comparable(a.nombre)) >= 4
            and pg_temp.nombre_comparable(c.nombre) || ' ' like pg_temp.nombre_comparable(a.nombre) || ' %')
      )
    order by (pg_temp.nombre_comparable(c.nombre) = pg_temp.nombre_comparable(a.nombre)) desc
    limit 1;
    if v_id is not null and not exists (select 1 from public.canchas where atc_id = a.atc_id) then
      update public.canchas set atc_id = a.atc_id, lat = a.lat, lng = a.lng where id = v_id;
      v_enlazadas := v_enlazadas + 1;
    end if;
  end loop;
  raise notice 'Canchas que ya estaban, enlazadas con ATC: %', v_enlazadas;
end $$;

-- 3) Las nuevas -----------------------------------------------------------------
insert into public.canchas (atc_id, nombre, direccion, zona, provincia, telefono, lat, lng)
select a.atc_id, a.nombre, a.direccion, a.zona, a.provincia, a.telefono, a.lat, a.lng
from atc a
where not exists (select 1 from public.canchas c where c.atc_id = a.atc_id);

-- 4) Fuera las canchas de prueba de 015 ----------------------------------------
do $$
declare
  v_partido record;
  v_cancha_id uuid;
  v_cancha text;
begin
  for v_partido in
    select p.id from public.partidos p
    join public.canchas c on c.id = p.cancha_id
    where c.nombre ilike '%dato de prueba%'
  loop
    select id, nombre into v_cancha_id, v_cancha from public.canchas
    where provincia = 'mendoza' and nombre not ilike '%dato de prueba%'
    order by random() limit 1;
    update public.partidos set cancha_id = v_cancha_id, cancha = v_cancha where id = v_partido.id;
  end loop;
  delete from public.resenas_canchas
  where cancha_id in (select id from public.canchas where nombre ilike '%dato de prueba%');
  delete from public.canchas where nombre ilike '%dato de prueba%';
end $$;

-- 5) Partidos demo diarios: solo canchas de Mendoza ----------------------------
create or replace function public.generar_partidos_demo(p_cantidad integer default 3)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_partido_id uuid;
  v_cancha_id uuid;
  v_cancha text;
  v_fecha timestamptz;
  v_inicio_hoy timestamptz := date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires') at time zone 'America/Argentina/Buenos_Aires';
  v_sets_a integer[];
  v_sets_b integer[];
  v_ga integer;
  v_gb integer;
  v_sa integer;
  v_sb integer;
  v_ok integer := 0;
  i integer;
begin
  if (select count(*) from public.perfiles where es_demo and activo) < 4 then
    return 0;
  end if;

  for i in 1..p_cantidad loop
    begin
      select array_agg(id) into v_ids
      from (select id from public.perfiles where es_demo and activo order by random() limit 4) sub;

      select id, nombre into v_cancha_id, v_cancha from public.canchas where provincia = 'mendoza' order by random() limit 1;

      -- Entre las 0 h de hoy (hora Argentina) y ahora: así cae siempre en el
      -- día y el mes de hoy. Antes era "en las últimas 10 horas", y corriendo
      -- a las 9 h a veces caía en el día anterior (el 1° de cada mes, en el
      -- mes anterior -- y el mensual quedaba vacío).
      v_fecha := v_inicio_hoy + random() * (now() - v_inicio_hoy);

      insert into public.partidos (organizador_id, fecha_hora, cancha, cancha_id, cantidad_jugadores, estado, es_adhoc)
      values (v_ids[1], v_fecha, coalesce(v_cancha, 'Cancha de prueba'), v_cancha_id, 4, 'jugado', true)
      returning id into v_partido_id;

      update public.partido_jugadores set equipo = 'A'
      where partido_id = v_partido_id and jugador_id = v_ids[1];

      insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado)
      values
        (v_partido_id, v_ids[2], 'A', 'confirmado'),
        (v_partido_id, v_ids[3], 'B', 'confirmado'),
        (v_partido_id, v_ids[4], 'B', 'confirmado');

      v_sets_a := array[]::integer[];
      v_sets_b := array[]::integer[];
      v_sa := 0;
      v_sb := 0;
      while v_sa < 2 and v_sb < 2 loop
        v_ga := 6;
        v_gb := (array[0, 1, 2, 3, 4, 4, 3, 5, 6])[1 + floor(random() * 9)::int];
        if v_gb >= 5 then v_ga := 7; end if;
        if random() < 0.5 then
          v_sets_a := v_sets_a || v_ga; v_sets_b := v_sets_b || v_gb; v_sa := v_sa + 1;
        else
          v_sets_a := v_sets_a || v_gb; v_sets_b := v_sets_b || v_ga; v_sb := v_sb + 1;
        end if;
      end loop;

      -- finalizado = true dispara el trigger que suma los puntos de ranking.
      insert into public.resultados_partido (partido_id, estado, finalizado, ganador, created_at, updated_at)
      values (
        v_partido_id,
        jsonb_build_object(
          'setsA', to_jsonb(v_sets_a), 'setsB', to_jsonb(v_sets_b),
          'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
          'historial', '[]'::jsonb, 'pausado', false, 'finalizado', true,
          'ganador', case when v_sa > v_sb then 'A' else 'B' end
        ),
        true,
        case when v_sa > v_sb then 'A' else 'B' end,
        v_fecha,
        v_fecha + (60 + random() * 40) * interval '1 minute'
      );

      v_ok := v_ok + 1;
    exception when others then
      raise notice 'Partido demo % salteado: %', i, sqlerrm;
    end;
  end loop;

  return v_ok;
end;
$$;

-- Para revisar: cuántas canchas quedaron por provincia.
select provincia, count(*) as canchas, count(atc_id) as de_atc
from public.canchas group by provincia order by provincia;
