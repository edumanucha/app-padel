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
        className="font-heading font-semibold text-sm text-muted self-start"
      >
        ← {t("deporteMaqueta.elegirOtroDeporte")}
      </Link>
      <div className="bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold">{t("login.titulo")}</h1>
        <p className="text-muted text-sm">{t("login.subtitulo")}</p>

        <LoginGoogleForm />
        <LoginEmailForm />
      </div>
    </div>
  );
}
