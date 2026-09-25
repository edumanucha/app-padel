// Keep-alive de Supabase (2026-09-25): el plan free pausa el proyecto si
// pasa 7 días sin actividad. Vercel Cron (ver vercel.json) llama a esta
// ruta una vez por día y acá ejecutamos el RPC keep_alive() de
// 060_keep_alive.sql -- una consulta real a la base, que es lo que
// Supabase cuenta como actividad.
//
// Si en Vercel se define la variable CRON_SECRET, Vercel la manda sola en
// el header Authorization y acá rechazamos cualquier otra llamada. Sin
// esa variable la ruta queda abierta, pero lo único que hace es un
// "select 1", no expone nada.
import { supabase } from "@/lib/supabaseClient";

export async function GET(request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("keep_alive");
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, resultado: data, fecha: new Date().toISOString() });
}
