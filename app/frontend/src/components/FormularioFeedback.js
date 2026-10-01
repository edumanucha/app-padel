"use client";

import { useState } from "react";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
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
    } = await usuarioRapido();

    await supabase.from("feedback_app").insert({ jugador_id: user.id, comentario: comentario.trim() });

    setEnviando(false);
    setComentario("");
    setEnviado(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{tituloFinal}</span>
      {enviado ? (
        <div className="border-y border-ink/10 py-3 text-sm">
          {t("feedback.gracias")}
        </div>
      ) : (
        <form
          onSubmit={handleEnviar}
          className="flex flex-col gap-2"
        >
          {/* Rediseño Cartel (2026-10-01): sin caja, campo con contorno fino. */}
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={t("feedback.placeholder")}
            rows={3}
            maxLength={1000}
            className="rounded-[6px] bg-transparent border border-ink/15 px-3 py-2 text-sm text-ink"
          />
          <button
            type="submit"
            disabled={enviando || comentario.trim() === ""}
            className="text-sm font-semibold px-4 py-2 rounded-[6px] border border-ink/15 text-ink cursor-pointer disabled:opacity-60 self-start inline-flex items-center gap-2"
          >
            {enviando && <PelotaLoader />}
            {t("feedback.enviarComentario")}
          </button>
        </form>
      )}
    </div>
  );
}
