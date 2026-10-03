// Torneos entre amigos: Americano y Mexicano (2026-10-03, vista previa en
// /pruebas-torneos). Funciones puras, sin base de datos: reciben jugadores y
// rondas y devuelven la ronda siguiente o la tabla.
//
// Modelo:
//  - jugador: { id, nombre }
//  - ronda: { numero, partidos: [{ cancha, a: [idA1, idA2], b: [idB1, idB2], ptsA: null|n, ptsB: null|n }], descansan: [ids] }
//
// Reglas:
//  - AMERICANO: cada ronda se arma para repetir lo menos posible los mismos
//    compañeros y los mismos rivales. Cada jugador suma los puntos que hizo su
//    pareja en cada partido.
//  - MEXICANO: la primera ronda es al azar; desde la segunda, en cada cancha
//    juegan los jugadores de la tabla de a 4 (1° y 4° contra 2° y 3°).
//  - Si hay menos canchas que jugadores/4, descansan los que menos partidos
//    tienen que descansar... es decir, los que más jugaron.

function mezclar(lista, rng) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Cuántos partidos programados tiene cada jugador y cuántas veces se juntó o
// se enfrentó con cada otro.
function historia(jugadores, rondas) {
  const jugados = Object.fromEntries(jugadores.map((j) => [j.id, 0]));
  const companero = {};
  const rival = {};
  const sumar = (m, x, y) => {
    m[x] ??= {};
    m[x][y] = (m[x][y] ?? 0) + 1;
  };
  for (const r of rondas) {
    for (const p of r.partidos) {
      for (const id of [...p.a, ...p.b]) jugados[id] += 1;
      for (const par of [p.a, p.b]) {
        sumar(companero, par[0], par[1]);
        sumar(companero, par[1], par[0]);
      }
      for (const x of p.a) for (const y of p.b) {
        sumar(rival, x, y);
        sumar(rival, y, x);
      }
    }
  }
  return { jugados, companero, rival };
}

// Tabla con los partidos que ya tienen resultado.
export function tabla(jugadores, rondas) {
  const filas = Object.fromEntries(
    jugadores.map((j) => [j.id, { id: j.id, nombre: j.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0 }])
  );
  for (const r of rondas) {
    for (const p of r.partidos) {
      if (p.ptsA == null || p.ptsB == null) continue;
      for (const [equipo, propios, ajenos] of [
        [p.a, p.ptsA, p.ptsB],
        [p.b, p.ptsB, p.ptsA],
      ]) {
        for (const id of equipo) {
          const f = filas[id];
          f.pj += 1;
          f.pf += propios;
          f.pc += ajenos;
          if (propios > ajenos) f.pg += 1;
          else if (propios < ajenos) f.pp += 1;
        }
      }
    }
  }
  return Object.values(filas)
    .map((f) => ({ ...f, dif: f.pf - f.pc }))
    .sort((x, y) => y.pf - x.pf || y.dif - x.dif || y.pg - x.pg || x.nombre.localeCompare(y.nombre));
}

// Arma la ronda siguiente. `formato`: "americano" | "mexicano".
export function armarRonda({ jugadores, canchas, rondas, formato, rng = Math.random }) {
  const cupo = Math.min(canchas * 4, Math.floor(jugadores.length / 4) * 4);
  const { jugados, companero, rival } = historia(jugadores, rondas);

  // Quiénes juegan: los que menos partidos tienen (desempata al azar).
  const orden = mezclar(jugadores, rng).sort((x, y) => jugados[x.id] - jugados[y.id]);
  const juegan = orden.slice(0, cupo);
  const descansan = orden.slice(cupo).map((j) => j.id);

  let grupos; // lista de [a1, a2, b1, b2]
  if (formato === "mexicano" && rondas.length > 0) {
    const posicion = Object.fromEntries(tabla(jugadores, rondas).map((f, i) => [f.id, i]));
    const ordenados = [...juegan].sort((x, y) => posicion[x.id] - posicion[y.id]);
    grupos = [];
    for (let i = 0; i < ordenados.length; i += 4) {
      const [p1, p2, p3, p4] = ordenados.slice(i, i + 4);
      grupos.push([p1, p4, p2, p3]);
    }
  } else {
    // Mejor de varios sorteos: la menor cantidad de repeticiones de compañeros y rivales.
    let mejor = null;
    let mejorPuntaje = Infinity;
    for (let intento = 0; intento < 400; intento++) {
      const barajados = mezclar(juegan, rng);
      let puntaje = 0;
      const candidato = [];
      for (let i = 0; i < barajados.length; i += 4) {
        const [a1, a2, b1, b2] = barajados.slice(i, i + 4);
        candidato.push([a1, a2, b1, b2]);
        puntaje += 10 * ((companero[a1.id]?.[a2.id] ?? 0) + (companero[b1.id]?.[b2.id] ?? 0));
        for (const x of [a1, a2]) for (const y of [b1, b2]) puntaje += 2 * (rival[x.id]?.[y.id] ?? 0);
      }
      if (puntaje < mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejor = candidato;
        if (puntaje === 0) break;
      }
    }
    grupos = mejor ?? [];
  }

  return {
    numero: rondas.length + 1,
    partidos: grupos.map(([a1, a2, b1, b2], i) => ({
      cancha: i + 1,
      a: [a1.id, a2.id],
      b: [b1.id, b2.id],
      ptsA: null,
      ptsB: null,
    })),
    descansan,
  };
}

