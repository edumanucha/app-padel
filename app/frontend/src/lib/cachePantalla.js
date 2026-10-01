// Copia de lo último que se vio en cada pantalla (2026-09-30, optimización a
// pedido del usuario: "siento que la app está un poco lenta"). Al volver a
// una pantalla se muestra al toque esta copia y, mientras tanto, se piden
// los datos nuevos al servidor; cuando llegan, reemplazan a la copia.
//
// - Se guarda junto con el id del usuario: si en el celu entra otra
//   persona, nunca ve la copia de la anterior.
// - Se borra toda al cerrar sesión (ver supabaseClient.js).
// - Es solo para mostrar rápido: las acciones (anotarse, invitar, etc.)
//   siempre van contra el servidor.

const PREFIJO = "padelito_pantalla_";

export function leerPantalla(clave, userId) {
  try {
    const guardado = JSON.parse(localStorage.getItem(PREFIJO + clave));
    return guardado && guardado.u === userId ? guardado.d : null;
  } catch {
    return null;
  }
}

export function guardarPantalla(clave, userId, datos) {
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify({ u: userId, d: datos }));
  } catch {
    // sin lugar o sin localStorage: no pasa nada, solo no hay copia
  }
}

export function borrarPantallas() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIJO))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // nada
  }
}
