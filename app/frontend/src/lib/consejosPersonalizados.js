// Consejos personalizados (2026-10-10, pedido del usuario; maqueta
// docs/maquetas/maquetas-consejos.html, eligió las 3 opciones + la Home).
// Reglas propias, sin IA externa: cada partido se compara con tu propio
// promedio (desde 3 partidos con Marcadorcito; antes, con la media de
// Padelito) y con 10 partidos terminados aparecen los patrones (mejor
// dupla, segundo set, remontadas). Los datos vienen de la RPC
// datos_consejos() (099_consejos_personalizados.sql). Los textos son claves
// de i18n (tuJuego.*) con sus variables, los arma el componente.

export const PARTIDOS_PARA_COMPARAR = 3;
export const PARTIDOS_PARA_PATRONES = 10;

function pct(a, b) {
  return b > 0 ? Math.round((100 * a) / b) : null;
}

// Pasa una fila de datos_consejos() al punto de vista del jugador.
function normalizar(p) {
  const mio = p.equipo === "B" ? "b" : "a";
  const rival = mio === "a" ? "b" : "a";
  const propios = (p.equipo === "B" ? p.sets_b : p.sets_a) ?? [];
  const rivales = (p.equipo === "B" ? p.sets_a : p.sets_b) ?? [];
  const sets = propios.map((s, i) => [s, rivales[i] ?? 0]).filter(([a, b]) => a !== 0 || b !== 0);
  const s = p.stats;
  return {
    id: p.id,
    fecha: new Date(p.fecha),
    gane: p.ganador === p.equipo,
    sets,
    companero: p.companero,
    rivales: p.rivales ?? [],
    m: s
      ? {
          qConv: s[`quiebres_conv_${mio}`],
          qOp: s[`quiebres_op_${mio}`],
          qcConv: s[`quiebres_conv_${rival}`],
          qcOp: s[`quiebres_op_${rival}`],
          pjcConv: s[`puntos_juego_conv_${rival}`],
          pjcOp: s[`puntos_juego_op_${rival}`],
          deuce: s.games_en_deuce,
          pjConv: s[`puntos_juego_conv_${mio}`],
          pjOp: s[`puntos_juego_op_${mio}`],
          ptsMios: s[`puntos_totales_${mio}`],
          ptsRival: s[`puntos_totales_${rival}`],
          racha: s[`racha_max_${mio}`],
          rachaRival: s[`racha_max_${rival}`],
        }
      : null,
  };
}

export function prepararDatos(datos) {
  if (!datos) return null;
  const partidos = (datos.partidos ?? []).map(normalizar);
  return {
    partidos,
    conStats: partidos.filter((p) => p.m),
    media: datos.media ?? {},
    valoraciones: datos.valoraciones ?? {},
  };
}

function promedio(lista) {
  const suma = { qConv: 0, qOp: 0, qcConv: 0, qcOp: 0, pjConv: 0, pjOp: 0, ptsMios: 0, ptsTot: 0 };
  for (const p of lista) {
    suma.qConv += p.m.qConv;
    suma.qOp += p.m.qOp;
    suma.qcConv += p.m.qcConv;
    suma.qcOp += p.m.qcOp;
    suma.pjConv += p.m.pjConv;
    suma.pjOp += p.m.pjOp;
    suma.ptsMios += p.m.ptsMios;
    suma.ptsTot += p.m.ptsMios + p.m.ptsRival;
  }
  return {
    quiebres: pct(suma.qConv, suma.qOp),
    salvados: pct(suma.qcOp - suma.qcConv, suma.qcOp),
    cierre: pct(suma.pjConv, suma.pjOp),
    puntos: pct(suma.ptsMios, suma.ptsTot),
    sufridos: lista.length ? suma.qcConv / lista.length : null,
  };
}

// Los números concretos (2026-10-10: "cosas tangibles como porcentajes de
// saque", no datos de horario o cancha): quiebres convertidos, saque
// defendido (quiebres en contra salvados), puntos de juego cerrados y
// puntos ganados, con el conteo de cada uno.
function numerosDe(lista) {
  const s = { qConv: 0, qOp: 0, qcConv: 0, qcOp: 0, pjConv: 0, pjOp: 0, ptsMios: 0, ptsTot: 0 };
  for (const p of lista) {
    s.qConv += p.m.qConv;
    s.qOp += p.m.qOp;
    s.qcConv += p.m.qcConv;
    s.qcOp += p.m.qcOp;
    s.pjConv += p.m.pjConv;
    s.pjOp += p.m.pjOp;
    s.ptsMios += p.m.ptsMios;
    s.ptsTot += p.m.ptsMios + p.m.ptsRival;
  }
  return [
    { clave: "quiebres", valor: pct(s.qConv, s.qOp), de: s.qConv, total: s.qOp },
    { clave: "salvados", valor: pct(s.qcOp - s.qcConv, s.qcOp), de: s.qcOp - s.qcConv, total: s.qcOp },
    { clave: "cierre", valor: pct(s.pjConv, s.pjOp), de: s.pjConv, total: s.pjOp },
    { clave: "puntos", valor: pct(s.ptsMios, s.ptsTot), de: s.ptsMios, total: s.ptsTot },
  ].filter((x) => x.valor != null);
}

