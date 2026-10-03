// Puente entre lo que guarda la base (071_torneos.sql) y la lógica pura de
// lib/torneos.js. Con la respuesta de `torneo_completo` arma el "modelo" con la
// forma que esperan las funciones de cruces y tablas, y calcula la ronda que
// sigue, la tabla y el podio.
import { armarRonda, tabla, armarLiga, tablaLiga, armarEliminacion, siguienteEliminacion, ganadoresEliminacion } from "@/lib/torneos";

export const FORMATOS = { americano: "Americano", mexicano: "Mexicano", liga: "Liga", eliminacion: "Eliminación directa" };

export function construir(data) {
  const t = data.torneo;
  const jugadores = data.participantes.map((p) => ({ id: p.id, nombre: p.nombre, jugadorId: p.jugador_id ?? null, pareja: p.pareja }));
  const armable = t.formato === "liga" || t.formato === "eliminacion";

  const equipos = [];
  if (armable) {
    const porPareja = new Map();
    for (const j of jugadores) porPareja.set(j.pareja, [...(porPareja.get(j.pareja) ?? []), j.nombre]);
    for (const [pareja, nombres] of [...porPareja.entries()].sort((a, b) => a[0] - b[0])) {
      equipos.push({ id: `e${pareja}`, nombre: nombres.join(" / ") });
    }
  }

  const rondas = (data.rondas ?? []).map((r) => ({
    id: r.id,
    numero: r.numero,
    titulo: r.titulo,
    partidos: r.partidos.map((p) => ({ id: p.id, cancha: p.cancha, a: p.a, b: p.b, ptsA: p.ptsA, ptsB: p.ptsB })),
    descansan: r.descansan ?? [],
    pasan: r.pasan ?? [],
    entradas: [],
  }));

  // La llave de eliminación se reconstruye: la primera ronda sale del orden de
  // las parejas (con los pases directos) y las siguientes son todas partidos.
  if (t.formato === "eliminacion" && equipos.length > 0) {
    rondas.forEach((r, i) => {
      r.entradas = i === 0 ? armarEliminacion(equipos).entradas : r.partidos.map(() => ({ partido: true }));
    });
  }

  return { torneo: t, jugadores, equipos, rondas, armable, formato: t.formato };
}

export function nombrePar(m, ids) {
  const lista = m.armable ? m.equipos : m.jugadores;
  return ids.map((id) => lista.find((x) => x.id === id)?.nombre ?? "?").join(" / ");
}

export function totalRondas(m) {
  if (m.formato === "eliminacion") return null;
  if (m.formato === "liga") return armarLiga(m.equipos, m.torneo.canchas).length;
  return m.torneo.total_rondas;
}

// Primera ronda de un torneo recién creado.
export function primeraRonda(m) {
  if (m.formato === "eliminacion") return armarEliminacion(m.equipos);
  if (m.formato === "liga") return armarLiga(m.equipos, m.torneo.canchas)[0];
  return armarRonda({ jugadores: m.jugadores, canchas: m.torneo.canchas, rondas: [], formato: m.formato });
}

// Ronda que sigue, o null si ya se jugó la última.
export function siguienteRonda(m) {
  const ultima = m.rondas[m.rondas.length - 1];
  if (m.formato === "eliminacion") return siguienteEliminacion(ultima);
  if (m.rondas.length >= totalRondas(m)) return null;
  if (m.formato === "liga") return armarLiga(m.equipos, m.torneo.canchas)[m.rondas.length] ?? null;
  return armarRonda({ jugadores: m.jugadores, canchas: m.torneo.canchas, rondas: m.rondas, formato: m.formato });
}

// Para guardar una ronda con la función guardar_ronda.
export function paraGuardar(ronda) {
  return {
    p_numero: ronda.numero,
    p_titulo: ronda.titulo ?? null,
    p_partidos: ronda.partidos.map((p) => ({ cancha: p.cancha, a: p.a, b: p.b })),
    p_descansan: ronda.descansan ?? [],
    p_pasan: ronda.pasan ?? [],
  };
}

// Tabla (americano, mexicano y liga). En eliminación no hay tabla.
export function tablaDe(m) {
  if (m.formato === "eliminacion") return [];
  if (m.formato === "liga") return tablaLiga(m.equipos, m.rondas, { pv: m.torneo.puntos_victoria, pe: m.torneo.puntos_empate });
  return tabla(m.jugadores, m.rondas);
}

// Los que suben al podio al terminar: [{ id, nombre, pf }] (campeón primero).
export function podioDe(m) {
  if (m.formato === "eliminacion") {
    const final = m.rondas[m.rondas.length - 1];
    if (!final || final.partidos.some((p) => p.ptsA == null)) return [];
    const campeon = ganadoresEliminacion(final)[0];
    const p = final.partidos[0];
    const sub = p.a[0] === campeon ? p.b[0] : p.a[0];
    const puntosDe = (id) => m.rondas.reduce((s, r) => s + r.partidos.reduce((t, x) => t + (x.a[0] === id ? x.ptsA : x.b[0] === id ? x.ptsB : 0), 0), 0);
    return [campeon, sub].map((id) => ({ id, nombre: nombrePar(m, [id]), pf: puntosDe(id) }));
  }
  const filas = tablaDe(m);
  return filas.slice(0, 3).map((f) => ({ id: f.id, nombre: f.nombre, pf: m.formato === "liga" ? f.pts : f.pf }));
}

export function mensajeError(error) {
  const msg = error?.message ?? "";
  if (msg.includes("limite_torneos")) return "Ya tenés 20 torneos en juego, que es el máximo. Terminá o eliminá alguno.";
  if (msg.includes("solo_organizador")) return "Solo quien organiza el torneo puede hacer esto.";
  if (msg.includes("resultado_invalido")) return "El resultado no es válido: los puntos de las dos parejas tienen que sumar los del partido.";
  if (msg.includes("nombre_invalido")) return "El nombre del torneo tiene que tener entre 2 y 60 letras.";
  return "No se pudo completar. Probá de nuevo.";
}
