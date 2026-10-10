"use client";

import ConPelota from "@/components/ConPelota";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS, CONSEJOS, FUENTES, fuenteDe } from "@/lib/consejos";
import { useLocale } from "@/i18n/LocaleContext";

// "saque-resto" -> "saqueResto" (clave del texto traducido)
export function claveCategoria(c) {
  return c === "saque-resto" ? "saqueResto" : c;
}

// Pantalla "Consejos" (2026-10-03, maqueta aprobada): todos los consejos con
// filtro por categoría y, al final, de qué obras salen. Los textos están en
// español en los tres idiomas.
export default function ConsejosForm() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [categoria, setCategoria] = useState("todas");

  const lista = categoria === "todas" ? CONSEJOS : CONSEJOS.filter((c) => c.c === categoria);
  const categoriasConConsejos = CATEGORIAS.filter((c) => CONSEJOS.some((x) => x.c === c));

  return (
    <div className="w-full max-w-md flex flex-col gap-4 text-ink">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{t("consejos.titulo")}</ConPelota></h1>
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("consejos.volver")}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("consejos.titulo")}>
        {["todas", ...categoriasConConsejos].map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={categoria === id}
            onClick={() => setCategoria(id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-[6px] border cursor-pointer ${
              categoria === id ? "bg-ink text-bg border-ink" : "border-ink/15"
            }`}
          >
            {id === "todas" ? t("consejos.todos") : t(`consejos.cat.${claveCategoria(id)}`)}
          </button>
        ))}
      </div>

      {locale !== "es" && <p className="text-xs text-muted">{t("consejos.soloEspanol")}</p>}

      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("consejos.cantidad", { n: lista.length })}</span>

      <div className="flex flex-col border-t border-ink/10">
        {lista.map((c) => {
          const f = fuenteDe(c);
          return (
            <div key={c.id} className="flex flex-col gap-1 py-3 border-b border-ink/10">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{t(`consejos.cat.${claveCategoria(c.c)}`)}</span>
              <p className="text-[15px] leading-snug font-medium">{c.t}</p>
              <span className="text-[11.5px] text-muted">
                {f.nombre} · {t("consejos.pagina", { n: c.p })}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col mt-2">
        <h2 className="font-titulo text-2xl font-black uppercase leading-none pb-1.5 border-b-2 border-ink">{t("consejos.fuentesTitulo")}</h2>
        <div className="flex flex-col py-3 border-b border-ink/10 gap-0.5">
          <span className="font-semibold">PadelStar · {t("consejos.guiasGratis")}</span>
          <span className="text-xs text-muted">{t("consejos.guiasDesc")}</span>
          <a href={FUENTES.g1.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold underline mt-1">
            {t("consejos.verGuias")} ↗
          </a>
        </div>
        <div className="flex flex-col py-3 border-b border-ink/10 gap-0.5">
          <span className="font-semibold">{FUENTES.libro.nombre}</span>
          <span className="text-xs text-muted">{FUENTES.libro.autores}</span>
        </div>
        <p className="text-xs text-muted pt-3">{t("consejos.derechos")}</p>
      </div>
    </div>
  );
}
