import { supabase } from "@/lib/supabaseClient";

// Marcadorcito sin internet (2026-09-30, a pedido del usuario: "que valide,
// se loguee y permita llevar el marcador sin internet").
//
// - Sesión: si la persona ya entró alguna vez, la sesión queda guardada en
//   el celu (supabase-js la guarda en localStorage). Sin señal no se puede
//   validar contra el servidor, así que se confía en la guardada.
// - Partido creado sin señal: el id (uuid) se genera en el celu, así la URL
//   /partido/<id>/marcador ya es la definitiva. Todo (partido, plantel y
//   marcador) se guarda en localStorage y se sube entero a Supabase cuando
//   vuelve la conexión, con ese mismo id.
// - Partido creado CON señal: después de cada carga exitosa se guarda una
//   copia en el celu, para poder reabrir el marcador aunque se recargue la
//   página sin señal.
// Los puntos sin subir siguen yendo a `marcadorcito_pendiente_<id>` (ver
// MarcadorForm.js), igual que antes.

const PREFIJO_LOCAL = "marcadorcito_local_";
const PREFIJO_PENDIENTE = "marcadorcito_pendiente_";

export function sinConexion() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

// Errores de red de supabase-js (sin señal, timeout): "Failed to fetch" en
// las tablas, AuthRetryableFetchError en auth.
export function esErrorDeRed(error) {
  if (!error) return false;
  const texto = `${error.name ?? ""} ${error.message ?? ""}`;
  return /Failed to fetch|NetworkError|Load failed|RetryableFetch|fetch failed/i.test(texto) || sinConexion();
}

function leerJSON(clave) {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

function guardarJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

// Usuario actual, también sin señal. Usa la sesión guardada en el celu
// (getSession: sin vuelta al servidor salvo para renovar el token -- ver
// usuarioRapido en supabaseClient.js, 2026-09-30). Si el token ya venció y
// no hay red para renovarlo, getSession puede devolver null: en ese caso se
// lee directo la sesión que supabase-js dejó en localStorage.
export async function usuarioActual() {
  let errorSesion = null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (data?.session?.user) return data.session.user;
    errorSesion = error;
  } catch (e) {
    errorSesion = e;
  }
  // Con señal y sin sesión: no hay nadie logueado.
  if (!esErrorDeRed(errorSesion)) return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const clave = localStorage.key(i);
      if (/^sb-.*-auth-token$/.test(clave)) {
        const guardada = leerJSON(clave);
        const user = guardada?.user ?? guardada?.currentSession?.user;
        if (user) return user;
      }
    }
  } catch {
    // sin localStorage
  }
  return null;
}

// Nombre propio guardado (para armar el plantel sin señal).
export function guardarNombrePropio(nombre) {
  try {
    localStorage.setItem("padelito_nombre_propio", nombre);
  } catch {
    // nada
  }
}
export function leerNombrePropio() {
  try {
    return localStorage.getItem("padelito_nombre_propio");
  } catch {
    return null;
  }
}

export function leerPartidoLocal(partidoId) {
  return leerJSON(PREFIJO_LOCAL + partidoId);
}

// Copia del partido cargado con señal (para reabrirlo sin señal).
export function guardarCopiaPartido(partidoId, { partido, filas, resultado }) {
  const previo = leerPartidoLocal(partidoId);
  // Uno creado sin señal y todavía no subido no se pisa con una copia.
  if (previo?.creadoSinSenal && !previo.subido) return;
  guardarJSON(PREFIJO_LOCAL + partidoId, { partido, filas, resultado, creadoSinSenal: false, subido: true });
}

// Guarda el último estado del marcador dentro del partido local (así, si se
// reabre sin señal, arranca de donde quedó).
export function actualizarResultadoLocalGuardado(partidoId, cambios) {
  const local = leerPartidoLocal(partidoId);
  if (!local) return;
  local.resultado = { ...local.resultado, ...cambios, updated_at: new Date().toISOString() };
  guardarJSON(PREFIJO_LOCAL + partidoId, local);
}

// Crea un partido ad-hoc solo en el celu. `jugadores` = [{ equipo,
// jugadorId, nombre }] sin contar al organizador (que va siempre en A).
export function crearPartidoSinSenal({ usuario, nombrePropio, cancha, puntoDeOro, jugadores, estadoInicial }) {
  const id = crypto.randomUUID();
  const ahora = new Date().toISOString();
  const partido = {
    id,
    organizador_id: usuario.id,
    fecha_hora: ahora,
    cancha: cancha?.trim() || "Sin cancha",
    cancha_id: null,
    cantidad_jugadores: 4,
    punto_de_oro: puntoDeOro,
    es_adhoc: true,
    estado: "abierto",
    created_at: ahora,
  };
  const filas = [
    { id: `local-0`, jugador_id: usuario.id, invitado_nombre: null, equipo: "A", estado: "confirmado", created_at: ahora, perfiles: { nombre: nombrePropio || "Vos" } },
    ...jugadores.map((j, i) => ({
      id: `local-${i + 1}`,
      jugador_id: j.jugadorId ?? null,
      invitado_nombre: j.jugadorId ? null : j.nombre,
      equipo: j.equipo,
      estado: "confirmado",
      created_at: ahora,
      perfiles: j.jugadorId ? { nombre: j.nombre } : null,
    })),
  ];
  const resultado = {
    partido_id: id,
    estado: { ...estadoInicial, puntoDeOro },
    finalizado: false,
    ganador: null,
    created_at: ahora,
    updated_at: ahora,
  };
  const ok = guardarJSON(PREFIJO_LOCAL + id, { partido, filas, resultado, creadoSinSenal: true, subido: false });
  return ok ? id : null;
}

