"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import InstalarApp from "@/components/InstalarApp";
import { useLocale } from "@/i18n/LocaleContext";
import { LOCALES } from "@/i18n/translations";

// Opciones de color de los botones "de acción" grandes (Marcadorcito,
// Crear partido, Abiertos) -- ver --accent-cta en globals.css. Guardado en
// localStorage + aplicado como atributo en <html> para que layout.js lo
// pueda pintar antes del primer render (mismo mecanismo que el tema
// claro/oscuro) y no se vea un flash del color por defecto.
const COLORES = [
  { valor: "amarillo", clave: "colorAmarillo", muestra: "#f2c53d" },
  { valor: "verde", clave: "colorVerde", muestra: "#154139" },
  { valor: "turquesa", clave: "colorTurquesa", muestra: "#2fb5ad" },
];

const tarjeta = "bg-surface text-ink rounded-[18px] p-4 shadow-[0_1px_3px_rgba(20,38,31,0.08)]";

export default function ConfiguracionForm() {
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const [colorElegido, setColorElegido] = useState(null);

  useEffect(() => {
    const guardado = localStorage.getItem("accentCta");
    setColorElegido(guardado === "verde" || guardado === "turquesa" ? guardado : "amarillo");
  }, []);

  function elegirColor(valor) {
    setColorElegido(valor);
    if (valor === "amarillo") {
      document.documentElement.removeAttribute("data-accent-cta");
      localStorage.removeItem("accentCta");
    } else {
      document.documentElement.setAttribute("data-accent-cta", valor);
      localStorage.setItem("accentCta", valor);
    }
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">⚙️ {t("config.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("config.volver")}
        </button>
      </div>

      <div className={`${tarjeta} flex flex-col gap-3`}>
        <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted">{t("config.apariencia")}</span>

        <div className="flex items-center justify-between">
          <span className="text-sm">{t("config.tema")}</span>
          <ThemeToggle />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{t("config.colorBotones")}</span>
          <div className="flex gap-3">
            {COLORES.map((c) => (
              <button
                key={c.valor}
                onClick={() => elegirColor(c.valor)}
                aria-label={t(`config.${c.clave}`)}
                title={t(`config.${c.clave}`)}
                className="flex flex-col items-center gap-1 cursor-pointer"
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: c.muestra,
                    // Anillo siempre visible (2026-09-13, a pedido del
                    // usuario): sin esto, una muestra clara (ej. amarillo)
                    // se pierde contra un fondo claro y una oscura contra
                    // un fondo oscuro. `--outline` ya es negro en modo
                    // claro y blanco en modo oscuro, así que alcanza con
                    // usarlo siempre en vez de solo cuando está elegido.
                    border: colorElegido === c.valor ? "3px solid var(--outline)" : "1.5px solid var(--outline)",
                  }}
                >
                  {colorElegido === c.valor && (
                    <span style={{ color: c.valor === "amarillo" ? "#1a1305" : "#fff", fontSize: 16 }}>✓</span>
                  )}
                </span>
                <span className="text-xs text-muted">{t(`config.${c.clave}`)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <InstalarApp siempre />

      <div className={`${tarjeta} flex flex-col gap-3`}>
        <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted">{t("config.idioma")}</span>
        <div className="flex gap-2">
          {LOCALES.map((l) => (
            <button
              key={l.valor}
              onClick={() => setLocale(l.valor)}
              className={`flex-1 text-sm font-heading font-semibold px-3 py-2 rounded-full cursor-pointer ${
                locale === l.valor ? "bg-accent text-accent-ink" : "bg-bg text-ink"
              }`}
            >
              {l.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className={`${tarjeta} flex flex-col gap-2`}>
        <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted">{t("config.acercaDe")}</span>
        <div className="flex items-center justify-between">
          <span className="text-sm">{t("config.version")}</span>
          <span className="text-sm text-muted">0.1.0</span>
        </div>
        <button
          onClick={() => router.push("/quienes-somos")}
          className="text-left text-sm text-accent-2-ink underline cursor-pointer"
        >
          {t("config.quienesSomos")}
        </button>
      </div>
    </div>
  );
}
