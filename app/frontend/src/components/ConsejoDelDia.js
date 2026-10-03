"use client";

import { useRouter } from "next/navigation";
import { consejoDelDia, fuenteDe } from "@/lib/consejos";
import { useLocale } from "@/i18n/LocaleContext";
import { claveCategoria } from "@/components/ConsejosForm";

// Tarjeta "Consejo del día" del Inicio (2026-10-03, maqueta aprobada): reemplaza
// al "Tip de pádel" que mostraba el título de un blog externo. Un consejo por
// día, escrito con palabras propias a partir de guías y un libro de pádel
// (ver lib/consejos.js). Al tocarla abre la pantalla con todos.
export default function ConsejoDelDia() {
  const router = useRouter();
  const { t } = useLocale();
  const c = consejoDelDia();
  const fuente = fuenteDe(c);

  return (
    <button
      type="button"
      onClick={() => router.push("/consejos")}
      className="w-full text-left rounded-[8px] bg-[#154139] text-[#eaf4f0] p-4 flex flex-col gap-2 border-2 border-accent cursor-pointer"
    >
      <span className="self-start text-[10px] font-bold uppercase tracking-[0.1em] bg-accent text-accent-ink px-1.5 py-0.5 rounded-[4px]">
        {t("consejos.delDia")} · {t(`consejos.cat.${claveCategoria(c.c)}`)}
      </span>
      <span className="text-[1.05rem] leading-snug font-medium">{c.t}</span>
      <span className="text-[11.5px] text-[#8fb6ae]">{t("consejos.basadoEn", { fuente: fuente.nombre })}</span>
      <span className="text-[13px] font-bold text-accent">{t("consejos.verTodos")} →</span>
    </button>
  );
}
