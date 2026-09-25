"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { IconoPelota, IconoFutbol, IconoBasquet } from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";

// Pantalla "Elegí tu deporte" -- a pedido del usuario (2026-09-06), es la
// PRIMERA pantalla de la app (no requiere sesión iniciada): Padel es la
// app real (Padelito), Fútbol y Básquet quedan como maqueta navegable
// (DeporteMaquetaForm) -- se puede entrar a mirarlas sin cuenta, mismo
// espíritu que "Próximamente" (Épica 5) pero como pantalla propia. Si ya
// hay sesión iniciada (ej. alguien tocó "Cambiar de deporte" desde
// adentro de Padelito) y elige Padel, va directo al Home sin pasar de
// nuevo por el login.
export default function ElegirDeporteForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [haySesion, setHaySesion] = useState(false);

  useEffect(() => {
    async function verificar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setHaySesion(!!user);
    }
    verificar();
  }, []);

  function elegirPadel() {
    router.push(haySesion ? "/" : "/login");
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-4 items-center">
      <span className="text-xs uppercase tracking-wide text-muted">{t("elegirDeporte.bienvenido")}</span>
      <h1 className="font-heading text-3xl font-semibold text-center">{t("elegirDeporte.titulo")}</h1>
      <p className="text-muted text-sm text-center">{t("elegirDeporte.subtitulo")}</p>

      <div className="w-full flex flex-col gap-3">
        <button
          onClick={elegirPadel}
          className="w-full text-left bg-surface text-ink border-2 border-accent shadow-[0_2px_6px_rgba(20,38,31,0.12)] rounded-[20px] p-5 flex items-center gap-4 cursor-pointer"
        >
          <span className="w-11 h-11 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <IconoPelota width={24} height={24} />
          </span>
          <span className="font-heading text-xl font-semibold flex-1">Padelito</span>
          <span className="bg-accent text-accent-ink text-[10px] font-heading font-semibold px-2 py-1 rounded-full">
            {t("elegirDeporte.yaPodesJugar")}
          </span>
        </button>

        <button
          onClick={() => router.push("/futbolito")}
          className="w-full text-left bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-5 flex items-center gap-4 cursor-pointer"
        >
          <span className="w-11 h-11 rounded-full bg-bg flex items-center justify-center flex-shrink-0">
            <IconoFutbol width={24} height={24} />
          </span>
          <span className="font-heading text-xl font-semibold flex-1">Futbolito</span>
          <span className="bg-bg text-muted text-[10px] font-heading font-semibold px-2 py-1 rounded-full">
            {t("home.proximamente")}
          </span>
        </button>

        <button
          onClick={() => router.push("/basquelito")}
          className="w-full text-left bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-5 flex items-center gap-4 cursor-pointer"
        >
          <span className="w-11 h-11 rounded-full bg-bg flex items-center justify-center flex-shrink-0">
            <IconoBasquet width={24} height={24} />
          </span>
          <span className="font-heading text-xl font-semibold flex-1">Basquelito</span>
          <span className="bg-bg text-muted text-[10px] font-heading font-semibold px-2 py-1 rounded-full">
            {t("home.proximamente")}
          </span>
        </button>
      </div>

      <p className="text-xs text-muted text-center">{t("elegirDeporte.cambiarCuandoQuieras")}</p>
    </div>
  );
}
