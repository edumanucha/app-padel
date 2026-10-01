// Datos inventados para sacar capturas de las pantallas con sesión SIN tocar
// la base real (2026-10-01, para el libro de diseño). Nombres de jugadores de
// River (los mismos que usan los jugadores demo); nada de personas reales.

const ahora = Date.now();
const dias = (n, hora = 19) => {
  const d = new Date(ahora + n * 86400000);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
};
const minutos = (n) => new Date(ahora + n * 60000).toISOString();

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const YO = id(1);
const NOMBRES = [
  "Franco Armani", "Gonzalo Montiel", "Paulo Díaz", "Marcos Acuña", "Enzo Pérez", "Nacho Fernández",
  "Manuel Lanzini", "Facundo Colidio", "Miguel Borja", "Maxi Meza", "Claudio Echeverri", "Franco Mastantuono",
];
const NIVELES = [3, 4, 4, 5, 3, 4, 5, 6, 4, 5, 6, 7];
const POS = ["drive", "reves"];

const yo = {
  id: YO, nombre: "Eduardo", telefono: "2610000000", sexo: "masculino", zona: "godoy_cruz", provincia: "mendoza",
  nivel: 5, mano_habil: "diestro", posicion: "reves", activo: true, dado_de_baja_en: null, puntos_ranking: 188,
  avatar_url: null, es_superusuario: true, notificaciones_activas: true, mostrar_whatsapp: false, mostrar_telefono: false,
  busca_companero: true, es_demo: false, created_at: dias(-40),
};
const jugadores = NOMBRES.map((nombre, i) => ({
  id: id(100 + i), nombre, telefono: "", sexo: "masculino", zona: i % 2 ? "maipu" : "ciudad_de_mendoza", provincia: "mendoza",
  nivel: NIVELES[i], mano_habil: i % 5 === 0 ? "zurdo" : "diestro", posicion: POS[i % 2], activo: true, puntos_ranking: 260 - i * 17,
  avatar_url: null, es_superusuario: false, notificaciones_activas: true, mostrar_whatsapp: false, es_demo: true,
}));
const perfiles = [yo, ...jugadores];
const nombreDe = (pid) => perfiles.find((p) => p.id === pid)?.nombre ?? "Jugador";

const canchas = [
  { id: id(200), nombre: "Complejo La Red", direccion: "San Martín 1450, Godoy Cruz", zona: "godoy_cruz", telefono: "261 400 1122", descripcion: "4 canchas de blindex, techadas y con iluminación LED.", provincia: "mendoza" },
  { id: id(201), nombre: "Pádel Club Maipú", direccion: "Ozamis 820, Maipú", zona: "maipu", telefono: "261 455 9080", descripcion: "Canchas de césped sintético, vestuarios y buffet.", provincia: "mendoza" },
  { id: id(202), nombre: "El Punto de Oro", direccion: "Av. Arístides 990, Ciudad", zona: "ciudad_de_mendoza", telefono: "261 423 7711", descripcion: "Abierto hasta las 2 de la mañana.", provincia: "mendoza" },
];

function estadoMarcador(setsA, setsB, extra = {}) {
  return { setsA, setsB, puntosA: 0, puntosB: 0, tiebreak: false, saque: "A", historial: [], pausado: false, ...extra };
}