// Cuánto te conoce Padelito: partidos terminados, de 0 a 10.
export function nivelConfianza(d) {
  const n = d?.partidos.length ?? 0;
  return {
    n,
    pasos: Math.min(n, PARTIDOS_PARA_PATRONES),
    clave: n < PARTIDOS_PARA_COMPARAR ? "conociendo" : n < PARTIDOS_PARA_PATRONES ? "vaConociendo" : "teConoce",
    faltanPatrones: Math.max(0, PARTIDOS_PARA_PATRONES - n),
  };
}

// Un consejo que la persona marcó "No me sirve" no vuelve a aparecer; uno
// que marcó "Me sirvió" pesa más al elegir.
function ajustarPorValoracion(candidatos, valoraciones) {
  return candidatos
    .filter((c) => valoraciones[`tip.${c.clave}`] !== false)
    .map((c) => (valoraciones[`tip.${c.clave}`] === true ? { ...c, peso: c.peso * 1.5 } : c));
}

function elMasPesado(lista) {
  return lista.reduce((mejor, c) => (!mejor || c.peso > mejor.peso ? c : mejor), null);
}

const CON_TIP = new Set(["quiebres", "cierre", "puntos", "rachaRival", "aflojaron", "saque", "segundoSet", "momentos", "apretados", "arranque"]);

