"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
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
      } = await usuarioRapido();
      setHaySesion(!!user);
    }
    verificar();
  }, []);

  function elegirPadel() {
    router.push(haySesion ? "/" : "/login");
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-4 items-center">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("elegirDeporte.bienvenido")}</span>
      <h1 className="font-titulo text-5xl font-black uppercase leading-[0.95] text-center">{t("elegirDeporte.titulo")}</h1>
      <p className="text-muted text-sm text-center">{t("elegirDeporte.subtitulo")}</p>

      {/* Rediseño Cartel (2026-10-01): Padelito es la protagonista en verde
          tablero con la etiqueta amarilla; Futbolito y Basquelito quedan
          livianos, como filas con línea. */}
      <div className="w-full flex flex-col gap-4">
        <button
          onClick={elegirPadel}
          className="w-full text-left rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-5 flex items-center gap-4 cursor-pointer"
        >
          <span className="w-12 h-12 rounded-full bg-[#0f2e29] text-[#eaf4f0] flex items-center justify-center flex-shrink-0">
            <IconoPelota width={26} height={26} />
          </span>
          <span className="font-titulo font-black uppercase text-[2.2rem] leading-none flex-1">Padelito</span>
          <span className="bg-accent text-accent-ink text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-[6px] flex-shrink-0">
            {t("elegirDeporte.yaPodesJugar")}
          </span>
        </button>

        <div className="flex flex-col border-t border-ink/10">

        <button
          onClick={() => router.push("/futbolito")}
          className="w-full text-left text-ink border-b border-ink/10 py-3 flex items-center gap-3 cursor-pointer"
        >
          <span className="w-9 h-9 rounded-full bg-bg border border-ink/10 flex items-center justify-center flex-shrink-0 text-muted">
            <IconoFutbol width={20} height={20} />
          </span>
          <span className="font-titulo font-extrabold uppercase text-xl leading-none flex-1">Futbolito</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            {t("home.proximamente")}
          </span>
        </button>

        <button
          onClick={() => router.push("/basquelito")}
          className="w-full text-left text-ink border-b border-ink/10 py-3 flex items-center gap-3 cursor-pointer"
        >
          <span className="w-9 h-9 rounded-full bg-bg border border-ink/10 flex items-center justify-center flex-shrink-0 text-muted">
            <IconoBasquet width={20} height={20} />
          </span>
          <span className="font-titulo font-extrabold uppercase text-xl leading-none flex-1">Basquelito</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            {t("home.proximamente")}
          </span>
        </button>
        </div>
      </div>

      <p className="text-xs text-muted text-center">{t("elegirDeporte.cambiarCuandoQuieras")}</p>
    </div>
  );
}
