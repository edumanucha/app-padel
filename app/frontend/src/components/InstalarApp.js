"use client";

import { useEffect, useState } from "react";
import { IconoCasa } from "@/components/Icons";

const tarjeta = "bg-surface text-ink rounded-[18px] p-4 shadow-[0_1px_3px_rgba(20,38,31,0.08)]";

function estaInstalada() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function esIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// "Instalar app" (2026-09-13, a pedido del usuario: "de hacerlo
// instalable" -- el manifest/íconos/service worker ya estaban armados
// (US-PWA), pero no había ningún botón real en la UI para disparar el
// instalado -- sin esto, el usuario dependía de que el navegador se lo
// ofreciera solo, que muchos ni notan. Android/desktop: captura el evento
// `beforeinstallprompt` del navegador y lo dispara al tocar el botón. iOS
// Safari no tiene ese evento (no lo soporta) -- ahí se muestra el paso a
// paso manual ("Compartir -> Agregar a inicio").
// `siempre`: si es true, no se puede descartar (para Configuración,
// acceso permanente); si es false, se puede cerrar y no vuelve a
// aparecer en esta sesión de navegador (para el banner del Home).
export default function InstalarApp({ siempre = false }) {
  const [promptEvent, setPromptEvent] = useState(null);
  const [instalada, setInstalada] = useState(true); // arranca en true para no parpadear antes de chequear
  const [descartada, setDescartada] = useState(false);
  const [mostrarPasosIOS, setMostrarPasosIOS] = useState(false);

  useEffect(() => {
    setInstalada(estaInstalada());
    if (!siempre) {
      setDescartada(sessionStorage.getItem("instalarAppDescartada") === "1");
    }

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
  }, [siempre]);

  async function handleInstalar() {
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setInstalada(true);
    setPromptEvent(null);
  }

  function handleDescartar() {
    setDescartada(true);
    sessionStorage.setItem("instalarAppDescartada", "1");
  }

  if (instalada) return null;
  if (!siempre && descartada) return null;
  if (!promptEvent && !esIOS()) return null;

  return (
    <div className={`${tarjeta} flex items-start gap-3`}>
      <span className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
        <IconoCasa width={18} height={18} />
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-heading font-semibold text-sm block">Instalá Padelito en tu celular</span>
        <span className="text-xs text-muted block mt-0.5">
          Accedé más rápido, con ícono propio en tu pantalla de inicio, como una app más.
        </span>

        {esIOS() ? (
          <>
            <button
              onClick={() => setMostrarPasosIOS((v) => !v)}
              className="font-heading font-semibold text-xs text-accent-2-ink underline cursor-pointer mt-2"
            >
              Ver cómo
            </button>
            {mostrarPasosIOS && (
              <ol className="text-xs text-muted mt-1 flex flex-col gap-1 list-decimal list-inside">
                <li>Tocá el botón "Compartir" (el cuadradito con la flecha) en Safari.</li>
                <li>Elegí "Agregar a pantalla de inicio".</li>
                <li>Confirmá tocando "Agregar".</li>
              </ol>
            )}
          </>
        ) : (
          <button
            onClick={handleInstalar}
            className="font-heading font-semibold text-xs px-3 py-1.5 rounded-full bg-accent text-accent-ink border-2 border-outline cursor-pointer mt-2"
          >
            Instalar
          </button>
        )}
      </div>
      {!siempre && (
        <button onClick={handleDescartar} aria-label="Cerrar" className="text-muted cursor-pointer flex-shrink-0">
          ✕
        </button>
      )}
    </div>
  );
}
