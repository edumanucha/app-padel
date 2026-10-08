// Notificaciones push (2026-10-07): la base (trigger enviar_push_notificacion,
// SQL 084) llama a esta ruta cuando se crea un aviso importante, con las
// suscripciones de la persona y la clave compartida PUSH_SECRETO en el header
// x-push-secreto. Acá se firma y se manda la notificación a cada celu con las
// claves VAPID. Las suscripciones que el servicio da por vencidas (404/410) se
// borran de la base.
import webpush from "web-push";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const secreto = process.env.PUSH_SECRETO;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLICA;
  const privada = process.env.VAPID_PRIVADA;
  if (!secreto || !publica || !privada) {
    return Response.json({ error: "push sin configurar" }, { status: 503 });
  }
  if (request.headers.get("x-push-secreto") !== secreto) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  let datos;
  try {
    datos = await request.json();
  } catch {
    return Response.json({ error: "cuerpo inválido" }, { status: 400 });
  }
  const { suscripciones = [], titulo, cuerpo, url, etiqueta } = datos ?? {};
  if (!titulo || !Array.isArray(suscripciones)) {
    return Response.json({ error: "faltan datos" }, { status: 400 });
  }

  webpush.setVapidDetails("https://padelito-app.vercel.app", publica, privada);
  const carga = JSON.stringify({ titulo, cuerpo, url: url || "/", etiqueta });

  const resultados = await Promise.all(
    suscripciones.slice(0, 20).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          carga,
          { TTL: 60 * 60, urgency: "high" }
        );
        return "ok";
      } catch (e) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.rpc("borrar_suscripcion_vencida", { p_endpoint: s.endpoint, p_secreto: secreto });
          return "vencida";
        }
        return "error";
      }
    })
  );

  return Response.json({ ok: true, resultados });
}
