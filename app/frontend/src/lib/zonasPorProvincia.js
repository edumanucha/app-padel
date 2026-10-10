// Zonas del perfil por provincia (2026-10-10, pedido del usuario: "cuando
// seleccionamos determinada provincia que nos muestre las localidades de la
// provincia"). Eligió departamentos/partidos (listas cortas): son los de
// georef (datos.gob.ar), salvo CABA, que va por sus 48 barrios en vez de
// las 15 comunas. El departamento "Capital" se muestra como "Ciudad de
// <provincia>". El valor guardado en perfiles.zona es el nombre en
// minúsculas, sin tildes y con guiones bajos, igual que antes en Mendoza
// ("ciudad_de_mendoza", "godoy_cruz"...), así los perfiles viejos siguen
// andando.

export const slugZona = (nombre) =>
  nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

const NOMBRES = {
  buenos_aires: ["25 de Mayo", "9 de Julio", "Adolfo Alsina", "Adolfo Gonzales Chaves", "Alberti", "Almirante Brown", "Arrecifes", "Avellaneda", "Ayacucho", "Azul", "Bahía Blanca", "Balcarce", "Baradero", "Benito Juárez", "Berazategui", "Berisso", "Bolívar", "Bragado", "Brandsen", "Campana", "Cañuelas", "Capitán Sarmiento", "Carlos Casares", "Carlos Tejedor", "Carmen de Areco", "Castelli", "Chacabuco", "Chascomús", "Chivilcoy", "Colón", "Coronel de Marina Leonardo Rosales", "Coronel Dorrego", "Coronel Pringles", "Coronel Suárez", "Daireaux", "Dolores", "Ensenada", "Escobar", "Esteban Echeverría", "Exaltación de la Cruz", "Ezeiza", "Florencio Varela", "Florentino Ameghino", "General Alvarado", "General Alvear", "General Arenales", "General Belgrano", "General Guido", "General Juan Madariaga", "General La Madrid", "General Las Heras", "General Lavalle", "General Paz", "General Pinto", "General Pueyrredón", "General Rodríguez", "General San Martín", "General Viamonte", "General Villegas", "Guaminí", "Hipólito Yrigoyen", "Hurlingham", "Ituzaingó", "José C. Paz", "Junín", "La Costa", "La Matanza", "La Plata", "Lanús", "Laprida", "Las Flores", "Leandro N. Alem", "Lezama", "Lincoln", "Lobería", "Lobos", "Lomas de Zamora", "Luján", "Magdalena", "Maipú", "Malvinas Argentinas", "Mar Chiquita", "Marcos Paz", "Mercedes", "Merlo", "Monte", "Monte Hermoso", "Moreno", "Morón", "Navarro", "Necochea", "Olavarría", "Patagones", "Pehuajó", "Pellegrini", "Pergamino", "Pila", "Pilar", "Pinamar", "Presidente Perón", "Puán", "Punta Indio", "Quilmes", "Ramallo", "Rauch", "Rivadavia", "Rojas", "Roque Pérez", "Saavedra", "Saladillo", "Salliqueló", "Salto", "San Andrés de Giles", "San Antonio de Areco", "San Cayetano", "San Fernando", "San Isidro", "San Miguel", "San Nicolás", "San Pedro", "San Vicente", "Suipacha", "Tandil", "Tapalqué", "Tigre", "Tordillo", "Tornquist", "Trenque Lauquen", "Tres Arroyos", "Tres de Febrero", "Tres Lomas", "Vicente López", "Villa Gesell", "Villarino", "Zárate"],
  catamarca: ["Ambato", "Ancasti", "Andalgalá", "Antofagasta de la Sierra", "Belén", "Capayán", "Ciudad de Catamarca", "El Alto", "Fray Mamerto Esquiú", "La Paz", "Paclín", "Pomán", "Santa María", "Santa Rosa", "Tinogasta", "Valle Viejo"],
  chaco: ["12 de Octubre", "1° de Mayo", "25 de Mayo", "2 de Abril", "9 de Julio", "Almirante Brown", "Bermejo", "Chacabuco", "Comandante Fernández", "Fray Justo Santa María de Oro", "General Belgrano", "General Donovan", "General Güemes", "Independencia", "Libertad", "Libertador General San Martín", "Maipú", "Mayor Luis J. Fontana", "O'Higgins", "Presidencia de la Plaza", "Quitilipi", "San Fernando", "San Lorenzo", "Sargento Cabral", "Tapenagá"],
  chubut: ["Biedma", "Cushamen", "Escalante", "Florentino Ameghino", "Futaleufú", "Gaiman", "Gastre", "Languiñeo", "Mártires", "Paso de Indios", "Rawson", "Río Senguer", "Sarmiento", "Tehuelches", "Telsen"],
  ciudad_autonoma_de_buenos_aires: ["Agronomía", "Almagro", "Balvanera", "Barracas", "Belgrano", "Boedo", "Caballito", "Chacarita", "Coghlan", "Colegiales", "Constitución", "Flores", "Floresta", "La Boca", "La Paternal", "Liniers", "Mataderos", "Monte Castro", "Montserrat", "Nueva Pompeya", "Núñez", "Palermo", "Parque Avellaneda", "Parque Chacabuco", "Parque Chas", "Parque Patricios", "Puerto Madero", "Recoleta", "Retiro", "Saavedra", "San Cristóbal", "San Nicolás", "San Telmo", "Vélez Sarsfield", "Versalles", "Villa Crespo", "Villa del Parque", "Villa Devoto", "Villa General Mitre", "Villa Lugano", "Villa Luro", "Villa Ortúzar", "Villa Pueyrredón", "Villa Real", "Villa Riachuelo", "Villa Santa Rita", "Villa Soldati", "Villa Urquiza"],
  cordoba: ["Calamuchita", "Ciudad de Córdoba", "Colón", "Cruz del Eje", "General Roca", "General San Martín", "Ischilín", "Juárez Celman", "Marcos Juárez", "Minas", "Pocho", "Presidente Roque Sáenz Peña", "Punilla", "Río Cuarto", "Río Primero", "Río Seco", "Río Segundo", "San Alberto", "San Javier", "San Justo", "Santa María", "Sobremonte", "Tercero Arriba", "Totoral", "Tulumba", "Unión"],
  corrientes: ["Bella Vista", "Berón de Astrada", "Ciudad de Corrientes", "Concepción", "Curuzú Cuatiá", "Empedrado", "Esquina", "General Alvear", "General Paz", "Goya", "Itatí", "Ituzaingó", "Lavalle", "Mburucuyá", "Mercedes", "Monte Caseros", "Paso de los Libres", "Saladas", "San Cosme", "San Luis del Palmar", "San Martín", "San Miguel", "San Roque", "Santo Tomé", "Sauce"],
  entre_rios: ["Colón", "Concordia", "Diamante", "Federación", "Federal", "Feliciano", "Gualeguay", "Gualeguaychú", "Islas del Ibicuy", "La Paz", "Nogoyá", "Paraná", "San Salvador", "Tala", "Uruguay", "Victoria", "Villaguay"],
  formosa: ["Bermejo", "Formosa", "Laishi", "Matacos", "Patiño", "Pilagás", "Pilcomayo", "Pirané", "Ramón Lista"],
  jujuy: ["Cochinoca", "Dr. Manuel Belgrano", "El Carmen", "Humahuaca", "Ledesma", "Palpalá", "Rinconada", "San Antonio", "San Pedro", "Santa Bárbara", "Santa Catalina", "Susques", "Tilcara", "Tumbaya", "Valle Grande", "Yavi"],
  la_pampa: ["Atreucó", "Caleu Caleu", "Catriló", "Chalileo", "Chapaleufú", "Chical Co", "Ciudad de La Pampa", "Conhelo", "Curacó", "Guatraché", "Hucal", "Lihuel Calel", "Limay Mahuida", "Loventué", "Maracó", "Puelén", "Quemú Quemú", "Rancul", "Realicó", "Toay", "Trenel", "Utracán"],
  la_rioja: ["Ángel Vicente Peñaloza", "Arauco", "Castro Barros", "Chamical", "Chilecito", "Ciudad de La Rioja", "Famatina", "General Belgrano", "General Felipe Varela", "General Juan Facundo Quiroga", "General Lamadrid", "General Ortiz de Ocampo", "General San Martín", "Independencia", "Rosario Vera Peñaloza", "San Blas de Los Sauces", "Sanagasta", "Vinchina"],
  mendoza: ["Ciudad de Mendoza", "General Alvear", "Godoy Cruz", "Guaymallén", "Junín", "La Paz", "Las Heras", "Lavalle", "Luján de Cuyo", "Maipú", "Malargüe", "Rivadavia", "San Carlos", "San Martín", "San Rafael", "Santa Rosa", "Tunuyán", "Tupungato"],
  misiones: ["25 de Mayo", "Apóstoles", "Cainguás", "Candelaria", "Ciudad de Misiones", "Concepción", "Eldorado", "General Manuel Belgrano", "Guaraní", "Iguazú", "Leandro N. Alem", "Libertador General San Martín", "Montecarlo", "Oberá", "San Ignacio", "San Javier", "San Pedro"],
  neuquen: ["Aluminé", "Añelo", "Catán Lil", "Chos Malal", "Collón Curá", "Confluencia", "Huiliches", "Lácar", "Loncopué", "Los Lagos", "Minas", "Ñorquín", "Pehuenches", "Picún Leufú", "Picunches", "Zapala"],
  rio_negro: ["25 de Mayo", "9 de Julio", "Adolfo Alsina", "Avellaneda", "Bariloche", "Conesa", "El Cuy", "General Roca", "Ñorquinco", "Pichi Mahuida", "Pilcaniyeu", "San Antonio", "Valcheta"],
  salta: ["Anta", "Cachi", "Cafayate", "Cerrillos", "Chicoana", "Ciudad de Salta", "General Güemes", "General José de San Martín", "Guachipas", "Iruya", "La Caldera", "La Candelaria", "La Poma", "La Viña", "Los Andes", "Metán", "Molinos", "Orán", "Rivadavia", "Rosario de la Frontera", "Rosario de Lerma", "San Carlos", "Santa Victoria"],
  san_juan: ["25 de Mayo", "9 de Julio", "Albardón", "Angaco", "Calingasta", "Caucete", "Chimbas", "Ciudad de San Juan", "Iglesia", "Jáchal", "Pocito", "Rawson", "Rivadavia", "San Martín", "Santa Lucía", "Sarmiento", "Ullum", "Valle Fértil", "Zonda"],
  san_luis: ["Ayacucho", "Belgrano", "Chacabuco", "Coronel Pringles", "General Pedernera", "Gobernador Dupuy", "Juan Martín de Pueyrredón", "Junín", "Libertador General San Martín"],
  santa_cruz: ["Corpen Aike", "Deseado", "Güer Aike", "Lago Argentino", "Lago Buenos Aires", "Magallanes", "Río Chico"],
  santa_fe: ["9 de Julio", "Belgrano", "Caseros", "Castellanos", "Constitución", "Garay", "General López", "General Obligado", "Iriondo", "La Capital", "Las Colonias", "Rosario", "San Cristóbal", "San Javier", "San Jerónimo", "San Justo", "San Lorenzo", "San Martín", "Vera"],
  santiago_del_estero: ["Aguirre", "Alberdi", "Atamisqui", "Avellaneda", "Banda", "Belgrano", "Choya", "Ciudad de Santiago del Estero", "Copo", "Figueroa", "General Taboada", "Guasayán", "Jiménez", "Juan Felipe Ibarra", "Loreto", "Mitre", "Moreno", "Ojo de Agua", "Pellegrini", "Quebrachos", "Río Hondo", "Rivadavia", "Robles", "Salavina", "San Martín", "Sarmiento", "Silípica"],
  tierra_del_fuego: ["Antártida Argentina", "Islas del Atlántico Sur", "Río Grande", "Tolhuin", "Ushuaia"],
  tucuman: ["Burruyacú", "Chicligasta", "Ciudad de Tucumán", "Cruz Alta", "Famaillá", "Graneros", "Juan Bautista Alberdi", "La Cocha", "Leales", "Lules", "Monteros", "Río Chico", "Simoca", "Tafí del Valle", "Tafí Viejo", "Trancas", "Yerba Buena"],
};

export const OTRA_ZONA_VALOR = "otra_zona";

// Las opciones de la provincia, en el formato { valor, etiqueta } de los selects.
export function zonasDe(provincia) {
  return (NOMBRES[provincia] ?? []).map((etiqueta) => ({ valor: slugZona(etiqueta), etiqueta }));
}

// Nombre para mostrar de una zona guardada (busca en todas las provincias).
export function etiquetaZona(valor) {
  for (const nombres of Object.values(NOMBRES)) {
    const n = nombres.find((e) => slugZona(e) === valor);
    if (n) return n;
  }
  return null;
}