// [id, díasDesdeHoy, cancha, estado, cupo, ocupados, jugadores [A,A,B,B], resultado]
const definiciones = [
  { n: 300, d: 2, c: 0, estado: "completo", jug: [YO, id(103), id(100), id(105)] }, // próximo
  { n: 301, d: 3, c: 1, estado: "abierto", ocupados: 3, jug: [id(102), id(104), id(107)] }, // abierto con lugar
  { n: 302, d: 4, c: 2, estado: "abierto", ocupados: 2, jug: [id(108), id(109)] },
  { n: 303, d: 0, c: 0, estado: "completo", hora: new Date().getHours(), jug: [YO, id(101), id(106), id(110)],
    res: { estado: estadoMarcador([6, 3], [4, 2], { puntosA: 30, puntosB: 15, saque: "B" }), finalizado: false, ganador: null } }, // en juego
  { n: 304, d: -2, c: 1, estado: "jugado", jug: [YO, id(103), id(104), id(108)],
    res: { estado: estadoMarcador([6, 6], [4, 3], { finalizado: true, ganador: "A" }), finalizado: true, ganador: "A" } },
  { n: 305, d: -5, c: 2, estado: "jugado", jug: [YO, id(102), id(100), id(111)],
    res: { estado: estadoMarcador([4, 6], [6, 7], { finalizado: true, ganador: "B" }), finalizado: true, ganador: "B" } },
  { n: 306, d: -9, c: 0, estado: "jugado", jug: [YO, id(105), id(107), id(109)],
    res: { estado: estadoMarcador([6, 3, 10], [3, 6, 7], { finalizado: true, ganador: "A" }), finalizado: true, ganador: "A" } },
];

const estadisticas = (pid, a, b) => ({
  partido_id: pid, duracion_ms: 4980000, saca_primero: "A", puntos_totales_a: a, puntos_totales_b: b,
  quiebres_conv_a: 3, quiebres_op_a: 6, quiebres_conv_b: 1, quiebres_op_b: 4, puntos_juego_conv_a: 12, puntos_juego_op_a: 15,
  puntos_juego_conv_b: 8, puntos_juego_op_b: 13, racha_max_a: 6, racha_max_b: 4, games_en_deuce: 5,
});

const partidos = definiciones.map((p) => {
  const cancha = canchas[p.c];
  const fila = {
    id: id(p.n), organizador_id: p.jug[0], fecha_hora: p.hora != null ? minutos(-35) : dias(p.d), cancha: cancha.nombre, cancha_id: cancha.id,
    cantidad_jugadores: 4, lugares_ocupados: p.ocupados ?? p.jug.length, estado: p.estado, es_adhoc: false, punto_de_oro: false,
    nivel_min: 3, nivel_max: 6, costo_cancha: 24000, gastos: null, created_at: dias(p.d - 3),
  };
  fila.resultados_partido = p.res ? { ganador: p.res.ganador, estado: p.res.estado, finalizado: p.res.finalizado } : null;
  fila.estadisticas_partido = p.res?.finalizado ? estadisticas(fila.id, 71, 58) : null;
  return fila;
});

const partidoJugadores = [];
definiciones.forEach((p) => {
  const partido = partidos.find((x) => x.id === id(p.n));
  p.jug.forEach((jid, i) => {
    partidoJugadores.push({
      id: id(1000 + p.n * 10 + i), partido_id: partido.id, jugador_id: jid, invitado_nombre: null, equipo: i < 2 ? "A" : "B",
      estado: "confirmado", no_show: false, created_at: partido.created_at, partidos: partido, perfiles: { nombre: nombreDe(jid) },
    });
  });
});
// Invitación pendiente para mí al partido abierto 302.
const p302 = partidos.find((x) => x.id === id(302));
partidoJugadores.push({
  id: id(9001), partido_id: p302.id, jugador_id: YO, invitado_nombre: null, equipo: null, estado: "invitado", no_show: false,
  created_at: dias(-1), partidos: p302, perfiles: { nombre: "Eduardo" },
});

const resultados = definiciones.filter((p) => p.res).map((p) => ({ partido_id: id(p.n), ...p.res, created_at: dias(p.d), updated_at: dias(p.d) }));