let subiendo = false;

// Sube a Supabase un partido creado sin señal. Es idempotente (se puede
// reintentar si se corta a la mitad): cada paso revisa qué ya está arriba.
// Devuelve true si el partido quedó en la base.
export async function subirPartidoSinSenal(partidoId) {
  const local = leerPartidoLocal(partidoId);
  if (!local) return true;
  if (!local.creadoSinSenal || local.subido) return true;
  const { partido, filas, resultado } = local;

  // 1) Partido (con el mismo id que ya usa la URL).
  const { data: existe, error: errExiste } = await supabase.from("partidos").select("id").eq("id", partidoId).maybeSingle();
  if (errExiste) return false;
  if (!existe) {
    const { error } = await supabase.from("partidos").insert({
      id: partido.id,
      organizador_id: partido.organizador_id,
      fecha_hora: partido.fecha_hora,
      cancha: partido.cancha,
      cancha_id: null,
      cantidad_jugadores: 4,
      punto_de_oro: partido.punto_de_oro,
      es_adhoc: true,
    });
    if (error) return false;
  }

  // 2) Plantel. El organizador lo agrega solo un trigger al crear el
  // partido; acá se le pone el equipo y se suman los otros 3 si faltan.
  const { error: errEquipo } = await supabase
    .from("partido_jugadores")
    .update({ equipo: "A" })
    .eq("partido_id", partidoId)
    .eq("jugador_id", partido.organizador_id);
  if (errEquipo) return false;
  const { data: yaEstan, error: errEstan } = await supabase.from("partido_jugadores").select("id").eq("partido_id", partidoId);
  if (errEstan) return false;
  if ((yaEstan ?? []).length < filas.length) {
    const otros = filas
      .filter((f) => f.jugador_id !== partido.organizador_id)
      .map((f) => ({
        partido_id: partidoId,
        jugador_id: f.jugador_id,
        invitado_nombre: f.invitado_nombre,
        equipo: f.equipo,
        estado: "confirmado",
      }));
    const { error } = await supabase.from("partido_jugadores").insert(otros);
    if (error) return false;
  }

  // 3) Marcador: el último estado (lo pendiente es más nuevo que lo guardado).
  const pendiente = leerJSON(PREFIJO_PENDIENTE + partidoId);
  const final = pendiente
    ? { estado: pendiente.estado, finalizado: pendiente.finalizado, ganador: pendiente.ganador }
    : { estado: resultado.estado, finalizado: resultado.finalizado, ganador: resultado.ganador };
  const { data: resExiste, error: errRes } = await supabase
    .from("resultados_partido")
    .select("partido_id")
    .eq("partido_id", partidoId)
    .maybeSingle();
  if (errRes) return false;
  const { error: errGuardar } = resExiste
    ? await supabase.from("resultados_partido").update(final).eq("partido_id", partidoId)
    : await supabase.from("resultados_partido").insert({ partido_id: partidoId, created_at: resultado.created_at, ...final });
  if (errGuardar) return false;

  local.subido = true;
  guardarJSON(PREFIJO_LOCAL + partidoId, local);
  if (pendiente && leerJSON(PREFIJO_PENDIENTE + partidoId)?.ts === pendiente.ts) {
    try {
      localStorage.removeItem(PREFIJO_PENDIENTE + partidoId);
    } catch {
      // nada
    }
  }
  return true;
}

// Sube todo lo que haya quedado en el celu: partidos creados sin señal y
// puntos pendientes de partidos que ya estaban en la base. Se llama al
// abrir la app y cada vez que vuelve la conexión (SincronizarMarcadores.js).
export async function sincronizarTodo() {
  if (subiendo || sinConexion()) return;
  subiendo = true;
  try {
    const claves = [];
    for (let i = 0; i < localStorage.length; i++) claves.push(localStorage.key(i));
    for (const clave of claves) {
      if (!clave?.startsWith(PREFIJO_LOCAL)) continue;
      const id = clave.slice(PREFIJO_LOCAL.length);
      const local = leerJSON(clave);
      if (local?.creadoSinSenal && !local.subido) await subirPartidoSinSenal(id);
    }
    for (const clave of claves) {
      if (!clave?.startsWith(PREFIJO_PENDIENTE)) continue;
      const id = clave.slice(PREFIJO_PENDIENTE.length);
      const local = leerPartidoLocal(id);
      if (local?.creadoSinSenal && !local.subido) continue;
      const pendiente = leerJSON(clave);
      if (!pendiente) continue;
      const { error } = await supabase
        .from("resultados_partido")
        .update({ estado: pendiente.estado, finalizado: pendiente.finalizado, ganador: pendiente.ganador })
        .eq("partido_id", id);
      if (!error && leerJSON(clave)?.ts === pendiente.ts) localStorage.removeItem(clave);
    }
    // Limpieza: copias de partidos ya subidos y terminados hace más de 7 días.
    const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const clave of claves) {
      if (!clave?.startsWith(PREFIJO_LOCAL)) continue;
      const local = leerJSON(clave);
      const fecha = new Date(local?.resultado?.updated_at ?? 0).getTime();
      if (local?.subido && local.resultado?.finalizado && fecha < limite) localStorage.removeItem(clave);
    }
  } catch {
    // se reintenta en la próxima
  } finally {
    subiendo = false;
  }
}
