"use client";

import { useEffect, useState } from "react";
import { IconoCasa, IconoInstalar } from "@/components/Icons";
import HojaAbajo from "@/components/HojaAbajo";

const tarjeta = "bg-surface text-ink rounded-[8px] p-4 border border-ink/10";

// APK de Android (2026-10-03): archivo en public/padelito.apk, generado con
// PWABuilder (llave de firma guardada FUERA del repo). Si se saca el archivo,
// poner esto en false y la opción deja de mostrarse.
const APK_DISPONIBLE = true;
const LINK_APK = "/padelito.apk";


function estaInstalada() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function esIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function esAndroid() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

// "Instalar app" (2026-09-13, a pedido del usuario: "de hacerlo
// instalable"). Android/compu: captura el evento `beforeinstallprompt` del
// navegador y lo dispara al tocar el botón. iOS Safari no tiene ese evento
// -- ahí se muestra el paso a paso manual ("Compartir -> Agregar a inicio").
//
// 2026-09-30 (pedido del usuario: "si no está instalada, que aparezca el
// botón en la home y en el perfil"; eligió la opción 2 en /pruebas-instalar):
// - variante "franja": franja finita arriba del inicio (y del inicio de
//   visitantes). Desde 2026-10-07 no se cierra: aparece siempre que la app
//   no esté instalada (pedido del usuario; antes la ✕ la escondía 3 días).
// - variante "boton": botón punteado en el perfil, no se cierra.
// - variante "tarjeta" (la de siempre): Configuración, no se cierra.
// Ahora aparece siempre que la app no esté instalada, aunque el navegador
// no ofrezca instalar con un toque: en ese caso el botón muestra los pasos.
export default function InstalarApp({ variante = "tarjeta" }) {
  const [promptEvent, setPromptEvent] = useState(null);
  const [instalada, setInstalada] = useState(true); // arranca en true para no parpadear antes de chequear
  const [mostrarPasos, setMostrarPasos] = useState(false);
  const [mostrarHoja, setMostrarHoja] = useState(false);

  useEffect(() => {
    setInstalada(estaInstalada());

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
    // Android con APK, o iPhone: se abre la hojita con las opciones / los pasos.
    if ((esAndroid() && APK_DISPONIBLE) || esIOS()) {
      if (esIOS()) setMostrarPasos(true);
      setMostrarHoja(true);
      return;
    }
    if (!promptEvent) {
      setMostrarPasos((v) => !v);
      return;
    }
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setInstalada(true);
    setPromptEvent(null);
  }

  // "Instalar desde el navegador" dentro de la hoja de Android.
  async function instalarDesdeNavegador() {
    if (!promptEvent) {
      setMostrarPasos(true);
      return;
    }
    setMostrarHoja(false);
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setInstalada(true);
    setPromptEvent(null);
  }

  if (instalada) return null;

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

  // Hoja de instalación (2026-10-03, maqueta aprobada): Android ofrece el APK
  // y la instalación desde el navegador; iPhone muestra los pasos de Safari.
  const hoja = mostrarHoja && (
    <HojaAbajo titulo="Instalar Padelito" onCerrar={() => { setMostrarHoja(false); setMostrarPasos(false); }} textoCerrar="Cerrar ✕">
      {esIOS() ? (
        <>
          {pasos}
        </>
      ) : (
        <>
          <a
            href={LINK_APK}
            download="Padelito.apk"
            className="flex flex-col gap-1 rounded-[8px] bg-[#154139] text-[#eaf4f0] p-3"
          >
            <span className="self-start text-[10px] font-bold uppercase tracking-[0.1em] bg-[#f2c53d] text-[#1a1305] px-1.5 py-0.5 rounded-[4px]">Recomendado</span>
            <span className="font-bold text-[15px] flex items-center gap-2">
              <IconoInstalar className="ico" aria-hidden /> Descargar la app (APK)
            </span>
            <span className="text-xs text-[#8fb6ae]">Se instala como una app más, con ícono propio. Pesa 1 MB.</span>
          </a>
          <button
            type="button"
            onClick={instalarDesdeNavegador}
            className="flex flex-col gap-1 rounded-[8px] border border-ink/15 p-3 text-left cursor-pointer"
          >
            <span className="font-bold text-[15px]">Instalar desde el navegador</span>
            <span className="text-xs text-muted">Más rápido, pero depende de Chrome.</span>
          </button>
          {mostrarPasos && pasos}
          <p className="text-xs text-muted border-t border-ink/10 pt-3">
            Al instalar el APK, Android puede pedirte permiso para <b className="text-ink">instalar apps de origen desconocido</b>. Es normal: aceptalo solo para Padelito.
          </p>
        </>
      )}
    </HojaAbajo>
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
        </div>
        {pasos && !mostrarHoja && <div className={tarjeta}>{pasos}</div>}
        {hoja}
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
        {pasos && !mostrarHoja && <div className={tarjeta}>{pasos}</div>}
        {hoja}
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
        {pasos && !mostrarHoja && <div className="mt-2">{pasos}</div>}
      </div>
      {hoja}
    </div>
  );
}
