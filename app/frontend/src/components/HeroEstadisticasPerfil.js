"use client";

import { IconoChevron } from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";
import { textoRacha } from "@/lib/estadisticasAvanzadas";

// "Tablero de estadio" del perfil (D-30, 2026-10-09, a pedido del usuario,
// opción A de las maquetas): el resumen de las estadísticas pasa a ser un
// cartel verde siempre visible, con el % de partidos ganados en grande y
// amarillo, la racha, ganados / perdidos / mejor racha y los quiebres. El
// resto (lo que antes era el acordeón) se abre con "Ver todas las
// estadísticas". Colores fijos (cartel #154139), igual que el resultado y el
// gráfico punto a punto del partido, así se ve igual en modo claro y oscuro.

const VERDE_CLARO = "#8fb6ae";
const AMARILLO = "#f2c53d";

function Barra({ etiqueta, valor, total, color }) {
  const pct = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span style={{ color: VERDE_CLARO }}>{etiqueta}</span>
        <span className="font-numero font-bold tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-[2px] bg-[#2c5a4f] overflow-hidden">
        <div className="h-full rounded-[2px]" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function HeroEstadisticasPerfil({ ganados, perdidos, mejorRacha, racha, quiebres, abierto, onToggle }) {
  const { t } = useLocale();
  const total = ganados + perdidos;
  if (total === 0) return null;
  const pct = Math.round((ganados / total) * 100);
  const enRacha = racha?.gane && racha.n >= 2;

  return (
    <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 pt-4 pb-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: VERDE_CLARO }}>
          {t("estadisticas.heroTitulo")}
        </span>
        {enRacha && (
          <span className="bg-accent text-accent-ink rounded-[5px] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em]">
            {textoRacha(t, true, racha.n)}
          </span>
        )}
      </div>

      <div className="flex items-end gap-3">
        <span className="font-titulo font-black uppercase text-[4.2rem] leading-[0.85] tabular-nums" style={{ color: AMARILLO }}>
          {pct}%
        </span>
        <span className="text-sm leading-tight pb-1" style={{ color: "#c4dad3" }}>
          {t("estadisticas.heroGanados")}
        </span>
      </div>

      <div className="grid grid-cols-3 border-t border-[#2c5a4f] pt-3">
        <div className="flex flex-col">
          <span className="font-numero font-bold text-[1.7rem] leading-none tabular-nums">{ganados}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: VERDE_CLARO }}>{t("estadisticas.heroGanadosN")}</span>
        </div>
        <div className="flex flex-col pl-3 border-l border-[#2c5a4f]">
          <span className="font-numero font-bold text-[1.7rem] leading-none tabular-nums">{perdidos}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: VERDE_CLARO }}>{t("estadisticas.heroPerdidos")}</span>
        </div>
        <div className="flex flex-col pl-3 border-l border-[#2c5a4f]">
          <span className="font-numero font-bold text-[1.7rem] leading-none tabular-nums">{mejorRacha}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: VERDE_CLARO }}>{t("estadisticas.heroMejorRacha")}</span>
        </div>
      </div>

      {quiebres && (
        <div className="flex flex-col gap-2">
          <Barra etiqueta={t("estadisticas.quiebresConvertidos")} valor={quiebres.favor} total={quiebres.opFavor} color="#22c55e" />
          <Barra etiqueta={t("estadisticas.quiebresConcedidos")} valor={quiebres.contra} total={quiebres.opContra} color="#ef4444" />
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        className="self-start flex items-center gap-1.5 text-sm font-semibold underline cursor-pointer"
        style={{ color: AMARILLO }}
      >
        {abierto ? t("estadisticas.heroOcultar") : t("estadisticas.heroVerTodas")}
        <IconoChevron width={16} height={16} className={`transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}
