"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

// Login real con Google (US-1.1), a través de Supabase Auth + OAuth.
// Al hacer clic, Supabase redirige a Google, el usuario elige su cuenta,
// y Google devuelve el control a Supabase, que termina redirigiendo a
// /perfil con la sesion ya iniciada. No hay manejo manual de tokens aca.
// No dibuja su propia tarjeta: el componente padre (LoginForm) es el
// dueño de esa tarjeta compartida.
export default function LoginGoogleForm() {
  const { t } = useLocale();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleLoginGoogle() {
    setError("");
    setCargando(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (oauthError) {
      setError(t("loginGoogle.noSePudoIniciar", { mensaje: oauthError.message }));
      setCargando(false);
    }
    // Si no hay error, el navegador ya esta siendo redirigido a Google,
    // asi que no hace falta hacer nada mas aca.
  }

  return (
    <>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={handleLoginGoogle}
        disabled={cargando}
        className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {cargando ? (
          <PelotaLoader />
        ) : (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.3 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8.1l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.6 5.4C39.9 36.7 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
          </svg>
        )}
        {cargando ? t("loginGoogle.redirigiendo") : t("loginGoogle.iniciarSesion")}
      </button>
    </>
  );
}
