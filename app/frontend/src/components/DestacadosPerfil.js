"use client";

import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

// Destacados del perfil, opción C "Cara a cara" (2026-10-02, elegida por el
// usuario entre 3 maquetas): una frase de cómo venís en el cartel verde,
// y después las personas primero -- tu mejor dupla, tu cuenta pendiente
// y tu cancha. Los datos los calcula lib/destacadosPerfil.js.
export default function DestacadosPerfil({ destacados: d }) {
  const { t, locale } = useLocale();
  if (!d) return null;
  const fecha = (iso) => new Date(iso).toLocaleDateString(INTL_LOCALE[locale] ?? "es-AR", { day: "2-digit", month: "2-digit" });

  const frase =
    d.racha.n >= 2
      ? t(d.racha.gane ? "destacados.fraseGanaste" : "destacados.frasePerdiste", { n: d.racha.n })
      : t("destacados.fraseUltimos", { g: d.ultimos5Ganados, n: d.forma.length });

  const pendiente = d.cuentaPendiente;
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-4 flex flex-col gap-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">{t("destacados.comoVenis")}</span>
        <span className="font-titulo font-extrabold uppercase text-[1.6rem] leading-none text-balance">{frase}</span>
        <div className="flex items-end justify-between gap-3 border-t border-[#eaf4f0]/15 pt-3">
          <div className="flex flex-col gap-1">
            <span className="font-numero font-bold text-[3.4rem] leading-[0.9]">{d.porcentaje}%</span>
            <span className="text-xs text-[#c4dad3]">{t("destacados.ganadosDe", { g: d.ganados, n: d.jugados })}</span>
          </div>
          <div className="flex gap-1.5" aria-label={t("destacados.ultimosAria", { g: d.ultimos5Ganados, n: d.forma.length })}>
            {d.forma.map((gane, i) => (
              <span
                key={i}
                className={`w-6 h-6 rounded-[4px] grid place-items-center font-numero font-bold text-[11px] ${
                  gane ? "bg-accent text-accent-ink" : "border-[1.5px] border-[#eaf4f0]/25 text-[#eaf4f0]"
                }`}
              >
                {gane ? t("destacados.letraGano") : t("destacados.letraPerdio")}
              </span>
            ))}
          </div>
        </div>
      </div>

      {d.mejorDupla && (
        <Bloque titulo={t("destacados.mejorDupla")}>
          <Fila
            quien={d.mejorDupla.nombre}
            cuanto={t("destacados.deN", { g: d.mejorDupla.g, n: d.mejorDupla.pj })}
            color="text-[#16a34a]"
            extra={t("destacados.ultimoJuntos", { fecha: fecha(d.mejorDupla.ultimo.fechaHora) })}
          />
        </Bloque>
      )}

      {pendiente && (
        <Bloque titulo={t("destacados.cuentaPendiente")}>
          <Fila
            quien={pendiente.nombre}
            cuanto={t("destacados.deN", { g: pendiente.g, n: pendiente.pj })}
            color="text-[#dc2626]"
            extra={t(pendiente.ultimo.gane ? "destacados.ultimoGanaste" : "destacados.ultimoPerdiste", {
              sets: pendiente.ultimo.sets,
              fecha: fecha(pendiente.ultimo.fechaHora),
            })}
          />
        </Bloque>
      )}

      {d.cancha && (
        <Bloque titulo={t("destacados.tuCancha")}>
          <Fila
            quien={d.cancha.nombre}
            cuanto={t("destacados.deN", { g: d.cancha.g, n: d.cancha.pj })}
            extra={d.otraCancha ? t("destacados.enOtra", { cancha: d.otraCancha.nombre, g: d.otraCancha.g, n: d.otraCancha.pj }) : null}
          />
        </Bloque>
      )}
    </div>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div className="flex flex-col">
      <h3 className="font-titulo font-black uppercase text-2xl leading-none pb-1.5 border-b-2 border-ink">{titulo}</h3>
      {children}
    </div>
  );
}

function Fila({ quien, cuanto, color = "", extra }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-0.5 py-3 border-b border-ink/10">
      <span className="font-semibold text-[1.02rem] min-w-0 break-words">{quien}</span>
      <span className={`font-numero font-bold text-[1.05rem] text-right ${color}`}>{cuanto}</span>
      {extra && <span className="col-span-2 text-xs text-muted">{extra}</span>}
    </div>
  );
}
