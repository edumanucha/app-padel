"use client";

import InfoEstadistica from "@/components/InfoEstadistica";
import { useLocale } from "@/i18n/LocaleContext";

// "El partido punto a punto" (D-29, 2026-10-08): la diferencia acumulada de
// puntos (tu pareja - rival) después de cada punto, dibujada a mano en SVG
// (sin librería de gráficos). Cada punto tuyo sube la línea y cada punto del
// rival la baja. Rayitas finas = fin de cada game; líneas marcadas = fin de
// cada set, con el set y su resultado arriba.
// Va en el cartel verde tablero (#154139), igual que el resultado, así que
// los colores son fijos y se ve igual en modo claro y oscuro.
// `grafico` sale de analizarPartido() (lib/estadisticasAvanzadas.js).

const ANCHO = 340;
const ALTO = 168;
const ARRIBA = 22; // lugar para las etiquetas de los sets
const ABAJO = 8;

const VERDE_CLARO = "#8fb6ae";
const TINTA = "#eaf4f0";
const AMARILLO = "#f2c53d";

export default function GraficoPuntoAPunto({ grafico }) {
  const { t } = useLocale();
  const { difs, finesDeGame, sets, maxVentaja, maxDesventaja } = grafico;
  const n = difs.length - 1;
  if (n < 2) return null;

  // Escala vertical: de la peor desventaja a la mayor ventaja (con un
  // mínimo de ±3 para que un partido parejo no se vea como un serrucho).
  const tope = Math.max(maxVentaja, 3);
  const piso = Math.min(maxDesventaja, -3);
  const x = (i) => (i / n) * ANCHO;
  const y = (d) => ARRIBA + ((tope - d) / (tope - piso)) * (ALTO - ARRIBA - ABAJO);
  const y0 = y(0);

  const linea = difs.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d).toFixed(1)}`).join("");
  const area = `${linea}L${ANCHO},${y0.toFixed(1)}L0,${y0.toFixed(1)}Z`;
  const finesDeSet = new Set(sets.filter((s) => !s.abierto).map((s) => s.hasta));
  const ultimo = difs[n];

  return (
    <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 pt-4 pb-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae] flex items-center gap-1">
          {t("avanzadas.graficoTitulo")}
          <InfoEstadistica texto={t("avanzadas.graficoInfo")} color="text-[#8fb6ae]" />
        </span>
        <span className="font-numero font-bold text-sm tabular-nums">
          {ultimo > 0 ? `+${ultimo}` : ultimo}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full h-auto block"
        role="img"
        aria-label={t("avanzadas.graficoAria", { ventaja: maxVentaja, rival: -maxDesventaja })}
      >
        <defs>
          <clipPath id="grafico-arriba">
            <rect x="0" y="0" width={ANCHO} height={y0} />
          </clipPath>
          <clipPath id="grafico-abajo">
            <rect x="0" y={y0} width={ANCHO} height={ALTO - y0} />
          </clipPath>
        </defs>

        {/* Un set sí, otro no, con un fondo apenas más claro. */}
        {sets.map((s, i) =>
          i % 2 === 1 ? (
            <rect key={`fondo-${i}`} x={x(s.desde)} y={ARRIBA - 4} width={x(s.hasta) - x(s.desde)} height={ALTO - ARRIBA + 4} fill={TINTA} opacity="0.04" />
          ) : null
        )}

        {/* Fin de cada game (fino) y de cada set (marcado). */}
        {finesDeGame
          .filter((i) => i < n && !finesDeSet.has(i))
          .map((i) => (
            <line key={`g-${i}`} x1={x(i)} x2={x(i)} y1={ARRIBA} y2={ALTO - ABAJO} stroke={TINTA} strokeOpacity="0.1" strokeWidth="0.75" />
          ))}
        {[...finesDeSet]
          .filter((i) => i < n)
          .map((i) => (
            <line key={`s-${i}`} x1={x(i)} x2={x(i)} y1={ARRIBA - 6} y2={ALTO} stroke={TINTA} strokeOpacity="0.4" strokeWidth="1" />
          ))}

        {/* Etiqueta de cada set arriba de su tramo. */}
        {sets.map((s, i) => {
          const ancho = x(s.hasta) - x(s.desde);
          const nombre = s.superTiebreak ? t("avanzadas.superTiebreak") : t("avanzadas.setCorto", { n: i + 1 });
          const largo = ancho > 70;
          return (
            <text
              key={`et-${i}`}
              x={x(s.desde) + ancho / 2}
              y="10"
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              letterSpacing="0.08em"
              fill={VERDE_CLARO}
             
            >
              {(largo ? `${nombre} · ${s.mios}-${s.rival}` : `${s.mios}-${s.rival}`).toUpperCase()}
            </text>
          );
        })}

        {/* Línea del cero: a partir de acá, arriba ganás vos y abajo el rival. */}
        <line x1="0" x2={ANCHO} y1={y0} y2={y0} stroke={VERDE_CLARO} strokeOpacity="0.7" strokeWidth="1" strokeDasharray="3 3" />
        <text x="3" y={y0 - 4} fontSize="8" fontWeight="700" letterSpacing="0.1em" fill={VERDE_CLARO}>
          {t("avanzadas.graficoVos").toUpperCase()}
        </text>
        <text x="3" y={y0 + 11} fontSize="8" fontWeight="700" letterSpacing="0.1em" fill={VERDE_CLARO}>
          {t("avanzadas.graficoRival").toUpperCase()}
        </text>

        <path d={area} fill={AMARILLO} fillOpacity="0.26" clipPath="url(#grafico-arriba)" />
        <path d={area} fill={TINTA} fillOpacity="0.12" clipPath="url(#grafico-abajo)" />
        <path d={linea} fill="none" stroke={AMARILLO} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(n)} cy={y(ultimo)} r="3.5" fill={AMARILLO} stroke="#154139" strokeWidth="1.5" />
      </svg>

      <div className="grid grid-cols-2 border-t border-[#eaf4f0]/15 pt-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-numero font-bold text-2xl leading-none tabular-nums">+{maxVentaja}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8fb6ae] flex items-center gap-1">
            {t("avanzadas.mayorVentaja")}
            <InfoEstadistica texto={t("avanzadas.mayorVentajaInfo")} color="text-[#8fb6ae]" />
          </span>
        </div>
        <div className="flex flex-col gap-0.5 pl-3 border-l border-[#eaf4f0]/15">
          <span className="font-numero font-bold text-2xl leading-none tabular-nums">+{-maxDesventaja}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8fb6ae]">{t("avanzadas.mayorVentajaRival")}</span>
        </div>
      </div>
    </div>
  );
}
