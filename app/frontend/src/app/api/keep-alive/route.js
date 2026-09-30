// Keep-alive de Supabase: el plan free pausa el proyecto si pasa 7 días
// sin actividad. Vercel Cron (ver vercel.json) llama a esta ruta una vez
// por día y acá ejecutamos el RPC latido('vercel') de 062_keep_alive_latido.sql,
// que ESCRIBE en la base (2026-09-30: con el "select 1" de la v1 el
// proyecto se pausó igual). GitHub Actions hace lo mismo cada 2 días como
// segunda fuente independiente (.github/workflows/supabase-keep-alive.yml).
//
// Si en Vercel se define la variable CRON_SECRET, Vercel la manda sola en
// el header Authorization y acá rechazamos cualquier otra llamada.
import { supabase } from "@/lib/supabaseClient";

// Nunca cachear: cada llamada tiene que llegar de verdad a la base.
export const dynamic = "force-dynamic";

export async function GET(request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("latido", { p_origen: "vercel" });
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, ultimo_latido: data });
}
