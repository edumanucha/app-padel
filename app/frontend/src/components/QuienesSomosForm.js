"use client";

import { useRouter } from "next/navigation";
import FormularioFeedback from "@/components/FormularioFeedback";
import { useLocale } from "@/i18n/LocaleContext";

export default function QuienesSomosForm() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="w-full max-w-md flex flex-col gap-5">
      <div className="bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-semibold">📖 {t("quienesSomos.titulo")}</h1>
          <button
            onClick={() => router.push("/menu")}
            className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
          >
            {t("quienesSomos.volver")}
          </button>
        </div>

        <p className="text-sm text-ink leading-relaxed">{t("quienesSomos.texto")}</p>
      </div>

      <FormularioFeedback titulo={t("quienesSomos.feedbackTitulo")} />
    </div>
  );
}
