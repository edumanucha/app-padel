"use client";

import ConPelota from "@/components/ConPelota";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleContext";

const SECCIONES = ["queDatos", "paraQue", "dondeSeGuarda", "usoDeLaApp", "tusDatos", "contacto"];

// Política de privacidad (2026-10-03), escrita en lenguaje simple y de
// acuerdo con lo que la app hace de verdad. Mismo estilo que Quiénes somos:
// texto suelto separado por líneas finas.
export default function PrivacidadForm() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="w-full max-w-md flex flex-col gap-5 text-ink">
      <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-ink">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{t("privacidad.titulo")}</ConPelota></h1>
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("privacidad.volver")}
        </button>
      </div>

      <p className="text-base text-ink leading-relaxed pb-4 border-b border-ink/10">{t("privacidad.intro")}</p>

      <div className="flex flex-col text-[15px] leading-relaxed">
        {SECCIONES.map((s) => (
          <section key={s} className="py-4 border-b border-ink/10 flex flex-col gap-1">
            <h2 className="font-titulo text-2xl font-black uppercase leading-none">{t(`privacidad.${s}Titulo`)}</h2>
            <p>{t(`privacidad.${s}`)}</p>
          </section>
        ))}
      </div>

      <p className="text-xs text-muted">{t("privacidad.actualizado")}</p>
    </div>
  );
}
