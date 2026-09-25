"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleContext";

// Maqueta navegable de un deporte todavía no construido (a pedido del
// usuario, 2026-09-06): reusa la estructura visual del Home real de
// Padelito (HomeForm.js) con datos de ejemplo, para mostrar hacia dónde
// va el producto sin hacerlo pasar por funcional. Ningún botón de acá
// navega a una pantalla real ni ejecuta ninguna acción -- mismo
// principio de US-5.1/5.2 (Próximamente sin acceso real), pero como
// pantalla completa en vez de un ítem de menú suelto.
export default function DeporteMaquetaForm({ nombre, emoji, colorAcento, datosEjemplo }) {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="w-full max-w-md flex flex-col gap-4 pb-10">
      <div className="bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{emoji}</span>
          <div>
            <span className="font-heading text-lg font-semibold block">{nombre}</span>
            <span className="text-muted text-sm">{t("deporteMaqueta.vistaPrevia")}</span>
          </div>
        </div>
        <span
          className="text-[10px] font-heading font-semibold px-2 py-1 rounded-full border-2 border-outline"
          style={{ background: colorAcento, color: "#1a1305" }}
        >
          {t("home.proximamente")}
        </span>
      </div>

      <div className="bg-bg shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-4 text-sm text-muted">
        {t("deporteMaqueta.descripcion", { nombre })}
      </div>

      <div className="bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-4">
        <span className="font-heading font-semibold text-sm block mb-1">{t("deporteMaqueta.proximoPartidoEjemplo")}</span>
        <span className="text-sm text-muted">{datosEjemplo.proximoPartido}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <span className="font-heading font-semibold text-sm px-4 py-4 rounded-[16px] bg-accent text-accent-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] opacity-60 text-center">
          {t("home.crearPartido")}
        </span>
        <span className="font-heading font-semibold text-sm px-4 py-4 rounded-[16px] bg-accent text-accent-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] opacity-60 text-center">
          {t("home.abiertos")}
        </span>
      </div>

      <div className="bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-4">
        <span className="font-heading font-semibold text-sm block mb-1">{t("deporteMaqueta.ultimoPartidoEjemplo")}</span>
        <span className="text-sm text-muted">{datosEjemplo.ultimoPartido}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {datosEjemplo.stats.map((s) => (
          <div key={s.etiqueta} className="bg-surface shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-3 text-center">
            <span className="font-heading text-xl font-semibold block">{s.valor}</span>
            <span className="text-xs text-muted">{s.etiqueta}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push("/elegir-deporte")}
        className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer self-center mt-4"
      >
        ← {t("deporteMaqueta.elegirOtroDeporte")}
      </button>
    </div>
  );
}