// A · Lo que te dejó este partido (2026-10-10: "que me diga por qué perdí
// o por qué gané", "que sea grande la cantidad de cosas"): todos los
// motivos que se encuentran, ordenados por peso, con el dato de hoy contra
// tu promedio (o la media de Padelito), y hasta 2 consejos.
export function consejosDePartido(d, partidoId) {
  const actual = d?.conStats.find((p) => p.id === partidoId);
  if (!actual) return null;
  const previos = d.conStats.filter((p) => p.id !== partidoId);
  const propio = previos.length >= PARTIDOS_PARA_COMPARAR;
  const ref = propio ? promedio(previos) : { ...d.media, puntos: 50, sufridos: null };
  const m = actual.m;
  const bien = [];
  const mejorar = [];

  function comparar(clave, conv, op, minimo) {
    if (op < minimo) return;
    const hoy = pct(conv, op);
    const base = ref[clave];
    const vars = { conv, op, hoy, ref: base };
    if (base == null) {
      // Sin con qué comparar: igual se cuenta lo que pasó si es claro.
      if (hoy >= 60) bien.push({ clave, texto: `${clave}Bien`, vars: { conv, op }, peso: hoy / 5 });
      else if (hoy <= 30) mejorar.push({ clave, texto: `${clave}Mal`, vars: { conv, op }, peso: (100 - hoy) / 5 });
      return;
    }
    const diff = hoy - base;
    if (diff >= 10) bien.push({ clave, texto: `${clave}Bien`, vars, peso: diff });
    else if (diff <= -10) mejorar.push({ clave, texto: `${clave}Mal`, vars, peso: -diff });
  }
  comparar("quiebres", m.qConv, m.qOp, 2);
  comparar("cierre", m.pjConv, m.pjOp, 3);

  const tot = m.ptsMios + m.ptsRival;
  if (tot > 0) {
    const hoy = pct(m.ptsMios, tot);
    const vars = { hoy, a: m.ptsMios, b: m.ptsRival };
    if (hoy >= 53) bien.push({ clave: "puntos", texto: "puntosBien", vars, peso: (hoy - 50) * 3 });
    else if (hoy <= 47) mejorar.push({ clave: "puntos", texto: "puntosMal", vars, peso: (50 - hoy) * 3 });
    // Perder ganando más puntos (o al revés) dice mucho del partido.
    if (!actual.gane && m.ptsMios > m.ptsRival) mejorar.push({ clave: "momentos", texto: "perdieronConMasPuntos", vars, peso: 40 });
    if (actual.gane && m.ptsMios < m.ptsRival) bien.push({ clave: "momentos", texto: "ganaronConMenosPuntos", vars, peso: 40 });
  }

  // Defensa: quiebres y puntos de juego del rival que salvaron.
  if (m.qcOp >= 3) {
    const salvados = m.qcOp - m.qcConv;
    const p = pct(salvados, m.qcOp);
    if (p >= 60) bien.push({ clave: "salvaron", texto: "salvaron", vars: { n: salvados, op: m.qcOp }, peso: p / 3 });
  }
  const sufridosRef = ref.sufridos ?? 2;
  if (m.qcConv >= 3 && m.qcConv > sufridosRef + 1) mejorar.push({ clave: "saque", texto: "saque", vars: { n: m.qcConv, op: m.qcOp }, peso: m.qcConv * 6 });
  if (m.pjcOp >= 4) {
    const aguantaron = m.pjcOp - m.pjcConv;
    if (aguantaron >= 3) bien.push({ clave: "aguantaron", texto: "aguantaron", vars: { n: aguantaron, op: m.pjcOp }, peso: aguantaron * 4 });
  }
  if (m.qOp >= 3 && m.qConv <= m.qOp / 3 && m.qConv < m.qcConv) {
    mejorar.push({ clave: "quiebres", texto: "quiebresDiferencia", vars: { mios: m.qConv, rival: m.qcConv }, peso: 22 });
  }

  if (m.racha >= 5) bien.push({ clave: "racha", texto: "racha", vars: { n: m.racha }, peso: m.racha * 3 });
  if (m.rachaRival >= 5) mejorar.push({ clave: "rachaRival", texto: "rachaRival", vars: { n: m.rachaRival }, peso: m.rachaRival * 3 });

  // Sets: remontadas, ventajas que se escaparon y sets apretados.
  const sets = actual.sets;
  if (sets.length >= 2) {
    const ganePrimero = sets[0][0] > sets[0][1];
    if (!ganePrimero && actual.gane) bien.push({ clave: "remontada", texto: "remontada", vars: {}, peso: 30 });
    if (ganePrimero && !actual.gane) mejorar.push({ clave: "aflojaron", texto: "aflojaron", vars: {}, peso: 25 });
  }
  const apretadosGanados = sets.filter(([a, b]) => a > b && a - b <= 2 && a >= 6).length;
  const apretadosPerdidos = sets.filter(([a, b]) => b > a && b - a <= 2 && b >= 6).length;
  if (apretadosGanados > 0) bien.push({ clave: "apretados", texto: "setsApretadosBien", vars: { n: apretadosGanados }, peso: 12 * apretadosGanados });
  if (apretadosPerdidos > 0) mejorar.push({ clave: "apretados", texto: "setsApretadosMal", vars: { n: apretadosPerdidos }, peso: 12 * apretadosPerdidos });
  const paliza = sets.find(([a, b]) => b >= 6 && a <= 1);
  if (paliza) mejorar.push({ clave: "arranque", texto: "setPaliza", vars: { a: paliza[0], b: paliza[1] }, peso: 15 });

  // Los números del partido, con tu promedio al lado si ya hay con qué.
  const refNum = previos.length >= PARTIDOS_PARA_COMPARAR ? Object.fromEntries(numerosDe(previos).map((x) => [x.clave, x.valor])) : {};
  const numeros = numerosDe([actual]).map((x) => ({ ...x, promedio: refNum[x.clave] ?? null }));

  if (bien.length === 0 && actual.gane) bien.push({ clave: "ganaron", texto: "ganaron", vars: {}, peso: 1 });

  const porPeso = (a, b) => b.peso - a.peso;
  bien.sort(porPeso);
  mejorar.sort(porPeso);
  // Una sola fila por motivo (ej. "quiebres" puede salir dos veces).
  const unicos = (lista) => lista.filter((c, i) => lista.findIndex((x) => x.clave === c.clave) === i);
  const tips = unicos(ajustarPorValoracion(mejorar.filter((c) => CON_TIP.has(c.clave)), d.valoraciones))
    .sort(porPeso)
    .slice(0, 2)
    .map((c) => ({ clave: `tip.${c.clave}`, texto: c.clave }));
  return {
    gane: actual.gane,
    bien: unicos(bien).slice(0, 5),
    mejorar: unicos(mejorar).slice(0, 5),
    numeros,
    tips,
    propio,
    nivel: nivelConfianza(d),
  };
}

function ganadosDe(lista) {
  return lista.filter((p) => p.gane).length;
}

