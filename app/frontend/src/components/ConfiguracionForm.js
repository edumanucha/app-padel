"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import InstalarApp from "@/components/InstalarApp";import { useLocale } from "@/i18n/LocaleContext";
import { LOCALES } from "@/i18n/config";
import { IconoChevron } from "@/components/Icons";

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

// Rediseño Cartel (2026-10-01): etiqueta de sección + filas con línea.
const etiqueta = "text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-2";
const fila = "flex items-center justify-between gap-3 py-3 border-b border-ink/10";

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

  // Rediseño Cartel (2026-10-01): sin tarjetas -- cada sección es una
  // etiqueta chica y filas separadas por líneas finas, como el Inicio.
  return (
    <div className="w-full max-w-md flex flex-col gap-6 text-ink">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("config.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("config.volver")}
        </button>
      </div>

      <section className="flex flex-col">
        <span className={etiqueta}>{t("config.apariencia")}</span>

        <div className={`${fila} border-t-2 border-t-ink`}>
          <span className="text-sm font-semibold">{t("config.tema")}</span>
          <ThemeToggle />
        </div>

        <div className="flex flex-col gap-3 py-3 border-b border-ink/10">
          <span className="text-sm font-semibold">{t("config.colorBotones")}</span>
          <div className="flex gap-4">
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
                <span className={`text-xs ${colorElegido === c.valor ? "text-ink font-semibold" : "text-muted"}`}>
                  {t(`config.${c.clave}`)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <InstalarApp />

      <section className="flex flex-col">
        <span className={etiqueta}>{t("config.idioma")}</span>
        {/* Selector de idioma como fila con líneas y divisores (no
            botones amarillos): el elegido va en verde tablero. */}
        <div className="flex border-y-2 border-ink">
          {LOCALES.map((l, i) => (
            <button
              key={l.valor}
              onClick={() => setLocale(l.valor)}
              className={`flex-1 text-sm font-semibold px-3 py-2.5 cursor-pointer ${i > 0 ? "border-l-2 border-ink" : ""} ${ locale === l.valor ? "bg-[#154139] text-[#eaf4f0]" : "text-ink" }`}
            >
              {l.nombre}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col">
        <span className={etiqueta}>{t("config.acercaDe")}</span>
        <div className={`${fila} border-t-2 border-t-ink`}>
          <span className="text-sm font-semibold">{t("config.version")}</span>
          <span className="font-titulo font-extrabold text-lg leading-none text-muted">0.1.0</span>
        </div>
        <button
          onClick={() => router.push("/quienes-somos")}
          className={`${fila} text-left text-sm font-semibold cursor-pointer`}
        >
          {t("config.quienesSomos")}
          <IconoChevron width={16} height={16} style={{ transform: "rotate(-90deg)" }} aria-hidden />
        </button>
        <button
          onClick={() => router.push("/privacidad")}
          className={`${fila} text-left text-sm font-semibold cursor-pointer`}
        >
          {t("config.privacidad")}
          <IconoChevron width={16} height={16} style={{ transform: "rotate(-90deg)" }} aria-hidden />
        </button>
      </section>
    </div>
  );
}
