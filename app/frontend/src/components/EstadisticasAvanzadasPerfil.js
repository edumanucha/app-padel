"use client";

import BarraEstadistica from "@/components/BarraEstadistica";
import InfoEstadistica from "@/components/InfoEstadistica";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/config";
import { textoRacha, porcentaje } from "@/lib/estadisticasAvanzadas";

// Estadísticas avanzadas del perfil (D-29, 2026-10-08), acumuladas sobre
// todos los partidos terminados: rachas de partidos, saque y presión (solo
// los partidos anotados punto por punto), por compañero, cuándo jugás mejor
// y partidos a 3 sets. Los datos los arma calcularAvanzadasPerfil()
// (lib/estadisticasAvanzadas.js). Mismo estilo que los destacados: título
// condensado con línea gruesa, filas con línea fina, números de tablero.

const etiquetaChica = "text-[10px] font-bold uppercase tracking-[0.1em] text-muted flex items-center gap-1";

function Titulo({ children, info }) {
  return (
    <h3 className="font-titulo font-black uppercase text-2xl leading-none pb-1.5 border-b-2 border-ink flex items-center gap-1.5">
      {children}
      {info && <InfoEstadistica texto={info} />}
    </h3>
  );
}

function Numero({ valor, etiqueta, info, detalle, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 py-3 min-w-0 ${className}`}>
      <span className="font-numero font-bold text-[2rem] leading-none tabular-nums">{valor}</span>
      <span className={etiquetaChica}>
        {etiqueta}
        {info && <InfoEstadistica texto={info} />}
      </span>
      {detalle && <span className="text-xs text-muted">{detalle}</span>}
    </div>
  );
}

export default function EstadisticasAvanzadasPerfil({ a }) {
  const { t, locale } = useLocale();
  if (!a) return null;
  const xDeY = (f) => t("avanzadas.xDeY", { g: f.g, n: f.n });
  const pct = (f) => `${porcentaje(f) ?? 0}%`;
  const nombreDia = (dia) =>
    new Date(2026, 0, 4 + dia).toLocaleDateString(INTL_LOCALE[locale] ?? "es-AR", { weekday: "long" });
  const tendencia = (delta) => {
    if (delta === null || delta === undefined) return null;
    if (delta === 0) return t("avanzadas.tendenciaIgual");
    return t(delta > 0 ? "avanzadas.tendenciaSube" : "avanzadas.tendenciaBaja", { n: Math.abs(delta) });
  };
  const colorTendencia = (delta) => (delta > 0 ? "text-[#16a34a]" : delta < 0 ? "text-[#dc2626]" : "text-muted");

  const r = a.rachas;
  const hayCuando = a.cuando.franjas.length + a.cuando.dias.length + a.cuando.canchas.length > 0;

  return (
    <div className="flex flex-col gap-5 pt-5">
      {/* Rachas de partidos (no de puntos). */}
      {r && (
        <div className="flex flex-col">
          <Titulo>{t("avanzadas.rachasTitulo")}</Titulo>
          <div className="flex flex-col gap-1 py-3 border-b border-ink/10">
            <span className={etiquetaChica}>
              {t("avanzadas.rachaActual")}
              <InfoEstadistica texto={t("avanzadas.rachaActualInfo")} />
            </span>
            <span className={`font-titulo font-extrabold uppercase text-[1.6rem] leading-none text-balance ${r.actual.gane && r.actual.n >= 2 ? "text-[#16a34a]" : ""}`}>
              {textoRacha(t, r.actual.gane, r.actual.n)}
            </span>
          </div>
          <div className="grid grid-cols-2 border-b border-ink/10">
            <Numero
              valor={r.mejorGanando}
              etiqueta={t("avanzadas.mejorRacha")}
              info={t("avanzadas.mejorRachaInfo")}
              className="pr-3"
            />
            <Numero
              valor={r.peorPerdiendo}
              etiqueta={t("avanzadas.peorRacha")}
              info={t("avanzadas.peorRachaInfo")}
              className="pl-3 border-l border-ink/15"
            />
          </div>
        </div>
      )}

      {/* Saque y presión: solo con partidos anotados punto por punto. */}
      {a.partidosConLog > 0 && (
        <div className="flex flex-col">
          <Titulo>{t("avanzadas.saquePerfilTitulo")}</Titulo>
          {a.presion.n > 0 && (
            <div className="flex flex-col gap-1 py-3 border-b border-ink/10">
              <span className="font-titulo font-extrabold uppercase text-[1.5rem] leading-none text-balance">
                {t("avanzadas.presionFrase", { p: porcentaje(a.presion) })}
              </span>
              <span className={etiquetaChica}>
                {t("avanzadas.presionPerfil")} · {xDeY(a.presion)}
                <InfoEstadistica texto={t("avanzadas.presionPerfilInfo")} />
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 border-b border-ink/10">
            <Numero
              valor={pct(a.saque.sacando)}
              etiqueta={t("avanzadas.saqueRetenidoPerfil")}
              info={t("avanzadas.saqueRetenidoPerfilInfo")}
              detalle={
                <>
                  {xDeY(a.saque.sacando)}
                  {a.saque.tendencia && (
                    <span className={`block ${colorTendencia(a.saque.tendencia.sacando)}`}>{tendencia(a.saque.tendencia.sacando)}</span>
                  )}
                </>
              }
              className="pr-3"
            />
            <Numero
              valor={pct(a.saque.restando)}
              etiqueta={t("avanzadas.quiebresPerfil")}
              info={t("avanzadas.quiebresPerfilInfo")}
              detalle={
                <>
                  {xDeY(a.saque.restando)}
                  {a.saque.tendencia && (
                    <span className={`block ${colorTendencia(a.saque.tendencia.restando)}`}>{tendencia(a.saque.tendencia.restando)}</span>
                  )}
                </>
              }
              className="pl-3 border-l border-ink/15"
            />
          </div>
          <div className="grid grid-cols-2 border-b border-ink/10">
            <Numero
              valor={a.remontadas.g}
              etiqueta={t("avanzadas.remontadas")}
              info={t("avanzadas.remontadasPerfilInfo")}
              detalle={t("avanzadas.deNAbajo", { n: a.remontadas.n })}
              className="pr-3"
            />
            <Numero
              valor={a.teDieronVuelta.g}
              etiqueta={t("avanzadas.teDieronVuelta")}
              info={t("avanzadas.teDieronVueltaPerfilInfo")}
              detalle={t("avanzadas.deNArriba", { n: a.teDieronVuelta.n })}
              className="pl-3 border-l border-ink/15"
            />
          </div>
          <span className="text-xs text-muted pt-2">{t("avanzadas.soloConLog", { n: a.partidosConLog })}</span>
        </div>
      )}

      {/* Por compañero (2+ partidos anotados punto por punto juntos). */}
      {a.companeros.length > 0 && (
        <div className="flex flex-col">
          <Titulo info={t("avanzadas.companerosInfo")}>{t("avanzadas.companerosTitulo")}</Titulo>
          {a.companeros.map((c) => (
            <div key={c.nombre + c.pj} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 py-3 border-b border-ink/10">
              <span className="flex flex-col min-w-0">
                <span className="font-semibold text-[1.02rem] break-words">{c.nombre}</span>
                <span className="text-xs text-muted">{t("avanzadas.companeroPartidos", { g: c.g, n: c.pj })}</span>
              </span>
              <span className="flex flex-col items-end">
                <span className="font-numero font-bold text-[1.05rem]">{c.sacando.n > 0 ? pct(c.sacando) : "-"}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{t("avanzadas.columnaSaque")}</span>
              </span>
              <span className="flex flex-col items-end">
                <span className="font-numero font-bold text-[1.05rem]">{c.presion.n > 0 ? pct(c.presion) : "-"}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{t("avanzadas.columnaPresion")}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Cuándo jugás mejor: % de partidos ganados por franja, día y cancha. */}
      {hayCuando && (
        <div className="flex flex-col">
          <Titulo info={t("avanzadas.cuandoInfo")}>{t("avanzadas.cuandoTitulo")}</Titulo>
          {[
            { titulo: t("avanzadas.porHorario"), filas: a.cuando.franjas.map((f) => ({ ...f, nombre: t(`avanzadas.franja_${f.clave}`) })) },
            { titulo: t("avanzadas.porDia"), filas: a.cuando.dias.map((f) => ({ ...f, nombre: nombreDia(f.dia) })) },
            { titulo: t("avanzadas.porCancha"), filas: a.cuando.canchas },
          ]
            .filter((g) => g.filas.length > 0)
            .map((g) => (
              <div key={g.titulo} className="flex flex-col pt-3">
                <span className={etiquetaChica}>{g.titulo}</span>
                <div className="flex flex-col [&>*]:py-2.5 [&>*]:border-b [&>*]:border-ink/10">
                  {g.filas.map((f) => (
                    <BarraEstadistica
                      key={f.nombre}
                      etiqueta={<span className="inline-block first-letter:uppercase">{f.nombre}</span>}
                      valor={f.g}
                      total={f.pj}
                      texto={t("avanzadas.pctDe", { p: Math.round((f.g / f.pj) * 100), g: f.g, n: f.pj })}
                      variante="bien"
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {a.tresSets.n > 0 && (
        <div className="grid grid-cols-2 border-y border-ink/10">
          <Numero
            valor={xDeY(a.tresSets)}
            etiqueta={t("avanzadas.tresSets")}
            info={t("avanzadas.tresSetsInfo")}
            className="pr-3 col-span-2"
          />
        </div>
      )}
    </div>
  );
}
