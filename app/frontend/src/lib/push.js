// Notificaciones push (2026-10-07): suscribir este celu para que los avisos
// importantes lleguen aunque la app esté cerrada (ver SQL 084 y /api/push).
import { supabase } from "@/lib/supabaseClient";

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLICA;

export function soportaPush() {
  return (
    typeof window !== "undefined" &&
    !!CLAVE_PUBLICA &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function permisoPush() {
  return soportaPush() ? Notification.permission : "unsupported";
}

function aBytes(base64) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

// ¿Este celu ya está suscripto?
export async function pushActivo() {
  if (!soportaPush() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

// Pide permiso (si hace falta), suscribe y guarda en la base. Devuelve
// "ok", "denegado" o "error".
export async function activarPush() {
  if (!soportaPush()) return "error";
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return "denegado";
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE_PUBLICA) }));
    const json = sub.toJSON();
    const { error } = await supabase.rpc("guardar_suscripcion_push", {
      p_endpoint: json.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
    });
    return error ? "error" : "ok";
  } catch {
    return "error";
  }
}

export async function desactivarPush() {
  if (!soportaPush()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await supabase.from("push_suscripciones").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  } catch {
    // nada
  }
}
