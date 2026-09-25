import { createClient } from "@supabase/supabase-js";

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