// Patrones sobre todos los partidos terminados (desde 10).
function patrones(d) {
  const lista = d.partidos;
  if (lista.length < PARTIDOS_PARA_PATRONES) return [];
  const salida = [];

  const porCompanero = {};
  for (const p of lista) {
    const c = p.companero;
    if (!c?.nombre) continue;
    const k = c.id ?? c.nombre;
    porCompanero[k] ??= { nombre: c.nombre, n: 0, g: 0 };
    porCompanero[k].n += 1;
    if (p.gane) porCompanero[k].g += 1;
  }
  const dupla = Object.values(porCompanero)
    .filter((c) => c.n >= 3)
    .sort((a, b) => b.g / b.n - a.g / a.n || b.n - a.n)[0];
  if (dupla && dupla.g / dupla.n >= 0.5) salida.push({ clave: "mejorDupla", tipo: "bien", vars: dupla, peso: 20 });

  const conDos = lista.filter((p) => p.sets.length >= 2);
  if (conDos.length >= 5) {
    const s1 = pct(conDos.filter((p) => p.sets[0][0] > p.sets[0][1]).length, conDos.length);
    const s2 = pct(conDos.filter((p) => p.sets[1][0] > p.sets[1][1]).length, conDos.length);
    if (s2 <= s1 - 15) salida.push({ clave: "segundoSet", tipo: "mejorar", vars: { s1, s2 }, peso: s1 - s2 });
    else if (s2 >= s1 + 15) salida.push({ clave: "arranqueLento", tipo: "mejorar", vars: { s1, s2 }, peso: s2 - s1 });
  }

  const remontadas = conDos.filter((p) => p.gane && p.sets[0][0] < p.sets[0][1]).length;
  if (remontadas >= 2) salida.push({ clave: "remontadas", tipo: "bien", vars: { n: remontadas }, peso: remontadas * 5 });

  return salida.sort((a, b) => b.peso - a.peso).slice(0, 3);
}

// B · Tu juego: medidores contra la media de Padelito, la fortaleza que más
// se despega, patrones y el consejo para lo que más te cuesta.
export function tuJuego(d) {
  if (!d || d.partidos.length === 0) return null;
  const prom = d.conStats.length ? promedio(d.conStats) : null;
  const medidores = prom
    ? [
        { clave: "quiebres", valor: prom.quiebres, media: d.media.quiebres },
        { clave: "salvados", valor: prom.salvados, media: d.media.quiebres != null ? 100 - d.media.quiebres : null },
        { clave: "cierre", valor: prom.cierre, media: d.media.cierre },
        { clave: "puntos", valor: prom.puntos, media: 50 },
      ].filter((x) => x.valor != null)
    : [];
  const ordenados = medidores.filter((x) => x.media != null).sort((a, b) => b.valor - b.media - (a.valor - a.media));
  const fuerte = ordenados[0];
  const flojo = ordenados[ordenados.length - 1];
  const pats = patrones(d);
  const candidatosTip = [];
  if (flojo && flojo.valor - flojo.media <= -5) candidatosTip.push({ clave: flojo.clave, peso: flojo.media - flojo.valor });
  const segundo = pats.find((p) => p.clave === "segundoSet");
  if (segundo) candidatosTip.push({ clave: "segundoSet", peso: segundo.peso });
  const tip = elMasPesado(ajustarPorValoracion(candidatosTip, d.valoraciones));
  return {
    nivel: nivelConfianza(d),
    titular: fuerte && fuerte.valor > fuerte.media ? fuerte.clave : "enCamino",
    medidores,
    patrones: pats,
    tip: tip ? { clave: `tip.${tip.clave}`, texto: tip.clave } : null,
  };
}

// Home (2026-10-10: "en la home no veo nada"): tus números de todos los
// partidos con Marcadorcito siempre que haya alguno, y abajo el consejo del
// último partido si fue hace poco o, si no, el de tu juego en general.
export function consejoHome(d) {
  if (!d || d.conStats.length === 0) return null;
  const numeros = numerosDe(d.conStats);
  const ultimo = d.conStats[0];
  const reciente = Date.now() - ultimo.fecha.getTime() < 4 * 24 * 60 * 60 * 1000;
  let tip = null;
  let origen = null;
  if (reciente) {
    const c = consejosDePartido(d, ultimo.id);
    if (c?.tips.length) {
      tip = c.tips[0];
      origen = "ultimo";
    }
  }
  if (!tip) {
    const j = tuJuego(d);
    if (j?.tip) {
      tip = j.tip;
      origen = "general";
    }
  }
  return { numeros, partidos: d.conStats.length, tip, origen, partidoId: origen === "ultimo" ? ultimo.id : null };
}

// C · Antes de jugar: tu historial con la gente anotada en este partido.
export function consejoAntesDeJugar(d, otros) {
  if (!d || d.partidos.length === 0) return [];
  const items = [];
  for (const o of otros) {
    if (!o.id) continue;
    const con = d.partidos.filter((p) => p.companero?.id === o.id);
    const contra = d.partidos.filter((p) => p.rivales.some((r) => r.id === o.id));
    if (con.length >= 2) items.push({ clave: "conCompanero", tipo: "dato", vars: { nombre: o.nombre, n: con.length, g: ganadosDe(con) }, peso: con.length });
    if (contra.length >= 2) {
      const g = ganadosDe(contra);
      items.push({ clave: g * 2 < contra.length ? "contraRivalDificil" : "contraRival", tipo: "dato", vars: { nombre: o.nombre, n: contra.length, g }, peso: contra.length + 1 });
    }
  }
  return items.sort((a, b) => b.peso - a.peso).slice(0, 2);
}
