"use client";

// Consejos personalizados (D-46, 2026-10-10; maqueta
// docs/maquetas/maquetas-consejos.html). Cuatro lugares:
//   A · ConsejosDelPartido: "Lo que te dejó este partido" (detalle y
//       estadísticas de un partido terminado).
//   B · TuJuego: sección del perfil propio.
//   C · ConsejoAntesDeJugar: detalle de un partido que se viene.
//   Home · ConsejoHome.
// La lógica vive en lib/consejosPersonalizados.js; acá solo se dibuja.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLocale } from "@/i18n/LocaleContext";
import {
  prepararDatos,
  consejosDePartido,
  tuJuego,
  consejoHome,
  consejoAntesDeJugar,
  nivelConfianza,
  PARTIDOS_PARA_COMPARAR,
  PARTIDOS_PARA_PATRONES,
} from "@/lib/consejosPersonalizados";

// Un solo pedido por minuto aunque haya varias secciones en pantalla.
let cache = null;
let cacheTs = 0;
let promesa = null;

function cargarDatos() {
  if (cache && Date.now() - cacheTs < 60000) return Promise.resolve(cache);
  promesa ??= supabase
    .rpc("datos_consejos")
    .then(({ data, error }) => {
      promesa = null;
      if (error || !data) return null;
      cache = prepararDatos(data);
      cacheTs = Date.now();
      return cache;
    })
    .catch(() => {
      promesa = null;
      return null;
    });
  return promesa;
}

function guardarValoracion(clave, util) {
  if (cache) cache = { ...cache, valoraciones: { ...cache.valoraciones, [clave]: util } };
  return supabase.rpc("valorar_consejo", { p_clave: clave, p_util: util });
}

function useDatosConsejos() {
  const [datos, setDatos] = useState(cache);
  useEffect(() => {
    let vivo = true;
    cargarDatos().then((d) => vivo && setDatos(d));
    return () => {
      vivo = false;
    };
  }, []);
  return datos;
}

const COLOR_TIPO = {
  bien: "text-[#1f7a4c]",
  mejorar: "text-[#a8551d]",
  dato: "text-[#154139]",
  consejo: "text-[#154139]",
};

function Fila({ tipo, etiqueta, children, dato }) {
  return (
    <div className="flex gap-2.5 py-2.5 border-b border-ink/10 last:border-b-0">
      <span className={`font-titulo font-black uppercase text-[13px] tracking-[0.06em] min-w-[64px] pt-0.5 ${COLOR_TIPO[tipo]}`}>{etiqueta}</span>
      <div className="min-w-0">
        <div className="text-sm leading-snug">{children}</div>
        {dato && <div className="text-xs text-muted mt-0.5">{dato}</div>}
      </div>
    </div>
  );
}

function Valorar({ clave, datos }) {
  const { t } = useLocale();
  const [valor, setValor] = useState(datos?.valoraciones?.[clave]);
  async function valorar(util) {
    setValor(util);
    await guardarValoracion(clave, util);
  }
  if (valor !== undefined) return <p className="text-xs text-muted mt-2">{t("tuJuego.gracias")}</p>;
  return (
    <div className="flex gap-2 mt-2">
      {[
        [true, "tuJuego.meSirvio"],
        [false, "tuJuego.noMeSirve"],
      ].map(([util, k]) => (
        <button
          key={k}
          type="button"
          onClick={() => valorar(util)}
          className="rounded-full border border-ink/25 px-3 py-1 text-[12.5px] font-semibold cursor-pointer"
        >
          {t(k)}
        </button>
      ))}
    </div>
  );
}

