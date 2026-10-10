"use client";

import ConPelota from "@/components/ConPelota";
import { useRouter } from "next/navigation";
import FormularioFeedback from "@/components/FormularioFeedback";
import Logo from "@/components/Logo";
import { useLocale } from "@/i18n/LocaleContext";

// Perfil de quien arma Padelito dentro de la app (2026-10-03, a pedido del usuario:
// "invitame a jugar" tiene que llevar a mi perfil de Padelito). Es el id de su cuenta;
// ver el perfil exige tener sesión, igual que el resto de los jugadores.
const ID_CREADOR = "484872ad-02d9-4bc5-9754-6817160c9423";

// Link público de donación (por ejemplo, cafecito.app/usuario). Mientras esté
// vacío, la oración del cafecito no se muestra.
const LINK_DONACION = "https://cafecito.app/edumanucha";

export default function QuienesSomosForm() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="w-full max-w-md flex flex-col gap-5 text-ink">
      {/* Rediseño Cartel (2026-10-01): sin tarjeta -- el texto va suelto,
          con una línea gruesa abajo del título y los párrafos separados por
          líneas finas, como una nota de diario. */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-ink">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{t("quienesSomos.titulo")}</ConPelota></h1>
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
        <button
          type="button"
          onClick={() => router.push(`/jugadores/${ID_CREADOR}`)}
          className="flex items-center gap-3 py-4 border-b border-ink/10 text-left cursor-pointer"
        >
          <span className="w-11 h-11 rounded-full bg-[#154139] flex items-center justify-center flex-shrink-0">
            <Logo size={26} />
          </span>
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="font-semibold">Eduardo</span>
            <span className="text-xs text-muted">{t("quienesSomos.creadorRol")}</span>
          </span>
          <span className="text-sm font-bold px-3 py-1.5 rounded-[6px] bg-accent text-accent-ink flex-shrink-0">
            {t("quienesSomos.invitameBoton")}
          </span>
        </button>
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
