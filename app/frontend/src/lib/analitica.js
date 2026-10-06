import { supabase } from "@/lib/supabaseClient";

// Estadísticas de uso (2026-10-06, SQL 082). Registra QUÉ se hace (pantalla,
// función, falla), nunca lo que la persona escribe. Cada dispositivo tiene un
// código al azar guardado en el celu (no es el mail ni el nombre). Si el
// navegador pide "no rastrear", no se registra nada. Medir nunca rompe la
// app: todo va en try/catch y sin esperar respuesta.

const CLAVE = "padelito_anon";
const ULTIMO_FALLO = {};

function noRastrear() {
  try {
    return navigator.doNotTrack === "1" || window.doNotTrack === "1";
  } catch {
    return false;
  }
}

function codigoDelDispositivo() {
  try {
    let v = localStorage.getItem(CLAVE);
    if (!v) {
      v = (crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`).slice(0, 36);
      localStorage.setItem(CLAVE, v);
    }
    return v;
  } catch {
    return null;
  }
}

// "android · chrome · web" / "ios · safari · app instalada": sin datos de la persona.
export function dispositivo() {
  try {
    const ua = navigator.userAgent || "";
    const so = /android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) ? "ios" : /windows/i.test(ua) ? "windows" : /mac os/i.test(ua) ? "mac" : /linux/i.test(ua) ? "linux" : "otro";
    const navegador = /edg\//i.test(ua) ? "edge" : /firefox|fxios/i.test(ua) ? "firefox" : /samsungbrowser/i.test(ua) ? "samsung" : /chrome|crios/i.test(ua) ? "chrome" : /safari/i.test(ua) ? "safari" : "otro";
    const instalada = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
    return `${so} · ${navegador} · ${instalada ? "app instalada" : "web"}`;
  } catch {
    return null;
  }
}

// /partido/123e4567-... -> /partido/:id
export function pantallaNormalizada(ruta) {
  return (ruta || "/")
    .split("?")[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .slice(0, 60);
}

export function registrar(tipo, datos = null, pantalla = null) {
  try {
    if (typeof window === "undefined" || noRastrear()) return;
    // Las fallas repetidas del mismo tipo se mandan una vez por minuto.
    if (tipo === "falla") {
      const k = datos?.tipo ?? "x";
      const ahora = Date.now();
      if (ahora - (ULTIMO_FALLO[k] ?? 0) < 60000) return;
      ULTIMO_FALLO[k] = ahora;
    }
    const anon = codigoDelDispositivo();
    if (!anon) return;
    supabase
      .rpc("registrar_evento", {
        p_anon: anon,
        p_tipo: tipo,
        p_pantalla: pantalla ?? pantallaNormalizada(window.location.pathname),
        p_datos: datos,
        p_disp: dispositivo(),
      })
      .then(
        () => {},
        () => {}
      );
  } catch {
    // medir nunca rompe nada
  }
}
