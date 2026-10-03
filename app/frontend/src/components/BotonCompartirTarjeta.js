"use client";

import { useState } from "react";
import { generarTarjeta } from "@/lib/tarjetaPartido";
import { IconoCompartir } from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/config";

function duracionTexto(min) {
  if (!min) return "";
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`;
}

// Botón "Compartir tarjeta" (2026-10-03): arma una imagen cuadrada con el
// resultado (diseño B si ganaste, C si perdiste -- ver lib/tarjetaPartido.js)
// y abre el menú de compartir del celu. Si el navegador no puede compartir
// archivos (compu), la descarga.
export default function BotonCompartirTarjeta({ gane, mios, rivales, sets, fechaHora, duracionMin, cancha }) {
  const { t, locale } = useLocale();
  const [estado, setEstado] = useState("listo"); // listo | armando | descargada | error

  async function compartir() {
    setEstado("armando");
    try {
      const blob = await generarTarjeta({
        gane,
        mios,
        rivales,
        sets: sets ? sets.split("  ·  ") : [],
        fecha: new Date(fechaHora).toLocaleDateString(INTL_LOCALE[locale] ?? "es-AR", { weekday: "short", day: "numeric", month: "short" }),
        duracion: duracionTexto(duracionMin),
        cancha,
        textos: { ganamos: t("tarjeta.ganamos"), vs: t("tarjeta.vs"), leGanaronA: t("tarjeta.leGanaronA") },
      });
      const archivo = new File([blob], "padelito-partido.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: t("tarjeta.titulo") });
        } catch (e) {
          if (e?.name !== "AbortError") throw e; // cerrar el menú no es un error
        }
        setEstado("listo");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "padelito-partido.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        setEstado("descargada");
      }
    } catch {
      setEstado("error");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={compartir}
        disabled={estado === "armando"}
        className="w-full flex items-center justify-center gap-2 rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer disabled:opacity-60"
      >
        <IconoCompartir className="ico" aria-hidden />
        {estado === "armando" ? t("tarjeta.armando") : t("tarjeta.compartir")}
      </button>
      <span className={`text-xs ${estado === "error" ? "text-[#dc2626]" : "text-muted"}`} role={estado === "error" ? "alert" : undefined}>
        {estado === "error" ? t("tarjeta.error") : estado === "descargada" ? t("tarjeta.descargada") : t("tarjeta.ayuda")}
      </span>
    </div>
  );
}
