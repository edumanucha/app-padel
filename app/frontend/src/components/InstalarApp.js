"use client";

import { useEffect, useState } from "react";
import { IconoCasa, IconoInstalar } from "@/components/Icons";

const tarjeta = "bg-surface text-ink rounded-[8px] p-4 border border-ink/10";

// La franja del inicio, si se cierra, vuelve a aparecer a los 3 días.
const CLAVE_FRANJA_CERRADA = "instalarAppFranjaCerrada";
const DIAS_FRANJA_CERRADA = 3;

function estaInstalada() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function esIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function franjaCerradaHace() {
  try {
    const cuando = Number(localStorage.getItem(CLAVE_FRANJA_CERRADA));
    return cuando ? (Date.now() - cuando) / 86400000 : Infinity;
  } catch {
    return Infinity;
  }
}

// "Instalar app" (2026-09-13, a pedido del usuario: "de hacerlo
// instalable"). Android/compu: captura el evento `beforeinstallprompt` del
// navegador y lo dispara al tocar el botón. iOS Safari no tiene ese evento
// -- ahí se muestra el paso a paso manual ("Compartir -> Agregar a inicio").
//
// 2026-09-30 (pedido del usuario: "si no está instalada, que aparezca el
// botón en la home y en el perfil"; eligió la opción 2 en /pruebas-instalar):
// - variante "franja": franja amarilla finita arriba del inicio, se cierra
//   con ✕ y vuelve a los 3 días.
// - variante "boton": botón punteado en el perfil, no se cierra.
// - variante "tarjeta" (la de siempre): Configuración, no se cierra.
// Ahora aparece siempre que la app no esté instalada, aunque el navegador
// no ofrezca instalar con un toque: en ese caso el botón muestra los pasos.
export default function InstalarApp({ variante = "tarjeta" }) {
  const [promptEvent, setPromptEvent] = useState(null);
  const [instalada, setInstalada] = useState(true); // arranca en true para no parpadear antes de chequear
  const [cerrada, setCerrada] = useState(false);
  const [mostrarPasos, setMostrarPasos] = useState(false);

  useEffect(() => {
    setInstalada(estaInstalada());
    if (variante === "franja") setCerrada(franjaCerradaHace() < DIAS_FRANJA_CERRADA);

    function alCapturarPrompt(e) {
      e.preventDefault();
      setPromptEvent(e);
    }
    function alInstalar() {
      setInstalada(true);
      setPromptEvent(null);
    }
    window.addEventListener("beforeinstallprompt", alCapturarPrompt);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alCapturarPrompt);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, [variante]);

  async function handleInstalar() {
    if (!promptEvent) {
      setMostrarPasos((v) => !v);
      return;
    }
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setInstalada(true);
    setPromptEvent(null);
  }

  function handleCerrar() {
    setCerrada(true);
    try {
      localStorage.setItem(CLAVE_FRANJA_CERRADA, String(Date.now()));
    } catch {
      // sin almacenamiento: se cierra solo por esta vez
    }
  }

  if (instalada || cerrada) return null;

  const pasos = mostrarPasos && (
    <ol className="text-xs text-muted flex flex-col gap-1 list-decimal list-inside text-left">
      {esIOS() ? (
        <>
          <li>Tocá el botón &quot;Compartir&quot; (el cuadradito con la flecha) en Safari.</li>
          <li>Elegí &quot;Agregar a pantalla de inicio&quot;.</li>
          <li>Confirmá tocando &quot;Agregar&quot;.</li>
        </>
      ) : (
        <>
          <li>Abrí el menú del navegador (los tres puntitos ⋮).</li>
          <li>Elegí &quot;Instalar app&quot; o &quot;Agregar a pantalla de inicio&quot;.</li>
          <li>Confirmá tocando &quot;Instalar&quot;.</li>
        </>
      )}
    </ol>
  );

  if (variante === "franja") {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] pl-3 pr-2 py-2 flex items-center gap-2 text-xs font-semibold">
          <IconoInstalar className="ico" aria-hidden />
          <span className="flex-1 min-w-0">Instalá la app: más rápida y anda sin señal</span>
          <button
            onClick={handleInstalar}
            className="rounded-[6px] bg-[#14261f] text-[#f2c53d] px-3 py-1 cursor-pointer flex-shrink-0"
          >
            Instalar
          </button>
          <button onClick={handleCerrar} aria-label="Cerrar" className="opacity-60 px-1 cursor-pointer flex-shrink-0">
            ✕
          </button>
        </div>
        {pasos && <div className={tarjeta}>{pasos}</div>}
      </div>
    );
  }

  if (variante === "boton") {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={handleInstalar}
          className="w-full rounded-[6px] text-ink border border-ink/15 py-2.5 text-sm font-semibold cursor-pointer"
        >
          <IconoInstalar className="ico" aria-hidden /> Instalar la app en este dispositivo
        </button>
        {pasos && <div className={tarjeta}>{pasos}</div>}
      </div>
    );
  }

  return (
    <div className={`${tarjeta} flex items-start gap-3`}>
      <span className="w-10 h-10 rounded-[6px] bg-[#154139] text-[#f2c53d] flex items-center justify-center flex-shrink-0">
        <IconoCasa width={18} height={18} />
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-titulo font-extrabold uppercase text-xl leading-none block">Instalá Padelito en tu celular</span>
        <span className="text-xs text-muted block mt-0.5">
          Accedé más rápido, con ícono propio en tu pantalla de inicio, como una app más.
        </span>
        <button
          onClick={handleInstalar}
          className="font-semibold text-xs px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer mt-2"
        >
          {promptEvent ? "Instalar" : "Ver cómo"}
        </button>
        {pasos && <div className="mt-2">{pasos}</div>}
      </div>
    </div>
  );
}
