-- Canchas de pádel de OpenStreetMap que no estaban en la base (2026-10-10,
-- pedido del usuario: comparar con un mapa de todo el país y cargar las que
-- falten). Las armó herramientas/canchas-osm/generar_sql.py: 189 clubes con
-- nombre que no aparecen entre los de ATC (088). Se descartaron las canchas
-- sin nombre o con nombres genéricos ("Cancha de Padel", "Paddle").
-- Datos de OpenStreetMap, © colaboradores de OpenStreetMap, licencia ODbL.
--
-- Ojo: OpenStreetMap lo carga la gente y puede tener clubes que ya cerraron.
--
-- Qué hace (se corre entero, una vez, en el SQL Editor de Supabase):
--   1. Agrega a canchas el id de OpenStreetMap.
--   2. Inserta cada club salvo que ya haya en la base una cancha con nombre
--      parecido en la misma provincia, o una a menos de 300 m.
--
-- Por provincia: buenos_aires 52, catamarca 2, chaco 5, chubut 1, ciudad_autonoma_de_buenos_aires 5, cordoba 23, corrientes 1, entre_rios 6, formosa 1, jujuy 2, la_pampa 2, la_rioja 2, mendoza 3, misiones 23, neuquen 6, rio_negro 9, san_juan 2, san_luis 12, santa_cruz 1, santa_fe 29, santiago_del_estero 1, tucuman 1.

alter table public.canchas add column if not exists osm_id text unique;

create or replace function pg_temp.nombre_comparable(t text) returns text
language sql immutable as $f$
  select trim(regexp_replace(regexp_replace(regexp_replace(
    translate(lower(coalesce(t, '')), 'áéíóúüñ', 'aeiouun'),
    '[^a-z0-9 ]', ' ', 'g'),
    '\m(padel|paddle|club|de|la|el|del|cancha|canchas|complejo)\M', ' ', 'g'),
    '\s+', ' ', 'g'))
$f$;

drop table if exists pg_temp.osm;
create temp table osm (
  osm_id text, nombre text, direccion text, zona text, provincia text, telefono text,
  lat double precision, lng double precision
);

