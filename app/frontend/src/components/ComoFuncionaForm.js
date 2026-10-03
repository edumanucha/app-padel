"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleContext";

import { IconoPersona, IconoCalendario, IconoPelota, IconoTrofeo, IconoMensaje, IconoDuo, IconoPin, IconoBilletera, IconoBandera } from "@/components/Icons";
// Recorrido honesto de funciones reales de la app (2026-09-10, a pedido
// del usuario, con relevamiento completo de historias-usuario-mvp.md +
// todas las rutas reales -- la primera versión se había quedado corta).
// Se separan las funciones YA construidas de las que todavía están en
// camino, para no vender algo que todavía no está (mismo criterio que ya
// usa el propio menú "Ver todo" con sus badges "Próximamente").
const BLOQUES = [
  { Icono: IconoPersona, clave: "cuenta" },
  { Icono: IconoCalendario, clave: "partidos" },
  { Icono: IconoPelota, clave: "marcadorcito" },
  { Icono: IconoTrofeo, clave: "ranking" },
  { Icono: IconoMensaje, clave: "comunidad" },
  { Icono: IconoDuo, clave: "matchmaking" },
  { Icono: IconoPin, clave: "canchas" },
  { Icono: IconoBilletera, clave: "gastos" },
  { Icono: IconoBandera, clave: "apelaciones" },
];

const PROXIMAMENTE_CLAVES = ["proximamente1", "proximamente2"];

export default function ComoFuncionaForm() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="w-full max-w-md text-ink flex flex-col gap-5">
      {/* Rediseño Cartel (2026-10-01): sin tarjeta contenedora ni cajas
          iguales -- cada función es un bloque numerado separado por líneas,
          con el título en la tipografía de cartel. */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("comoFunciona.titulo")}</h1>
        <button
          onClick={() => router.push("/menu")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("comoFunciona.volver")}
        </button>
      </div>

      <p className="text-[15px] text-muted leading-relaxed -mt-1">{t("comoFunciona.subtitulo")}</p>

      <div className="flex flex-col border-t-2 border-ink">
        {BLOQUES.map((b, i) => (
          <div key={b.clave} className="flex gap-3 py-4 border-b border-ink/10">
            <span className="font-numero font-bold text-[1.6rem] leading-none text-muted w-8 flex-shrink-0 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-titulo font-extrabold uppercase text-xl leading-none flex items-center gap-2">
                <b.Icono className="ico" aria-hidden />
                {t(`comoFunciona.${b.clave}Titulo`)}
              </span>
              <p className="text-sm text-muted leading-relaxed">{t(`comoFunciona.${b.clave}Texto`)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-2">{t("home.seViene")}</span>
        <div className="flex flex-col border-t border-ink/10">
          {PROXIMAMENTE_CLAVES.map((clave) => (
            <span key={clave} className="text-sm py-3 border-b border-ink/10 text-muted">
              {t(`comoFunciona.${clave}`)} · {t("home.proximamente")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
