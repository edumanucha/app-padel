"use client";

import { useRouter } from "next/navigation";
import FormularioFeedback from "@/components/FormularioFeedback";
import { useLocale } from "@/i18n/LocaleContext";

// Link público de donación (por ejemplo, cafecito.app/usuario). Mientras esté
// vacío, la oración del cafecito no se muestra.
const LINK_DONACION = "";

export default function QuienesSomosForm() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="w-full max-w-md flex flex-col gap-5 text-ink">
      {/* Rediseño Cartel (2026-10-01): sin tarjeta -- el texto va suelto,
          con una línea gruesa abajo del título y los párrafos separados por
          líneas finas, como una nota de diario. */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-ink">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("quienesSomos.titulo")}</h1>
        <button
          onClick={() => router.push("/menu")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("quienesSomos.volver")}
        </button>
      </div>

      <div className="flex flex-col text-[15px] text-ink leading-relaxed">
        {/* El primer párrafo funciona como bajada: un poco más grande. */}
        <p className="text-base pb-4 border-b border-ink/10">
          <b>{t("quienesSomos.p1Negrita")}</b> {t("quienesSomos.p1")}
        </p>
        <p className="py-4 border-b border-ink/10">{t("quienesSomos.p2")}</p>
        <p className="py-4 border-b border-ink/10">
          <b>{t("quienesSomos.p3Negrita")}</b> {t("quienesSomos.p3")}
        </p>
        <p className="py-4 border-b border-ink/10">{t("quienesSomos.p4")}</p>
        {LINK_DONACION && (
          <p className="py-4 border-b border-ink/10">
            {t("quienesSomos.donacionAntes")}
            <a href={LINK_DONACION} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
              {t("quienesSomos.donacionLink")}
            </a>
            {t("quienesSomos.donacionDespues")}
          </p>
        )}
      </div>

      <FormularioFeedback titulo={t("quienesSomos.feedbackTitulo")} />
    </div>
  );
}
