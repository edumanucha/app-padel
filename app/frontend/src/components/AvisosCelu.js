"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { soportaPush, permisoPush, pushActivo, activarPush, desactivarPush } from "@/lib/push";

// Notificaciones push (2026-10-07). Dos piezas:
//  - OfrecerAvisos: cartel que pide el permiso la primera vez que alguien
//    entra a un partido (ahí se entiende para qué sirve). "Ahora no" lo
//    esconde y no vuelve a aparecer en este celu.
//  - InterruptorAvisos: la fila de Configuración para prender o apagar.
const CLAVE_OFRECIDO = "padelito_avisos_ofrecido";

export function OfrecerAvisos() {
  const { t } = useLocale();
  const [ver, setVer] = useState(false);
  const [estado, setEstado] = useState("");

  useEffect(() => {
    try {
      if (soportaPush() && permisoPush() === "default" && !localStorage.getItem(CLAVE_OFRECIDO)) setVer(true);
    } catch {
      // nada
    }
  }, []);

  if (!ver) return null;

  function cerrar() {
    try {
      localStorage.setItem(CLAVE_OFRECIDO, "1");
    } catch {
      // nada
    }
    setVer(false);
  }

  async function activar() {
    setEstado("activando");
    const r = await activarPush();
    if (r === "ok") cerrar();
    else setEstado(r);
  }

  return (
    <div className="col-completa flex flex-col gap-2 border-2 border-ink rounded-[8px] p-4">
      <span className="font-titulo font-black uppercase text-2xl leading-none">{t("avisos.ofrecerTitulo")}</span>
      <p className="text-sm text-muted leading-relaxed">{t("avisos.ofrecerTexto")}</p>
      {estado === "denegado" && <p className="text-sm text-[#c2410c]">{t("avisos.bloqueados")}</p>}
      {estado === "error" && <p className="text-sm text-[#c2410c]">{t("avisos.noSePudo")}</p>}
      <div className="flex gap-2">
        <button
          onClick={activar}
          disabled={estado === "activando"}
          className="flex-1 rounded-[6px] bg-ink text-bg font-semibold text-sm py-2.5 cursor-pointer disabled:opacity-60"
        >
          {t("avisos.activar")}
        </button>
        <button onClick={cerrar} className="text-sm font-semibold px-3 py-2 rounded-[6px] border border-ink/15 cursor-pointer">
          {t("avisos.ahoraNo")}
        </button>
      </div>
    </div>
  );
}

export function InterruptorAvisos({ fila }) {
  const { t } = useLocale();
  const [activo, setActivo] = useState(false);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    if (!soportaPush()) {
      setEstado("sinSoporte");
      return;
    }
    if (permisoPush() === "denied") {
      setEstado("denegado");
      return;
    }
    pushActivo().then((a) => {
      setActivo(a);
      setEstado("listo");
    });
  }, []);

  async function cambiar() {
    setEstado("cargando");
    if (activo) {
      await desactivarPush();
      setActivo(false);
      setEstado("listo");
      return;
    }
    const r = await activarPush();
    setActivo(r === "ok");
    setEstado(r === "ok" ? "listo" : r);
  }

  const nota =
    estado === "sinSoporte" ? t("avisos.sinSoporte") : estado === "denegado" ? t("avisos.bloqueados") : estado === "error" ? t("avisos.noSePudo") : t("avisos.detalle");

  return (
    <div className={`${fila} border-t-2 border-t-ink`}>
      <span className="flex flex-col min-w-0">
        <span className="text-sm font-semibold">{t("avisos.alCelu")}</span>
        <span className="text-xs text-muted">{nota}</span>
      </span>
      {(estado === "listo" || estado === "cargando") && (
        <button
          role="switch"
          aria-checked={activo}
          aria-label={t("avisos.alCelu")}
          onClick={cambiar}
          disabled={estado === "cargando"}
          className={`relative w-11 h-6 rounded-full flex-shrink-0 cursor-pointer transition-colors disabled:opacity-60 ${activo ? "bg-[#154139]" : "bg-ink/20"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${activo ? "left-[22px]" : "left-0.5"}`} />
        </button>
      )}
    </div>
  );
}