// =====================================================================
// Torneo armable: parejas FIJAS, con liga (todos contra todos) o
// eliminación directa. Acá un "equipo" es una pareja { id, nombre } y en
// cada partido a/b llevan el id del equipo (un solo elemento).
// =====================================================================

// Liga: método del círculo. Si hay más partidos por ronda que canchas, esa
// ronda se parte en varios turnos (cada turno es una "ronda" de la lista).
export function armarLiga(equipos, canchas) {
  const ids = equipos.map((e) => e.id);
  const lista = ids.length % 2 === 0 ? [...ids] : [...ids, null];
  const n = lista.length;
  const vueltas = [];
  let rot = [...lista];
  for (let r = 0; r < n - 1; r++) {
    const pares = [];
    for (let i = 0; i < n / 2; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      if (a !== null && b !== null) pares.push([a, b]);
    }
    vueltas.push(pares);
    rot = [rot[0], rot[n - 1], ...rot.slice(1, n - 1)];
  }
  const rondas = [];
  for (const pares of vueltas) {
    for (let k = 0; k < pares.length; k += canchas) {
      const grupo = pares.slice(k, k + canchas);
      const juegan = new Set(grupo.flat());
      rondas.push({
        numero: rondas.length + 1,
        partidos: grupo.map(([a, b], i) => ({ cancha: i + 1, a: [a], b: [b], ptsA: null, ptsB: null })),
        descansan: ids.filter((id) => !juegan.has(id)),
      });
    }
  }
  return rondas;
}

// Tabla de la liga: victoria = pv puntos, empate = pe puntos.
export function tablaLiga(equipos, rondas, { pv = 3, pe = 1 } = {}) {
  const f = Object.fromEntries(equipos.map((e) => [e.id, { id: e.id, nombre: e.nombre, pj: 0, pg: 0, pe: 0, pp: 0, pf: 0, pc: 0 }]));
  for (const r of rondas) {
    for (const p of r.partidos) {
      if (p.ptsA == null || p.ptsB == null) continue;
      const A = f[p.a[0]];
      const B = f[p.b[0]];
      A.pj += 1; B.pj += 1;
      A.pf += p.ptsA; A.pc += p.ptsB;
      B.pf += p.ptsB; B.pc += p.ptsA;
      if (p.ptsA > p.ptsB) { A.pg += 1; B.pp += 1; }
      else if (p.ptsA < p.ptsB) { B.pg += 1; A.pp += 1; }
      else { A.pe += 1; B.pe += 1; }
    }
  }
  return Object.values(f)
    .map((x) => ({ ...x, dif: x.pf - x.pc, pts: x.pg * pv + x.pe * pe }))
    .sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.pf - a.pf || a.nombre.localeCompare(b.nombre));
}

// Orden de cruces de una llave: [1, 8, 4, 5, 2, 7, 3, 6] para 8 lugares.
function ordenSeeds(tam) {
  let s = [1];
  while (s.length < tam) {
    const n = s.length * 2;
    s = s.flatMap((x) => [x, n + 1 - x]);
  }
  return s;
}

function tituloEliminacion(cruces) {
  if (cruces === 1) return "Final";
  if (cruces === 2) return "Semifinales";
  if (cruces === 4) return "Cuartos de final";
  return `Ronda de ${cruces * 2}`;
}

// `entradas`: en orden de la llave, { pasa: id } (pasa directo) o { partido: true }.
function rondaEliminacion(cruces, numero) {
  const partidos = [];
  for (const c of cruces) {
    if (c.a && c.b) partidos.push({ cancha: partidos.length + 1, a: [c.a], b: [c.b], ptsA: null, ptsB: null });
  }
  return {
    numero,
    titulo: tituloEliminacion(cruces.length),
    entradas: cruces.map((c) => (c.a && c.b ? { partido: true } : { pasa: c.a ?? c.b })),
    partidos,
    pasan: cruces.filter((c) => !(c.a && c.b)).map((c) => c.a ?? c.b),
    descansan: [],
  };
}

// Eliminación directa: si no es potencia de 2, los mejor ubicados pasan directo.
export function armarEliminacion(equipos) {
  const n = equipos.length;
  let tam = 1;
  while (tam < n) tam *= 2;
  const orden = ordenSeeds(tam);
  const cruces = [];
  for (let i = 0; i < tam; i += 2) {
    const a = orden[i];
    const b = orden[i + 1];
    cruces.push({ a: a <= n ? equipos[a - 1].id : null, b: b <= n ? equipos[b - 1].id : null });
  }
  return rondaEliminacion(cruces, 1);
}

// Quién pasa de cada lugar de la llave (los empates no valen: se exige un ganador).
export function ganadoresEliminacion(ronda) {
  let k = 0;
  return ronda.entradas.map((e) => {
    if (e.pasa) return e.pasa;
    const p = ronda.partidos[k++];
    return p.ptsA > p.ptsB ? p.a[0] : p.b[0];
  });
}

// Ronda siguiente de la llave, o null si la que se cerró era la final.
export function siguienteEliminacion(ronda) {
  const g = ganadoresEliminacion(ronda);
  if (g.length === 1) return null;
  const cruces = [];
  for (let i = 0; i < g.length; i += 2) cruces.push({ a: g[i], b: g[i + 1] });
  return rondaEliminacion(cruces, ronda.numero + 1);
}
