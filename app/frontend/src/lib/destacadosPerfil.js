// Destacados del perfil (opción C "Cara a cara", 2026-10-02): cómo venís,
// tu mejor dupla, tu cuenta pendiente y tu cancha. Lee las filas de la RPC
// `mis_cruces_partidos` (app/backend/sql/068_destacados_perfil.sql): una
// fila por cada OTRO jugador de cada partido terminado. Funciones puras,
// sin Supabase, para poder probarlas sueltas.

// Mínimo de partidos para que una dupla, un rival o una cancha cuenten
// como "destacado" -- con 1 partido cualquiera sería "la mejor" o "la peor".
const MINIMO = 2;

const primerNombre = (n) => String(n ?? "").trim().split(/\s+/)[0] || "?";
const claveJugador = (f) => f.otro_id ?? `invitado:${String(f.otro_nombre ?? "").trim().toLowerCase()}`;

// Junta las filas por partido, del más nuevo al más viejo.
export function agruparPartidos(filas) {
  const porId = new Map();
  for (const f of filas ?? []) {
    let p = porId.get(f.partido_id);
    if (!p) {
      const mio = f.mi_equipo === "B" ? f.sets_b : f.sets_a;
      const suyo = f.mi_equipo === "B" ? f.sets_a : f.sets_b;
      p = {
        id: f.partido_id,
        fechaHora: f.fecha_hora,
        cancha: String(f.cancha ?? "").trim(),
        gane: f.ganador === f.mi_equipo,
        sets: Array.isArray(mio) && Array.isArray(suyo) ? mio.map((g, i) => `${g}-${suyo[i] ?? 0}`).join(" ") : "",
        companeros: [],
        rivales: [],
      };
      porId.set(f.partido_id, p);
    }
    const otro = { clave: claveJugador(f), nombre: primerNombre(f.otro_nombre) };
    (f.otro_equipo === f.mi_equipo ? p.companeros : p.rivales).push(otro);
  }
  return [...porId.values()].sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
}

// Suma partidos/ganados por clave y devuelve el "mejor" (o el "peor") con
// al menos MINIMO partidos. Desempata por cantidad de partidos.
function elegir(grupos, peor) {
  const candidatos = [...grupos.values()].filter((g) => g.pj >= MINIMO);
  if (candidatos.length === 0) return null;
  candidatos.sort((a, b) => {
    const pa = a.g / a.pj;
    const pb = b.g / b.pj;
    if (pa !== pb) return peor ? pa - pb : pb - pa;
    return b.pj - a.pj;
  });
  return candidatos[0];
}

function sumar(grupos, clave, base, partido) {
  const g = grupos.get(clave) ?? { ...base, pj: 0, g: 0, ultimo: partido };
  g.pj += 1;
  if (partido.gane) g.g += 1;
  grupos.set(clave, g);
}

export function calcularDestacados(filas) {
  const partidos = agruparPartidos(filas);
  if (partidos.length === 0) return null;

  const ganados = partidos.filter((p) => p.gane).length;

  // Racha actual: cuántos partidos seguidos con el mismo resultado que el último.
  let racha = 0;
  while (racha < partidos.length && partidos[racha].gane === partidos[0].gane) racha += 1;

  // Últimos 5, del más viejo al más nuevo (el de la derecha es el último).
  const forma = partidos.slice(0, 5).reverse().map((p) => p.gane);

  const duplas = new Map();
  const rivales = new Map();
  const canchas = new Map();
  // `partidos` va del más nuevo al más viejo: el primero que se suma a
  // cada grupo es el último partido con esa dupla / rivales / cancha.
  for (const p of partidos) {
    for (const c of p.companeros) sumar(duplas, c.clave, { nombre: c.nombre }, p);
    if (p.rivales.length > 0) {
      const orden = [...p.rivales].sort((a, b) => a.clave.localeCompare(b.clave));
      sumar(rivales, orden.map((r) => r.clave).join("|"), { nombre: orden.map((r) => r.nombre).join(" y ") }, p);
    }
    if (p.cancha) sumar(canchas, p.cancha.toLowerCase(), { nombre: p.cancha }, p);
  }

  const mejorDupla = elegir(duplas, false);
  let cuentaPendiente = elegir(rivales, true);
  // Si a todos los rivales repetidos les ganaste siempre, no hay "cuenta pendiente".
  if (cuentaPendiente && cuentaPendiente.g === cuentaPendiente.pj) cuentaPendiente = null;
  const cancha = elegir(canchas, false);
  // La otra cancha más jugada, para comparar ("En ATC: 3 de 6").
  const otraCancha = cancha
    ? [...canchas.values()].filter((c) => c !== cancha && c.pj >= MINIMO).sort((a, b) => b.pj - a.pj)[0] ?? null
    : null;

  return {
    jugados: partidos.length,
    ganados,
    porcentaje: Math.round((ganados / partidos.length) * 100),
    racha: { gane: partidos[0].gane, n: racha },
    forma,
    ultimos5Ganados: forma.filter(Boolean).length,
    mejorDupla,
    cuentaPendiente,
    cancha,
    otraCancha,
  };
}