function BarraConfianza({ nivel, oscuro = true }) {
  const { t } = useLocale();
  const derecha =
    nivel.n < PARTIDOS_PARA_COMPARAR
      ? t("tuJuego.faltanComparar")
      : nivel.faltanPatrones > 0
        ? t("tuJuego.faltanPatrones", { n: nivel.faltanPatrones })
        : t("tuJuego.nPartidos", { n: nivel.n });
  return (
    <div>
      <div className="flex gap-1 mt-1.5" aria-hidden>
        {Array.from({ length: PARTIDOS_PARA_PATRONES }, (_, i) => (
          <i key={i} className={`flex-1 h-1.5 rounded-sm ${i < nivel.pasos ? "bg-accent" : oscuro ? "bg-[#eaf4f0]/20" : "bg-ink/10"}`} />
        ))}
      </div>
      <div className={`flex justify-between gap-2 text-[12.5px] mt-1.5 ${oscuro ? "text-[#8fb6ae]" : "text-muted"}`}>
        <span>
          <b className={oscuro ? "text-[#eaf4f0]" : "text-ink"}>
            {nivel.n < PARTIDOS_PARA_PATRONES ? t("tuJuego.nDeDiez", { n: nivel.n }) : t(`tuJuego.nivel.${nivel.clave}`)}
          </b>
        </span>
        <span className="text-right">{derecha}</span>
      </div>
    </div>
  );
}

// A ------------------------------------------------------------------------
export function ConsejosDelPartido({ partidoId }) {
  const { t } = useLocale();
  const datos = useDatosConsejos();
  const c = consejosDePartido(datos, partidoId);
  if (!c || (c.bien.length === 0 && c.mejorar.length === 0)) return null;
  const dato = (x) =>
    x?.vars?.ref != null && x?.vars?.hoy != null
      ? t(c.propio ? "tuJuego.tuPromedio" : "tuJuego.mediaPadelito", { ref: x.vars.ref, hoy: x.vars.hoy })
      : null;
  // Si ganaron, primero lo que salió bien; si perdieron, primero lo que costó.
  const grupos = c.gane
    ? [
        ["bien", c.bien],
        ["mejorar", c.mejorar],
      ]
    : [
        ["mejorar", c.mejorar],
        ["bien", c.bien],
      ];
  return (
    <section className="flex flex-col">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("tuJuego.loQueTeDejo")}</span>
      <span className="font-titulo font-black uppercase text-[1.6rem] leading-none mt-1 mb-1">
        {t(c.gane ? "tuJuego.porQueGanaron" : "tuJuego.porQuePerdieron")}
      </span>
      {grupos.map(([tipo, lista]) =>
        lista.map((x) => (
          <Fila key={tipo + x.clave} tipo={tipo} etiqueta={t(`tuJuego.${tipo}`)} dato={dato(x)}>
            {t(`tuJuego.hecho.${x.texto}`, x.vars)}
          </Fila>
        ))
      )}
      {c.datos.map((x) => (
        <Fila key={x.clave} tipo="dato" etiqueta={t("tuJuego.dato")}>
          {t(`tuJuego.hecho.${x.texto}`, x.vars)}
        </Fila>
      ))}
      {c.tips.map((tip) => (
        <div key={tip.clave}>
          <Fila tipo="consejo" etiqueta={t("tuJuego.consejo")}>
            {t(`tuJuego.tip.${tip.texto}`)}
          </Fila>
          <Valorar clave={tip.clave} datos={datos} />
        </div>
      ))}
      {c.nivel.n < PARTIDOS_PARA_PATRONES && (
        <div className="rounded-[8px] bg-[#154139] text-[#eaf4f0] px-3.5 py-3 mt-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">{t("tuJuego.barraTitulo")}</span>
          <BarraConfianza nivel={c.nivel} />
        </div>
      )}
    </section>
  );
}

// B ------------------------------------------------------------------------
function Medidor({ m }) {
  const { t } = useLocale();
  return (
    <div className="py-2.5 border-b border-ink/10">
      <div className="text-sm">{t(`tuJuego.medidor.${m.clave}`)}</div>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="relative flex-1 h-[5px] rounded bg-ink/10">
          <i className="absolute inset-y-0 left-0 rounded bg-[#154139]" style={{ width: `${Math.min(100, m.valor)}%` }} />
          <em className="absolute -top-[3px] w-[2px] h-[11px] bg-ink/50" style={{ left: `${Math.min(100, m.media)}%` }} />
        </div>
        <span className="font-numero font-bold text-[13px] min-w-[38px] text-right">{m.valor}%</span>
      </div>
    </div>
  );
}