insert into osm values
  ('node/370131988', 'All Green Paddle', null, 'Paraná', 'entre_rios', null, -31.7384732, -60.502138),
  ('node/1769946940', 'La Horqueta Sports', 'Almirante Blanco Encalada 2405', 'San Isidro', 'buenos_aires', null, -34.4779768, -58.5722994),
  ('node/3194305518', 'Estación Deportes', 'Avenida del Libertador 2491', 'Vicente López', 'buenos_aires', '+54 11 4711-0411', -34.5072528, -58.479593),
  ('node/3308696076', 'Utopía Club de Paddle', 'Avenida Pedro de Castro Barros 5550', 'Rosario', 'santa_fe', null, -33.0008777, -60.6296685),
  ('node/3825599658', 'Polideportivo Comunal', null, 'Las Colonias', 'santa_fe', null, -31.6114196, -61.1394503),
  ('node/4410664545', 'Halcry.com', 'Avenida Del Libertador 6085', 'Comuna 13', 'ciudad_autonoma_de_buenos_aires', null, -34.5557085, -58.4482661),
  ('node/4512297843', 'El Pinar', null, 'General López', 'santa_fe', null, -33.4553435, -61.478196),
  ('node/4896249676', 'La Plazoleta', null, 'Moreno', 'buenos_aires', null, -34.6547944, -58.7919583),
  ('node/5415559644', 'La Quinta de Guemes Paddle', 'Gobernador Marcelino Ugarte 3749', 'Vicente López', 'buenos_aires', '+54 11 4756 3330', -34.5253269, -58.5143529),
  ('node/5415578486', 'Tobarra', 'Armenia 3869', 'Vicente López', 'buenos_aires', '+54 11 4763-0976', -34.5177659, -58.5315563),
  ('node/5415578487', 'Punta Verde', null, 'San Isidro', 'buenos_aires', '+54 11 4742-8131', -34.4735631, -58.5527468),
  ('node/5420277421', 'Passing Paddle', null, 'La Capital', 'santa_fe', null, -31.6562575, -60.7139903),
  ('node/6168004909', 'X3 Padel', 'Avenida Salvador Miqueri 2860', 'Ciudad de Misiones', 'misiones', null, -27.4075129, -55.9097473),
  ('node/6208501417', 'Lalo''s Padel', null, 'Cruz del Eje', 'cordoba', null, -30.7404962, -64.7895574),
  ('node/6947271113', 'Casablanca Pádel', null, 'San Antonio', 'rio_negro', null, -40.8119885, -65.0925344),
  ('node/7685938518', 'Villalonga Padel', 'Venezuela', 'Ciudad de Misiones', 'misiones', null, -27.4590922, -55.859635),
  ('node/9008741705', 'Victoria Paddle', 'Constitución 3484', 'San Fernando', 'buenos_aires', '+54 11 4746-3391', -34.4556602, -58.5375604),
  ('node/9008741706', 'Austral Tenis & Padel Club', 'Misiones 2550', 'San Isidro', 'buenos_aires', '+54 11 4406-0202', -34.4589264, -58.5389199),
  ('node/9010504177', 'Balcon Padel Reconquista', 'Habegger 1152', 'General Obligado', 'santa_fe', '+5493482508666', -29.1457767, -59.6509189),
  ('node/9089843178', 'El Bosque Padel', 'Gobernador Valentín Vergara 3352', 'Vicente López', 'buenos_aires', '+54 11 4761-7676', -34.5357139, -58.5053684),
  ('node/9711892123', 'Black', 'Avenida Tomás Guido', 'Ciudad de Misiones', 'misiones', null, -27.3867371, -55.9152457),
  ('node/10018269452', 'Club Atlético El Tala', '25 de Mayo 1598', 'Ciudad de Corrientes', 'corrientes', '+54 379 443 5768', -27.4650354, -58.8303723),
  ('node/10167141411', 'Colo Pádel', null, 'Tornquist', 'buenos_aires', null, -38.132651, -61.798701),
  ('node/10223811550', 'Cancha de Padel C.A.L.Ñ', null, '9 de Julio', 'buenos_aires', null, -35.4068186, -61.2102139),
  ('node/10722845142', 'New Padel', null, 'Cruz del Eje', 'cordoba', null, -30.7493756, -64.7880169),
  ('node/11049521463', 'Club Deportivo Juventud Unida', null, 'Alberti', 'buenos_aires', null, -35.0330122, -60.2852809),
  ('node/11070188595', 'El Rincon Padel', null, 'Chos Malal', 'neuquen', '+54 299 656 2746', -37.3472358, -70.273521),
  ('node/11097228250', 'El Castillo', null, 'Bolívar', 'buenos_aires', null, -36.2400591, -61.1175887),
  ('node/11143838692', 'Oriente Padel', null, 'General Manuel Belgrano', 'misiones', null, -26.2421003, -53.6570749),
  ('node/11244927145', 'Fisherton Pádel Club', null, 'Rosario', 'santa_fe', null, -32.9370492, -60.7580343),
  ('node/11332942605', 'La Barra Fútbol y Padel', 'Nicaragua 768', 'Eldorado', 'misiones', null, -26.400528, -54.644398),
  ('node/11500744046', 'Hit Paddle', 'Los Girasoles', 'Ciudad de Misiones', 'misiones', null, -27.4064899, -55.9955644),
  ('node/11777308160', 'Stock Center', '95 - San Lorenzo 3773', 'General San Martín', 'buenos_aires', '+54 11 4764-3993;+54 11 4738-5056', -34.5625188, -58.5580253),
  ('node/12103718946', 'Impacto', 'General San Martín 562', 'General Roca', 'rio_negro', null, -38.9405182, -67.9944793),
  ('node/12111405049', 'Palomar Paddle & Drinks', 'Avenida Mariano Moreno', 'Ciudad de Misiones', 'misiones', null, -27.3809713, -55.8978468),
  ('node/12188256484', 'Corner Paddle', null, 'General Las Heras', 'buenos_aires', null, -34.9239218, -58.9442883),
  ('node/12305193938', 'Center padel', 'Avenida Del Valle 700', 'Tandil', 'buenos_aires', null, -37.3125537, -59.142235),
  ('node/12459833490', 'First Padel Center', null, 'Comuna 15', 'ciudad_autonoma_de_buenos_aires', null, -34.5943412, -58.4924778),
  ('node/12654062827', 'Drive Pádel Club', null, 'Ciudad de La Rioja', 'la_rioja', null, -29.406879, -66.9035083),
  ('node/12902316111', 'Fpadel', null, 'Colón', 'cordoba', null, -31.0189897, -64.27382),
  ('node/12952129249', 'Canchas de Padel Contin', null, 'Marcos Juárez', 'cordoba', null, -33.4652226, -62.4416443),
  ('node/12989822572', 'Ruka Tigre (Paddle Club)', null, 'Tigre', 'buenos_aires', null, -34.4363568, -58.5937715),
  ('node/13081541406', 'Padel Rys', 'Los Cedros', 'Iguazú', 'misiones', null, -25.604041, -54.5737366),
  ('node/13116952498', 'Galpon Paddle', null, 'General Las Heras', 'buenos_aires', null, -34.9185895, -58.9531322),
  ('node/13270535836', 'La Torre Paddle Club', null, 'Vera', 'santa_fe', null, -29.4594008, -60.2107791),
  ('node/13459065454', 'PAL+ Sports Formosa', 'Avenida 25 de Mayo 522', 'Formosa', 'formosa', null, -26.1840525, -58.1698749),
  ('node/13535640196', 'Padel Center La Costa', null, 'La Costa', 'buenos_aires', null, -36.5965669, -56.7128366),
  ('node/13641400714', 'Aerosport Funes', null, 'Rosario', 'santa_fe', null, -32.9157263, -60.790515),
  ('node/13839723181', 'Andresito Padel', 'Avenida El Libertador', 'General Manuel Belgrano', 'misiones', null, -25.6677981, -54.0450134),
  ('node/13859079335', 'Padel House', 'Avenida Chacabuco 2813', 'Ciudad de Misiones', 'misiones', '+54 3764502076', -27.3870713, -55.9071422),
  ('node/13954843069', 'Club Social', null, 'General Roca', 'cordoba', null, -34.8408339, -64.3731106),
  ('node/13955203827', 'Club Atlético Talleres', null, 'General Roca', 'cordoba', null, -34.8399953, -64.3864866),
  ('node/14042840990', 'La Raquette', 'Mariano Moreno 376', 'Ciudad de Córdoba', 'cordoba', '+54 9 3512 94-1013', -31.4166034, -64.199265),
  ('node/14237791226', 'Taruma Padel', null, 'Oberá', 'misiones', null, -27.4836343, -55.1100773),
  ('way/121041878', 'El Fuerte Padel', null, 'Ciudad de Catamarca', 'catamarca', null, -28.4613953, -65.7537602),
  ('way/139314466', 'UN Paddle Club', null, 'Ciudad de Córdoba', 'cordoba', null, -31.4368823, -64.181956),
  ('way/147718142', 'Los Aromos', 'Avenida Francisco de Viedma 1674', 'Adolfo Alsina', 'rio_negro', null, -40.8199017, -62.9715259),
  ('way/155800802', 'Bio Far', null, 'Dr. Manuel Belgrano', 'jujuy', null, -24.1826293, -65.2819428),
  ('way/172166840', 'Futbol 5 & Paddle', null, 'Godoy Cruz', 'mendoza', null, -32.9235373, -68.8590335),
  ('way/185171612', 'Club Bartolomé Mitre', null, 'Rosario', 'santa_fe', null, -33.0053161, -60.7788295),
  ('way/186501344', 'Paddle Chacabuco', null, 'Godoy Cruz', 'mendoza', null, -32.9173198, -68.8475935),
  ('way/202855430', 'Club Social y Deportivo Federación', 'Pio XII', 'Federación', 'entre_rios', '+543456481528', -30.9845832, -57.9168678),
  ('way/221518575', 'Tolentina Paddle Club', null, 'Godoy Cruz', 'mendoza', null, -32.9246592, -68.859844),
  ('way/228880629', 'La Caleta Club de Padel', 'Boulevard Sarmiento 2275', 'General San Martín', 'cordoba', null, -32.4094283, -63.2247219),
  ('way/228881312', 'El Galpón Paddle Club', 'Las Heras 1454', 'General San Martín', 'cordoba', null, -32.4174657, -63.2315868),
  ('way/249503519', 'Club El Porvenir', null, 'Chilecito', 'la_rioja', null, -29.1539324, -67.4971925),
  ('way/275605723', 'City Padel Club', null, 'Ciudad de Catamarca', 'catamarca', null, -28.4530691, -65.7503062),
  ('way/287305289', 'Sede Social Centro Recreativo Calchaquí', 'San Martín 917', 'Vera', 'santa_fe', null, -29.8851354, -60.286656),
  ('way/295761431', 'Arabian', 'República del Libano 399', 'Ciudad de Córdoba', 'cordoba', '+5493515398206', -31.3959751, -64.173389),
  ('way/304161219', 'Club AGP Social y Deportivo', null, 'General Pueyrredón', 'buenos_aires', null, -38.0495255, -57.5443379),
  ('way/306430689', 'Play Time', null, 'General Pueyrredón', 'buenos_aires', null, -37.9542921, -57.5749497),
  ('way/310500652', 'Parque Tenis', 'América 4434', 'La Matanza', 'buenos_aires', '+54 11 4669-3716', -34.6782429, -58.5941064),
  ('way/323173758', 'La Terraza', 'Avenida Santa Catalina 4150', 'Ciudad de Misiones', 'misiones', null, -27.3858662, -55.9121129),
  ('way/327512891', 'Telepadel', null, 'San Ignacio', 'misiones', null, -27.1953485, -55.4750904),
  ('way/336930122', 'Puro Pádel Funes', 'Juan Gregorio de Las Heras 2090', 'Rosario', 'santa_fe', '+54 9 341 555-0800', -32.9135431, -60.8610947),
  ('way/380103961', 'Schwank Tennis & Paddle Center', 'Esquivel 2537', 'San Lorenzo', 'santa_fe', null, -32.9302999, -60.8916344),
  ('way/389513480', 'La Barranca', null, 'Tigre', 'buenos_aires', null, -34.4528986, -58.6433307),
  ('way/390172129', 'Club Social', 'Doctor Pedro Loretto', 'General López', 'santa_fe', null, -34.0031759, -61.9030984),
  ('way/390172131', 'Nueva Era Paddel', 'Saenz Peña', 'General López', 'santa_fe', null, -34.0115486, -61.9183577),
  ('way/396121972', 'Tute Pádel', 'Estados Unidos 367', 'Adolfo Alsina', 'rio_negro', null, -40.8142433, -63.010858),
  ('way/431451856', 'Cancha Paddle U.N.J.U.', null, 'Dr. Manuel Belgrano', 'jujuy', null, -24.1789414, -65.3257474),
  ('way/447791873', 'Royal Padel', 'General Paz', 'Ciudad de Misiones', 'misiones', null, -27.367346, -55.8885609),
  ('way/447792948', 'El Puente padel', 'Avenida Mitre 1301', 'Ciudad de Misiones', 'misiones', null, -27.3756559, -55.8902158),
  ('way/447793206', 'The New Play Time Paddle', 'Santiago del Estero 1249', 'Ciudad de Misiones', 'misiones', '+54 376 427 1328', -27.3744243, -55.8888),
  ('way/447793370', 'Hormigonera Padel', 'Avenida López y Planes 3063', 'Ciudad de Misiones', 'misiones', '+54 376 4835575', -27.3736267, -55.9078684),
  ('way/447793663', 'Kuglas Padel', 'Avenida Uruguay 3340', 'Ciudad de Misiones', 'misiones', '+54 376 443 0946', -27.3804463, -55.8996659),
  ('way/463800895', 'New Balance', 'Vélez Sarsfield 3180', 'San Isidro', 'buenos_aires', '+54 11 4505-1758', -34.5057459, -58.5329605),
  ('way/463966467', 'La Red', 'Calle 53', 'Berazategui', 'buenos_aires', null, -34.8173953, -58.1934871),
  ('way/464842335', 'TenisLand', 'Avenida Santa Fe 1676', 'San Isidro', 'buenos_aires', '+54 11 4793-3115', -34.4870332, -58.5015889),
  ('way/466988979', 'Club Social y Deportivo Las Heras', '49 - Libertad 5052', 'General San Martín', 'buenos_aires', null, -34.5447529, -58.5518662),
  ('way/471919216', 'Stadium Paddle', 'Álvarez Jonte', 'Comuna 10', 'ciudad_autonoma_de_buenos_aires', null, -34.6149131, -58.4959996),
  ('way/475171120', 'PaddleJardín Pynandí', null, 'Ciudad de Misiones', 'misiones', null, -27.367086, -55.9381352),
  ('way/497486529', 'Diagonal Padel', null, 'San Antonio', 'rio_negro', null, -41.6046476, -65.3535354),
  ('way/516882109', 'Club Canottieri Italiani', null, 'Tigre', 'buenos_aires', '+54 11 7637 4720', -34.4190206, -58.5779173),
  ('way/542473860', 'Club Social Aldao', null, 'San Lorenzo', 'santa_fe', null, -32.708015, -60.8147552),
  ('way/543527864', 'Complejo Sports 7', 'Avenida Lavalle', 'Berazategui', 'buenos_aires', null, -34.7760567, -58.2552235),
  ('way/547540539', 'Club Azucena', null, 'Yerba Buena', 'tucuman', null, -26.821086, -65.2724831),
  ('way/585712301', 'Cuvio Tenis', 'Pueyrredón 2555', 'Rosario', 'santa_fe', null, -32.9750303, -60.6648574),
  ('way/601816236', 'Los Troncos Paddle', 'Avenida Carlos Pontin 288', 'San Justo', 'cordoba', null, -31.4226728, -63.0570019),
  ('way/604385370', 'Cancha de Padde 2', null, 'Tigre', 'buenos_aires', null, -34.4337651, -58.5914524),
  ('way/616399624', 'C.S.C y D Belgrano', null, 'General Arenales', 'buenos_aires', null, -34.3002994, -61.2984524),
  ('way/632281854', 'Cancha Municipal de Padel', null, 'General Paz', 'buenos_aires', null, -35.52188, -58.3177359),
  ('way/685153532', 'El Balcón', null, 'Ciudad de Córdoba', 'cordoba', null, -31.3809641, -64.2124543),
  ('way/688942888', 'Club Gas del Estado', null, 'Guasayán', 'santiago_del_estero', null, -28.1969179, -65.1098013),
  ('way/698364322', 'Club Bartolomé Mitre', null, 'Rosario', 'santa_fe', null, -33.0050215, -60.7720839),
  ('way/717791829', 'La Escondida', 'Avenida Amenedo 2000', 'Almirante Brown', 'buenos_aires', null, -34.7894229, -58.3845547),
  ('way/757448900', 'Punto Urbano', 'Ingeniero Olmos 325', 'Santa María', 'cordoba', null, -31.6546207, -64.4311168),
  ('way/761565415', 'Centro Comercial', null, 'Presidente Roque Sáenz Peña', 'cordoba', null, -34.1303221, -63.3777512),
  ('way/816403404', 'La Rural Paddle Center', 'Carlos Pellegrini 1440', 'Concordia', 'entre_rios', null, -31.3832725, -58.0137017),
  ('way/841974017', 'Sportman Club', null, 'Rawson', 'chubut', null, -43.2561419, -65.3010831),
  ('way/842214375', 'Complejo Deportivo Pueyrredón', null, 'General López', 'santa_fe', null, -33.7393563, -61.9626584),
  ('way/878976393', 'Club Deportivo y Social Aguas Buenas', 'Presidente Alvear', 'Chapaleufú', 'la_pampa', '+54 9 230 231-2811', -35.0262589, -63.9134866),
  ('way/902853780', 'La Campiña', null, '9 de Julio', 'buenos_aires', null, -35.4606712, -60.8869923),
  ('way/904733609', 'Jockey Club', null, 'Cruz del Eje', 'cordoba', null, -30.7554107, -64.7700404),
  ('way/917256232', 'Polideportivo n° 9', 'Serrano', 'San Fernando', 'buenos_aires', '+54 11 5245-6261', -34.4754029, -58.5991579),
  ('way/960831258', 'Locos por El Padel', null, 'San Justo', 'cordoba', null, -31.3972, -62.3009905),
  ('way/989344955', 'El Arisco', null, 'Almirante Brown', 'chaco', null, -26.4039679, -61.4196448),
  ('way/989345747', 'Complejo "Ruedita"', null, 'Almirante Brown', 'chaco', null, -26.4041707, -61.4177947),
  ('way/989347031', 'Waly Padel', null, 'Almirante Brown', 'chaco', null, -26.4020281, -61.412489),
  ('way/1013310640', 'Toco & Voy', 'Azcuénaga 965', 'General López', 'santa_fe', null, -34.2736543, -62.7014178),
  ('way/1013313810', 'Complejo Offside', 'Santa Fe 1126', 'General López', 'santa_fe', null, -34.2609434, -62.7262207),
  ('way/1015875826', 'Paddel', 'Dr. Emilio A. Carballeira 245', 'General López', 'santa_fe', null, -34.2645361, -62.7087338),
  ('way/1025164953', 'Club de Empleados Cooperativa', null, 'Cainguás', 'misiones', null, -27.0232501, -54.6920731),
  ('way/1042044655', 'Richi Padel Club', 'Avenida Carlos María de Alvear 901', 'San Fernando', 'chaco', '+54 362 4810987', -27.4505317, -59.0019866),
  ('way/1057945283', 'Club Atlético y Deportivo de Acevedo', null, 'Pergamino', 'buenos_aires', null, -33.7516274, -60.436054),
  ('way/1061281336', 'Cancha de padel Almirante Brown', null, 'Federación', 'entre_rios', null, -30.9813448, -57.927763),
  ('way/1068554436', 'Center Gol', 'Luis B Negretti 567', 'Junín', 'buenos_aires', null, -34.5909768, -60.9629668),
  ('way/1073254807', 'Winter Padel Club', 'General Winter', 'Confluencia', 'neuquen', null, -38.9554661, -68.0485221),
  ('way/1133151909', 'Go Padel Pergamino', null, 'Pergamino', 'buenos_aires', null, -33.9047338, -60.5604687),
  ('way/1133328835', 'Ballesta', '61 - Lacroze', 'General San Martín', 'buenos_aires', null, -34.5472043, -58.5547703),
  ('way/1133330912', 'Paddle SAGVB', null, 'General San Martín', 'buenos_aires', null, -34.5492514, -58.5824343),
  ('way/1162338659', 'Las Barricas Padel', 'Avenida Mariano Moreno 435', 'General Roca', 'rio_negro', null, -38.9320727, -68.0064557),
  ('way/1174456661', 'La terraza Padel', null, 'Balcarce', 'buenos_aires', null, -37.8483251, -58.262555),
  ('way/1174472695', 'La Curva Padel Indoor', null, 'Punilla', 'cordoba', null, -31.256205, -64.4660892),
  ('way/1185178804', 'La Jungla Pádel', 'Fernando Meineke S/N', 'Confluencia', 'neuquen', null, -38.9429588, -69.2103294),
  ('way/1185614758', 'Asociación Italiana "Leonardo Da Vinci"', '55 - Buenos Aires 7008', 'General San Martín', 'buenos_aires', null, -34.5325981, -58.5705009),
  ('way/1198044085', 'Punto de Oro', 'América 98 bis', 'General López', 'santa_fe', '+54 3382 444003', -34.2608482, -62.706517),
  ('way/1211986738', 'Club Lomas de San Martín', 'Diagonal 143 - Edison 6439', 'General San Martín', 'buenos_aires', null, -34.5640571, -58.590097),
  ('way/1216520761', 'Complejo Center', null, 'Confluencia', 'neuquen', '+54 299 547 4724', -38.8215366, -68.1111034),
  ('way/1218407008', 'West Paddle', null, 'Rivadavia', 'san_juan', null, -31.5275232, -68.5796337),
  ('way/1225107056', 'Tercer Tiempo', 'Avenida General Paz 1075', 'General Roca', 'rio_negro', '+54 299 635-6847', -38.944567, -67.9887591),
  ('way/1228129534', 'Club El Manzanar', 'Los Alerces 1414', 'General Roca', 'rio_negro', null, -38.9508168, -67.9845088),
  ('way/1231641567', 'My Padel', null, 'Luján', 'buenos_aires', null, -34.5551462, -59.1254323),
  ('way/1252872344', 'Menorca Paddle', null, 'La Capital', 'santa_fe', null, -31.633805, -60.6221409),
  ('way/1255624392', 'Mandy Padel', null, 'Ciudad de San Juan', 'san_juan', null, -31.5452572, -68.5548396),
  ('way/1274772920', 'La Esquina Paddle', null, 'General San Martín', 'buenos_aires', null, -34.5897135, -58.5479973),
  ('way/1277947036', 'La Bandeja', 'La Plata', 'Chacabuco', 'chaco', null, -27.2177245, -61.205345),
  ('way/1282040345', 'Deportivo Italiano', 'Avenida Presidente Perón 6565', 'Rosario', 'santa_fe', null, -32.9674527, -60.7090353),
  ('way/1287890931', 'Alem Padel Center', '86 - Leandro N. Alem 2958', 'General San Martín', 'buenos_aires', null, -34.5596546, -58.5465307),
  ('way/1293466334', 'Pádel STIHMPRA', null, 'General Roca', 'rio_negro', null, -38.9572304, -67.9264771),
  ('way/1296160478', 'El Tucán', null, 'Calamuchita', 'cordoba', '+5493546451733', -32.0723559, -64.5409562),
  ('way/1301842853', 'Solar', null, 'General Pedernera', 'san_luis', null, -33.6956112, -65.4358088),
  ('way/1311138813', 'Tres Sierras Pádel Club', null, 'Santa María', 'cordoba', null, -31.6363708, -64.420833),
  ('way/1316257230', 'Palmares Pádel Club', null, 'San Lorenzo', 'santa_fe', null, -32.9310456, -60.873948),
  ('way/1319021303', 'Punto Padel', 'Erwin Tito Geisert', 'Montecarlo', 'misiones', null, -26.5700887, -54.7775738),
  ('way/1329988404', 'pucura', null, 'Tandil', 'buenos_aires', null, -37.3589309, -59.124503),
  ('way/1334302713', 'Unici', 'Antonio Rebagliatti 789', 'Salto', 'buenos_aires', null, -34.2790862, -60.2412603),
  ('way/1334986573', 'NorPádel', 'Avenida del Lago', 'Federación', 'entre_rios', null, -30.9645819, -57.9376302),
  ('way/1348314330', 'Grand Slam Padel', null, 'General San Martín', 'cordoba', null, -32.4362547, -63.2411922),
  ('way/1348314644', 'Villa María Padel', null, 'General San Martín', 'cordoba', null, -32.3835104, -63.2389364),
  ('way/1356005407', 'Sport Club Arenal', 'Los Pinos 102', 'Lácar', 'neuquen', null, -40.1519904, -71.3141768),
  ('way/1356420467', 'Yamil Padel', null, 'General Pedernera', 'san_luis', null, -33.6396447, -65.4488127),
  ('way/1357804873', 'Belmur Padel CLub', null, 'General Pedernera', 'san_luis', null, -33.6773271, -65.4400304),
  ('way/1359707422', 'Deportivo Estrella Andina', 'Callejón de Bello 120', 'Lácar', 'neuquen', null, -40.1385478, -71.2959953),
  ('way/1362432495', 'El Campus Pádel Club', null, 'Rosario', 'santa_fe', null, -32.9348097, -60.8121836),
  ('way/1369173115', 'Quinta La Aguada', null, 'General Pedernera', 'san_luis', null, -33.6796676, -65.4976841),
  ('way/1375616275', 'Club el Viejo Lobo', null, 'General Pedernera', 'san_luis', null, -33.686317, -65.4548038),
  ('way/1411167357', 'Smash Padel Club', null, 'General Pedernera', 'san_luis', null, -33.6749942, -65.4725818),
  ('way/1411937520', 'Pádel Club El Volcán', null, 'Juan Martín de Pueyrredón', 'san_luis', null, -33.2488032, -66.1943125),
  ('way/1416550321', 'Complejo 11 de Julio', null, 'Deseado', 'santa_cruz', null, -46.5425417, -68.9292991),
  ('way/1417561170', 'San Andrés Padel Club', 'Formosa', 'San Lorenzo', 'santa_fe', null, -32.9007828, -60.8939735),
  ('way/1443821834', 'Frana Complejo Padel', 'Comandante Miño', 'Ciudad de Misiones', 'misiones', '+54 3764366622', -27.4018856, -55.9190762),
  ('way/1443822315', 'Arena Paddle', 'Avenida Quaranta 3753', 'Ciudad de Misiones', 'misiones', '+543764333036', -27.4033628, -55.9185599),
  ('way/1446293671', 'Padel Tour - Fernández Prieto', null, 'Comuna 1', 'ciudad_autonoma_de_buenos_aires', null, -34.6199454, -58.3621768),
  ('way/1458638103', 'Médanos Verdes Pádel Club', 'Avenida Doctor Palacios 1821', 'Ciudad de La Pampa', 'la_pampa', null, -36.6254139, -64.2564799),
  ('way/1473492480', 'Nico La Canchita', null, 'La Costa', 'buenos_aires', null, -36.4843623, -56.7029825),
  ('way/1488467383', 'Centro de Educación Física N°5', 'General Rudesindo Alvarado 1300-1392', 'Paraná', 'entre_rios', '+54 343 4373105', -31.7470525, -60.539772),
  ('way/1497056540', 'Mercedes Padel Club', null, 'General Pedernera', 'san_luis', null, -33.6824799, -65.4524976),
  ('way/1510171659', 'Padel Le Bretón', null, 'Comuna 12', 'ciudad_autonoma_de_buenos_aires', null, -34.575372, -58.4978746),
  ('way/1512138799', 'Polideportivo Municipal Horacio José Imberti', null, 'General Pedernera', 'san_luis', null, -33.6655361, -65.4587833),
  ('way/1515772715', 'Blue Padel', 'Prudencio Bustos 873', 'Santa María', 'cordoba', '+54 3547 54 4042', -31.6496791, -64.4281758),
  ('way/1522833492', 'Power Padel', null, 'General Pedernera', 'san_luis', null, -33.6942949, -65.444157),
  ('way/1530614993', 'Pádel CB', null, 'General Pedernera', 'san_luis', null, -33.6806172, -65.4811415),
  ('way/1532904586', 'Boulevard Paddle', null, 'Tigre', 'buenos_aires', null, -34.4214434, -58.5833581),
  ('way/1546208979', 'Club Italini Uniti Di Caseros', '528 - Dante 4721', 'Tres de Febrero', 'buenos_aires', '+541130090607', -34.5973827, -58.5622416),
  ('way/1546208980', 'Santos Lugares Padel - Fútbol 5', '528 - Dante 3965', 'Tres de Febrero', 'buenos_aires', '+54 11 4712 6503', -34.5981776, -58.5502789),
  ('way/1561443123', 'Bajo Belgrano', null, 'General Pedernera', 'san_luis', null, -33.6906634, -65.4697359),
  ('relation/6016118', 'Kentucky Club House', null, 'Rosario', 'santa_fe', null, -32.9441589, -60.8323898),
  ('relation/12885647', 'Rosario Arena Sport Center', null, 'Rosario', 'santa_fe', null, -32.9079925, -60.7314898);