const notificaciones = [
  { id: id(400), tipo: "invitacion", mensaje: "Facundo Colidio te invitó a un partido el jueves a las 19:00 en El Punto de Oro.", partido_id: id(302), leida: false, creado_en: minutos(-50) },
  { id: id(401), tipo: "partido_completo", mensaje: "¡Se completó tu partido del sábado en Complejo La Red!", partido_id: id(300), leida: false, creado_en: minutos(-300) },
  { id: id(402), tipo: "resultado", mensaje: "Ganaste 6-4 6-3 contra Franco Armani y Facundo Colidio. +29 puntos.", partido_id: id(304), leida: true, creado_en: dias(-2, 21) },
];

const mensajes = [
  { id: id(500), remitente_id: id(103), destinatario_id: YO, contenido: "¿Jugamos el sábado? Tengo cancha a las 19.", leido: true, creado_en: minutos(-180) },
  { id: id(501), remitente_id: YO, destinatario_id: id(103), contenido: "Dale, contá conmigo. ¿Quién más viene?", leido: true, creado_en: minutos(-170) },
  { id: id(502), remitente_id: id(103), destinatario_id: YO, contenido: "Armani y Nacho. Llevá pelotas que las mías están muertas.", leido: false, creado_en: minutos(-20) },
];

const directorio = (periodo) =>
  perfiles.filter((p) => p.id !== YO).map((p, i) => ({
    id: p.id, nombre: p.nombre, nivel: p.nivel, mano_habil: p.mano_habil, posicion: p.posicion, sexo: p.sexo,
    puntos_ranking: periodo === "historico" ? p.puntos_ranking : Math.max(0, 74 - i * 7), partidos_jugados: 30 - i * 2,
    porcentaje_victorias: 68 - i * 3,
  }));

