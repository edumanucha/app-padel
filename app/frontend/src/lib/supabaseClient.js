import { createClient } from "@supabase/supabase-js";
import { borrarPantallas } from "@/lib/cachePantalla";

// Cliente de Supabase para usar del lado del navegador (en componentes
// "use client"). Lee las variables NEXT_PUBLIC_* de .env.local -- el
// prefijo NEXT_PUBLIC_ es lo que le dice a Next.js que exponga esas
// variables al código que corre en el navegador (sin ese prefijo, una
// variable de entorno solo existe del lado del servidor, por seguridad).
// flowType: "pkce" (en vez del default "implicit") -- con esto, al
// loguearse con Google el navegador nunca llega a ver un access_token
// en la URL: Google devuelve un codigo de un solo uso (?code=...) que
// esta misma libreria intercambia por la sesion en un segundo paso
// automatico (no hace falta llamar a nada manualmente).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: "pkce",
    },
  }
);

// Al cerrar sesión se borran las copias de las pantallas (cachePantalla.js),
// así nadie que use el celu después ve los datos de la sesión anterior.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((evento) => {
    if (evento === "SIGNED_OUT") borrarPantallas();
  });
}

// Usuario actual, rápido (2026-09-30, optimización a pedido del usuario:
// "siento que la app está un poco lenta"). supabase.auth.getUser() va
// SIEMPRE al servidor a validar el token (una vuelta de red de ~0,15-0,3 s
// en cada pantalla); getSession() lo lee de la sesión guardada en el celu
// y solo sale a la red si hay que renovar el token vencido. Es seguro para
// decidir qué mostrar: la base de datos igual valida el token en cada
// consulta (RLS), así que nadie ve datos que no le corresponden.
// Devuelve la misma forma que getUser(): { data: { user }, error }.
export async function usuarioRapido() {
  const { data, error } = await supabase.auth.getSession();
  return { data: { user: data?.session?.user ?? null }, error };
}