insert into public.canchas (osm_id, nombre, direccion, zona, provincia, telefono, lat, lng)
select o.osm_id, o.nombre, o.direccion, o.zona, o.provincia, o.telefono, o.lat, o.lng
from osm o
where not exists (select 1 from public.canchas c where c.osm_id = o.osm_id)
  and not exists (
    select 1 from public.canchas c
    where c.provincia = o.provincia
      and pg_temp.nombre_comparable(c.nombre) <> ''
      and (pg_temp.nombre_comparable(c.nombre) = pg_temp.nombre_comparable(o.nombre)
           or pg_temp.nombre_comparable(c.nombre) like '%' || pg_temp.nombre_comparable(o.nombre) || '%'
           or pg_temp.nombre_comparable(o.nombre) like '%' || pg_temp.nombre_comparable(c.nombre) || '%')
  )
  and not exists (
    select 1 from public.canchas c
    where c.lat is not null
      and abs(c.lat - o.lat) * 111000 < 300
      and abs(c.lng - o.lng) * 111000 * cos(radians(o.lat)) < 300
  );

-- Para revisar: cuántas canchas quedaron por provincia y de dónde salieron.
select provincia, count(*) as canchas, count(atc_id) as de_atc, count(osm_id) as de_osm
from public.canchas group by provincia order by provincia;