const rpcs = {
  resumen_home: () => ({
    proximo_partido: { partido_id: id(300), fecha_hora: partidos[0].fecha_hora, cancha: partidos[0].cancha },
    invitaciones_pendientes: 1,
    ultimo_partido: { gano: true, sets_a: [6, 6], sets_b: [4, 3], rival_nombres: "Marcos Acuña y Miguel Borja" },
    racha_actual: 2, posicion_ranking: 6, total_jugadores: 13, partidos_jugados: 24, porcentaje_victorias: 58,
  }),
  listar_notificaciones: () => notificaciones,
  listar_directorio_jugadores: (body) => directorio(body?.p_periodo ?? "historico"),
  mi_historial_partidos: () =>
    definiciones.filter((p) => p.res?.finalizado).map((p) => ({
      partido_id: id(p.n), fecha_hora: dias(p.d), cancha: canchas[p.c].nombre, gano: p.res.ganador === "A",
      sets_a: p.res.estado.setsA, sets_b: p.res.estado.setsB, mi_equipo: "A", rival_nombres: `${nombreDe(p.jug[2])} y ${nombreDe(p.jug[3])}`,
    })),
  listar_conversaciones: () => [
    { jugador_id: id(103), nombre: nombreDe(id(103)), avatar_url: null, ultimo_mensaje: mensajes[2].contenido, ultimo_mensaje_en: mensajes[2].creado_en, no_leidos: 1 },
    { jugador_id: id(100), nombre: nombreDe(id(100)), avatar_url: null, ultimo_mensaje: "Buen partido ayer, la revancha cuando quieras.", ultimo_mensaje_en: dias(-1, 22), no_leidos: 0 },
    { jugador_id: id(110), nombre: nombreDe(id(110)), avatar_url: null, ultimo_mensaje: "¿Te sumás al americano del viernes?", ultimo_mensaje_en: dias(-4, 18), no_leidos: 0 },
  ],
  ver_perfil_jugador: (body) => {
    const p = perfiles.find((x) => x.id === body?.p_id) ?? jugadores[3];
    return [{ id: p.id, nombre: p.nombre, avatar_url: null, nivel: p.nivel, mano_habil: p.mano_habil, posicion: p.posicion, sexo: p.sexo,
      puntos_ranking: p.puntos_ranking, partidos_jugados: 27, porcentaje_victorias: 63, no_shows: 0, es_frecuente: true, veces_con: 4, veces_contra: 6, compatibilidad_pct: 82 }];
  },
  ver_participantes_partido: (body) =>
    partidoJugadores.filter((f) => f.partido_id === body?.p_partido_id && f.estado !== "invitado").map((f) => {
      const p = perfiles.find((x) => x.id === f.jugador_id);
      return { jugador_id: f.jugador_id, nombre: p.nombre, nivel: p.nivel, mano_habil: p.mano_habil, posicion: p.posicion, estado: f.estado, telefono: "", no_show: false, mostrar_whatsapp: false };
    }),
  listar_partidos_ranking_jugador: () =>
    definiciones.filter((p) => p.res?.finalizado).map((p) => ({ partido_id: id(p.n), fecha_hora: dias(p.d), cancha: canchas[p.c].nombre, puntos_ranking: p.res.ganador === "A" ? 29 : 14, gane: p.res.ganador === "A", kudos_count: 2, ya_di_kudos: false })),
  ver_partido_publico: (body) => {
    const p = partidos.find((x) => x.id === body?.p_id) ?? partidos[1];
    return [{ id: p.id, fecha_hora: p.fecha_hora, cancha: p.cancha, cantidad_jugadores: 4, lugares_ocupados: p.lugares_ocupados, estado: p.estado }];
  },
  listar_resenas_cancha: () => [
    { nombre: "Enzo Pérez", puntuacion: 5, comentario: "Las mejores canchas de Godoy Cruz, la luz es impecable.", creado_en: dias(-6) },
    { nombre: "Maxi Meza", puntuacion: 4, comentario: "Muy buenas, a veces cuesta conseguir turno a la noche.", creado_en: dias(-15) },
  ],
  buscar_jugadores: () => jugadores.slice(0, 5).map((p) => ({ id: p.id, nombre: p.nombre })),
  listar_mis_frecuentes: () => jugadores.slice(0, 4).map((p) => ({ id: p.id, nombre: p.nombre })),
  listar_mis_duplas: () => [{ jugador_id: id(103), nombre: nombreDe(id(103)) }],
  listar_mi_disponibilidad: () => [
    { id: id(600), dia_semana: "martes", franja: "noche" },
    { id: id(601), dia_semana: "jueves", franja: "noche" },
    { id: id(602), dia_semana: "sabado", franja: "tarde" },
  ],
  listar_mis_sugerencias_grupo: () => [{ grupo_id: id(700), dia_semana: "jueves", franja: "noche", mi_estado: "pendiente", total: 4, aceptados: 2 }],
  listar_apelaciones: () => [{
    id: id(800), partido_id: id(305), cancha: canchas[2].nombre, fecha_hora: dias(-5), motivo: "El último punto del tie-break se anotó para la pareja equivocada.",
    estado: "pendiente", apelante_nombre: "Paulo Díaz", creado_en: dias(-4), ganador_actual: "B", sets_a: [4, 6], sets_b: [6, 7], pareja_a: "Eduardo / Paulo Díaz", pareja_b: "Franco Armani / Franco Mastantuono",
  }],
  buscar_candidatos_dupla: () => jugadores.slice(4, 8).map((p) => ({ id: p.id, nombre: p.nombre, nivel: p.nivel, posicion: p.posicion, zona: p.zona })),
};

const tablas = {
  perfiles,
  partidos,
  partido_jugadores: partidoJugadores,
  resultados_partido: resultados,
  canchas,
  notificaciones,
  mensajes,
  resenas_canchas: [],
  kudos_partido: [],
  jugadores_frecuentes: [{ jugador_id: YO, frecuente_id: id(103) }],
  disponibilidad_habitual: [],
  apelaciones: [],
  estadisticas_partido: partidos.filter((p) => p.estadisticas_partido).map((p) => p.estadisticas_partido),
};

module.exports = { YO, id, tablas, rpcs, yo, partidos };
