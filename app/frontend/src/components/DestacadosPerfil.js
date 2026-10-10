"use client";

import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/config";

// Destacados del perfil, opción C "Cara a cara" (2026-10-02, elegida por el
// usuario entre 3 maquetas): una frase de cómo venís en el cartel verde,
// y después las personas primero -- tu mejor dupla, tu cuenta pendiente
// (la "cancha" salió en D-30). Los datos los calcula lib/destacadosPerfil.js.
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
      {/* D-33 (2026-10-09, opción A): la tarjeta pasa a amarilla para que
          no se pierda con la tarjeta verde del jugador de arriba ("exceso de
          verde"). Colores fijos: el amarillo es el mismo en modo claro y
          oscuro. Ganados en verde tablero, perdidos en rojo. */}
      <div className="rounded-[6px] bg-[#f2c53d] text-[#14261f] px-4 py-4 flex flex-col gap-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#5c4a12]">{t("destacados.comoVenis")}</span>
        <span className="font-titulo font-extrabold uppercase text-[1.6rem] leading-none text-balance">{frase}</span>
        <div className="flex items-end justify-between gap-3 border-t border-[#14261f]/20 pt-3">
          <div className="flex flex-col gap-1">
            <span className="font-numero font-bold text-[3.4rem] leading-[0.9]">{d.porcentaje}%</span>
            <span className="text-xs text-[#4a3d10]">{t("destacados.ganadosDe", { g: d.ganados, n: d.jugados })}</span>
          </div>
          <div className="flex gap-1.5" aria-label={t("destacados.ultimosAria", { g: d.ultimos5Ganados, n: d.forma.length })}>
            {d.forma.map((gane, i) => (
              <span
                key={i}
                className={`w-6 h-6 rounded-[4px] grid place-items-center font-numero font-bold text-[11px] ${
                  gane ? "bg-[#154139] text-[#f2c53d]" : "bg-[#d94b4b] text-white"
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
