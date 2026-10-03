"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_LOCALE, LOCALES } from "./config";
import es from "./es";

const LocaleContext = createContext(null);

// Velocidad 3 (2026-10-03): el español viaja con la app (es el que se ve en la
// primera pantalla); inglés y portugués son archivos aparte que se piden
// recién cuando alguien los elige, así el resto del mundo no los baja.
const CARGADORES = {
  en: () => import("./en").then((m) => m.default),
  pt: () => import("./pt").then((m) => m.default),
};
const IDIOMAS_VALIDOS = LOCALES.map((l) => l.valor);

function resolver(objeto, ruta) {
  return ruta.split(".").reduce((acc, parte) => (acc == null ? acc : acc[parte]), objeto);
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [diccionarios, setDiccionarios] = useState({ es });

  // Lee el idioma guardado la primera vez.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem("locale");
      if (guardado && IDIOMAS_VALIDOS.includes(guardado)) setLocaleState(guardado);
    } catch {
      // localStorage no disponible (SSR/incógnito estricto) -- se queda en el default.
    }
  }, []);

  // Pide el diccionario del idioma elegido si todavía no está cargado. Mientras
  // llega, `t` usa el español (mismo comportamiento que ya había al arrancar).
  useEffect(() => {
    if (diccionarios[locale] || !CARGADORES[locale]) return;
    let vigente = true;
    CARGADORES[locale]().then((dic) => {
      if (vigente) setDiccionarios((prev) => ({ ...prev, [locale]: dic }));
    });
    return () => {
      vigente = false;
    };
  }, [locale, diccionarios]);

  const setLocale = useCallback((nuevo) => {
    if (!IDIOMAS_VALIDOS.includes(nuevo)) return;
    setLocaleState(nuevo);
    try {
      localStorage.setItem("locale", nuevo);
    } catch {
      // no bloqueamos el cambio de idioma en memoria si no se puede persistir
    }
  }, []);

  const t = useCallback(
    (key, params) => {
      let valor = resolver(diccionarios[locale] ?? es, key);
      if (valor === undefined) valor = resolver(es, key) ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          valor = valor.replaceAll(`{${k}}`, v);
        }
      }
      return valor;
    },
    [locale, diccionarios]
  );

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale debe usarse dentro de <LocaleProvider>");
  return ctx;
}
