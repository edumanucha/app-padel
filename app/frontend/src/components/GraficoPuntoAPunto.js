"use client";

import InfoEstadistica from "@/components/InfoEstadistica";
import { useLocale } from "@/i18n/LocaleContext";

// "Los games del partido" (D-30, 2026-10-09, a pedido del usuario: el gráfico
// de línea "no se entiende"; eligió la opción C de las maquetas). Un
// cuadradito por game, en el orden en que se jugaron y separados por set:
// verde = lo ganaste vos, rojo = lo ganó el rival; con borde amarillo los
// tie-breaks. Abajo, tu mejor racha de games seguidos y la del rival.
// (El archivo conserva el nombre de cuando era el gráfico punto a punto.)
// Va en el cartel verde tablero (#154139), igual que el resultado, así que
// los colores son fijos y se ve igual en modo claro y oscuro.
// `grafico` sale de analizarPartido() (lib/estadisticasAvanzadas.js).

const VERDE_CLARO = "#8fb6ae";
const AMARILLO = "#f2c53d";

function mejorRacha(secuencia, ganeYo) {
  let mejor = 0;
  let actual = 0;
  for (const g of secuencia) {
    actual = g.gane === ganeYo ? actual + 1 : 0;
    mejor = Math.max(mejor, actual);
  }
  return mejor;
}

export default function GraficoPuntoAPunto({ grafico }) {
  const { t } = useLocale();
  const { sets, secuencia } = grafico;
  if (!secuencia || secuencia.length < 2) return null;

  const porSet = sets
    .map((s, i) => ({ ...s, n: i + 1, games: secuencia.filter((g) => g.set === i + 1) }))
    .filter((s) => s.games.length > 0);
  const tuRacha = mejorRacha(secuencia, true);
  const suRacha = mejorRacha(secuencia, false);
  const hayTiebreak = secuencia.some((g) => g.tiebreak);

  return (
    <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 pt-4 pb-3 flex flex-col gap-3">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] flex items-center gap-1" style={{ color: VERDE_CLARO }}>
        {t("avanzadas.graficoTitulo")}
        <InfoEstadistica texto={t("avanzadas.graficoInfo")} color="text-[#8fb6ae]" />
      </span>

      <div className="flex flex-col gap-3" role="img" aria-label={t("avanzadas.graficoAria", { n: secuencia.length })}>
        {porSet.map((s) => (
          <div key={s.n} className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: "#c4dad3" }}>
              {s.superTiebreak ? t("avanzadas.superTiebreak") : t("avanzadas.setCorto", { n: s.n })} · {s.mios}-{s.rival}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {s.games.map((g, i) => (
                <span
                  key={i}
                  className="w-7 h-7 rounded-[5px]"
                  style={{
                    background: g.gane ? "#22c55e" : "#ef4444",
                    outline: g.tiebreak ? `2px solid ${AMARILLO}` : "none",
                    outlineOffset: g.tiebreak ? "1px" : "0",
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "#c4dad3" }}>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] bg-[#22c55e]" />
          {t("avanzadas.graficoGaneGame")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] bg-[#ef4444]" />
          {t("avanzadas.graficoGanoRival")}
        </span>
        {hayTiebreak && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-transparent" style={{ outline: `2px solid ${AMARILLO}` }} />
            {t("avanzadas.graficoTiebreak")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 border-t border-[#eaf4f0]/15 pt-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-numero font-bold text-2xl leading-none tabular-nums" style={{ color: AMARILLO }}>{tuRacha}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] flex items-center gap-1" style={{ color: VERDE_CLARO }}>
            {t("avanzadas.graficoTuRacha")}
            <InfoEstadistica texto={t("avanzadas.graficoRachaInfo")} color="text-[#8fb6ae]" />
          </span>
        </div>
        <div className="flex flex-col gap-0.5 pl-3 border-l border-[#eaf4f0]/15">
          <span className="font-numero font-bold text-2xl leading-none tabular-nums">{suRacha}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: VERDE_CLARO }}>{t("avanzadas.graficoSuRacha")}</span>
        </div>
      </div>
    </div>
  );
}