const TIPO_PATRON = { bien: "tuJuego.dato", mejorar: "tuJuego.ojo", dato: "tuJuego.dato" };

export function TuJuego() {
  const { t } = useLocale();
  const datos = useDatosConsejos();
  const j = tuJuego(datos);
  if (!j) return null;
  return (
    <section className="flex flex-col">
      <div className="rounded-[8px] bg-[#154139] text-[#eaf4f0] px-3.5 py-3.5">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">{t("tuJuego.titulo")}</span>
        <div className="font-titulo font-black uppercase leading-[0.92] text-[1.9rem] mt-1">
          {j.titular === "enCamino" ? t(`tuJuego.nivel.${j.nivel.clave}`) : t(`tuJuego.titular.${j.titular}`)}
        </div>
        <div className="mt-2.5">
          <BarraConfianza nivel={j.nivel} />
        </div>
      </div>

      {j.medidores.length > 0 && (
        <div className="mt-4">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("tuJuego.comoVenis")}</span>
          {j.medidores.map((m) => (
            <Medidor key={m.clave} m={m} />
          ))}
        </div>
      )}

      <div className="mt-4">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("tuJuego.patrones")}</span>
        {j.nivel.n < PARTIDOS_PARA_PATRONES ? (
          <div className="opacity-50">
            <Fila tipo="consejo" etiqueta={t("tuJuego.pronto")} dato={t("tuJuego.seDesbloquea")}>
              {t("tuJuego.patronesBloqueados")}
            </Fila>
          </div>
        ) : j.patrones.length === 0 ? (
          <p className="text-sm text-muted py-2.5">{t("tuJuego.sinPatrones")}</p>
        ) : (
          j.patrones.map((p) => (
            <Fila key={p.clave} tipo={p.tipo} etiqueta={t(TIPO_PATRON[p.tipo])}>
              {t(`tuJuego.patron.${p.clave}`, p.vars)}
            </Fila>
          ))
        )}
        {j.tip && (
          <>
            <Fila tipo="consejo" etiqueta={t("tuJuego.consejo")}>
              {t(`tuJuego.tip.${j.tip.texto}`)}
            </Fila>
            <Valorar clave={j.tip.clave} datos={datos} />
          </>
        )}
      </div>
    </section>
  );
}

// C ------------------------------------------------------------------------
export function ConsejoAntesDeJugar({ otros, fechaHora }) {
  const { t } = useLocale();
  const datos = useDatosConsejos();
  const items = consejoAntesDeJugar(datos, otros, fechaHora);
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("tuJuego.antes.titulo")}</span>
      {items.map((it) => (
        <Fila key={it.clave + (it.vars.nombre ?? "")} tipo="dato" etiqueta={t("tuJuego.dato")}>
          {t(it.clave.startsWith("horario") ? `tuJuego.patron.${it.clave}` : `tuJuego.antes.${it.clave}`, it.vars)}
        </Fila>
      ))}
    </section>
  );
}

// Home ---------------------------------------------------------------------
export function ConsejoHome() {
  const { t } = useLocale();
  const datos = useDatosConsejos();
  const c = consejoHome(datos);
  if (!c) return null;
  const nivel = nivelConfianza(datos);
  return (
    <section className="flex flex-col py-3 border-b border-ink/10">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-titulo font-extrabold uppercase text-xl leading-none">{t("tuJuego.home.titulo")}</span>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
          {t(c.origen === "ultimo" ? "tuJuego.home.delUltimo" : "tuJuego.home.general")}
        </span>
      </div>
      <p className="text-sm leading-snug mt-2">{t(`tuJuego.tip.${c.tip.texto}`)}</p>
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="text-xs text-muted">
          {nivel.n < PARTIDOS_PARA_PATRONES ? t("tuJuego.nDeDiez", { n: nivel.n }) : t(`tuJuego.nivel.${nivel.clave}`)}
        </span>
        <Link href={c.partidoId ? `/partido/${c.partidoId}` : "/perfil"} className="text-[13px] font-semibold underline underline-offset-2">
          {t(c.partidoId ? "tuJuego.home.verPartido" : "tuJuego.home.verMas")}
        </Link>
      </div>
    </section>
  );
}
