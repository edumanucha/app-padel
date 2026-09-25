"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dict, DEFAULT_LOCALE } from "./translations";

const LocaleContext = createContext(null);

function resolver(objeto, ruta) {
  return ruta.split(".").reduce((acc, parte) => (acc == null ? acc : acc[parte]), objeto);
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem("locale");
      if (guardado && dict[guardado]) setLocaleState(guardado);
    } catch {
      // localStorage no disponible (SSR/incógnito estricto) -- se queda en el default.
    }
  }, []);

  const setLocale = useCallback((nuevo) => {
    if (!dict[nuevo]) return;
    setLocaleState(nuevo);
    try {
      localStorage.setItem("locale", nuevo);
    } catch {
      // no bloqueamos el cambio de idioma en memoria si no se puede persistir
    }
  }, []);

  const t = useCallback(
    (key, params) => {
      let valor = resolver(dict[locale], key);
      if (valor === undefined) valor = resolver(dict[DEFAULT_LOCALE], key) ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          valor = valor.replaceAll(`{${k}}`, v);
        }
      }
      return valor;
    },
    [locale]
  );

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale debe usarse dentro de <LocaleProvider>");
  return ctx;
}
