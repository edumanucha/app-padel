"use client";

import { INTL_LOCALE } from "@/i18n/config";

// Tarjeta de un partido jugado en el perfil (D-30, 2026-10-09, a pedido del
// usuario: "el ver partidos no llama la atención", con el estilo de la
// tarjeta "Tu próximo partido" del Inicio): día en un bloque amarillo y el
// resto en un cartel verde -- cancha, resultado (G / P), contra quién jugaste
// en negrita, los sets en amarillo y los puntos de ranking. Colores fijos
// (cartel #154139), igual que el resto de los carteles verdes.
export default function TarjetaPartidoPerfil({ p, cruce, locale, t, onClick, delay = 0, etiqueta }) {
  const fecha = new Date(p.fechaHora);
  const idioma = INTL_LOCALE[locale] ?? "es-AR";
  const dia = fecha.toLocaleDateString(idioma, { day: "2-digit" });
  const mes = fecha.toLocaleDateString(idioma, { month: "short" }).replace(".", "");
  const rivales = cruce?.rivales?.length > 0 ? t("estadisticas.vsRivales", { rivales: cruce.rivales.join(t("estadisticas.yRival")) }) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="lista-item-entra w-full text-left flex gap-2 cursor-pointer"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="bg-accent text-accent-ink rounded-[8px] w-[54px] flex-shrink-0 flex flex-col items-center justify-center font-titulo font-black uppercase leading-none">
        <span className="text-[1.7rem] tabular-nums">{dia}</span>
        <span className="text-[11px] tracking-[0.08em] mt-1">{mes}</span>
      </span>

      <span className="flex-1 min-w-0 rounded-[8px] bg-[#154139] text-[#eaf4f0] px-3 py-2.5 flex flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#8fb6ae] truncate">
            {etiqueta ?? p.cancha}
          </span>
          <span
            className={`text-[11px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-[5px] flex-shrink-0 ${
              p.gane ? "bg-[#22c55e] text-[#06210f]" : "bg-[#ef4444] text-white"
            }`}
          >
            {p.gane ? t("home.ganaste") : t("home.perdiste")}
          </span>
        </span>

        {rivales && <span className="text-[1.02rem] font-extrabold leading-tight break-words">{rivales}</span>}

        <span className="flex items-center justify-between gap-2">
          <span className="font-titulo font-extrabold uppercase text-[1.15rem] leading-none text-accent break-words">
            {cruce?.sets || ""}
          </span>
          {p.puntosRankingGanados !== null && (
            <span className="bg-accent text-accent-ink rounded-[5px] px-1.5 py-0.5 text-[11px] font-bold flex-shrink-0">
              +{p.puntosRankingGanados} pts
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
