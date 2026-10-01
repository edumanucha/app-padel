"use client";

import Link from "next/link";
import LoginGoogleForm from "@/components/LoginGoogleForm";
import LoginEmailForm from "@/components/LoginEmailForm";
import { useLocale } from "@/i18n/LocaleContext";

// Unica tarjeta visual de /login: combina el login real con Google
// (US-1.1) y el login por email (LoginEmailForm.js). Cada uno mantiene
// su propia logica en su componente; este componente es solo la tarjeta
// compartida que los envuelve.
//
// El login de prueba (usuario de prueba con nombre/apellido) se sacó
// del todo (2026-09-13, decisión del usuario antes de un eventual
// pasaje a producción real) -- ver LoginPruebaForm.backup-2026-09-13.js
// si hiciera falta recuperarlo para testing.
export default function LoginForm() {
  const { t } = useLocale();

  return (
    <div className="w-full max-w-sm flex flex-col gap-3">
      <Link
        href="/elegir-deporte"
        className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink self-start"
      >
        ← {t("deporteMaqueta.elegirOtroDeporte")}
      </Link>
      {/* Rediseño Cartel (2026-10-01): el título va en un bloque verde
          tablero como protagonista y las formas de entrar quedan abajo, sin
          tarjeta. Los botones viven en LoginGoogleForm/LoginEmailForm. */}
      <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-5 flex flex-col gap-2">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("login.titulo")}</h1>
        <p className="text-sm text-[#c4dad3]">{t("login.subtitulo")}</p>
      </div>

      <div className="text-ink flex flex-col gap-4 pt-1">
        <LoginGoogleForm />
        <LoginEmailForm />
      </div>
    </div>
  );
}
