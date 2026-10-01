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
    <div className="w-full max-w-md flex flex-col gap-5">
      <div className="bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-semibold">{t("quienesSomos.titulo")}</h1>
          <button
            onClick={() => router.push("/menu")}
            className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
          >
            {t("quienesSomos.volver")}
          </button>
        </div>

        <div className="flex flex-col gap-3 text-sm text-ink leading-relaxed">
          <p>
            <b>{t("quienesSomos.p1Negrita")}</b> {t("quienesSomos.p1")}
          </p>
          <p>{t("quienesSomos.p2")}</p>
          <p>
            <b>{t("quienesSomos.p3Negrita")}</b> {t("quienesSomos.p3")}
          </p>
          <p>{t("quienesSomos.p4")}</p>
          {LINK_DONACION && (
            <p>
              {t("quienesSomos.donacionAntes")}
              <a href={LINK_DONACION} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                {t("quienesSomos.donacionLink")}
              </a>
              {t("quienesSomos.donacionDespues")}
            </p>
          )}
        </div>
      </div>

      <FormularioFeedback titulo={t("quienesSomos.feedbackTitulo")} />
    </div>
  );
}
