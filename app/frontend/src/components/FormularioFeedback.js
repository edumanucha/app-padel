"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

// Extraído de MenuCompletoForm.js (2026-09-10) para poder reusarlo también
// en la página de "Quiénes somos" -- misma tabla feedback_app (US "Espacio
// de comentarios", 2026-09-06), mismo comportamiento, solo el título es
// configurable para que encaje en el contexto de cada pantalla.
export default function FormularioFeedback({ titulo }) {
  const { t } = useLocale();
  const tituloFinal = titulo ?? t("feedback.tituloDefault");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleEnviar(e) {
    e.preventDefault();
    if (comentario.trim() === "") return;
    setEnviando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("feedback_app").insert({ jugador_id: user.id, comentario: comentario.trim() });

    setEnviando(false);
    setComentario("");
    setEnviado(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">{tituloFinal}</span>
      {enviado ? (
        <div className="bg-surface border-2 border-outline rounded-[14px] p-4 text-sm text-center">
          {t("feedback.gracias")}
        </div>
      ) : (
        <form
          onSubmit={handleEnviar}
          className="bg-surface shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-4 flex flex-col gap-2"
        >
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={t("feedback.placeholder")}
            rows={3}
            maxLength={1000}
            className="rounded-xl bg-bg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={enviando || comentario.trim() === ""}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 self-start inline-flex items-center gap-2"
          >
            {enviando && <PelotaLoader />}
            {t("feedback.enviarComentario")}
          </button>
        </form>
      )}
    </div>
  );
}
