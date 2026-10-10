"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";

// Aviso "Hay una versión nueva de Padelito" (2026-10-07, pedido del usuario)
// para quien abre la app desde un APK de Android viejo. Fuera de la Play
// Store Android no deja que la app se actualice sola: el botón baja el APK
// nuevo y Android muestra su pantalla de instalar (un toque, sin desinstalar).
//
// Cómo se sabe la versión del APK:
//  - Se abrió desde el APK si el referrer es "android-app://<package>".
//  - Desde la versión 3, el APK abre "/?apk=<versionCode>" (Start URL en
//    PWABuilder). Sin ese número: el APK 1 abría la dirección vieja
//    (frontend-ten-theta-89...) el 2 abre padelito-app sin número y el 3 abre padelitoapp.com.ar/?apk=3.
// Se guarda en sessionStorage (no localStorage: el APK comparte el
// almacenamiento con Chrome y el aviso no tiene que salir en el navegador).
//
// AL PUBLICAR UN APK NUEVO: subir APK_ULTIMO a su versionCode y en
// PWABuilder poner Start URL "/?apk=<ese número>".
export const APK_ULTIMO = 3;
const PAQUETE = "app.vercel.frontend_ten_theta_89.twa";
const CLAVE_VERSION = "padelito_apk_version";
const CLAVE_CERRADO = "padelito_apk_aviso_cerrado";
const TRES_DIAS = 3 * 24 * 60 * 60 * 1000;

function versionDelApk() {
  try {
    const guardada = sessionStorage.getItem(CLAVE_VERSION);
    if (guardada) return Number(guardada);
    if (!document.referrer.startsWith(`android-app://${PAQUETE}`)) return null;
    const param = Number(new URLSearchParams(window.location.search).get("apk"));
    const version = param > 0 ? param : window.location.hostname.startsWith("frontend-") ? 1 : 2;
    sessionStorage.setItem(CLAVE_VERSION, String(version));
    return version;
  } catch {
    return null;
  }
}

export default function ActualizarApk() {
  const { t } = useLocale();
  const [ver, setVer] = useState(false);

  useEffect(() => {
    const version = versionDelApk();
    if (version === null || version >= APK_ULTIMO) return;
    try {
      const cerrado = Number(localStorage.getItem(CLAVE_CERRADO)) || 0;
      if (Date.now() - cerrado < TRES_DIAS) return;
    } catch {
      // sin almacenamiento: se muestra igual
    }
    setVer(true);
  }, []);

  if (!ver) return null;

  function cerrar() {
    try {
      localStorage.setItem(CLAVE_CERRADO, String(Date.now()));
    } catch {
      // nada
    }
    setVer(false);
  }

  // La descarga se baja desde padelito-app aunque el APK viejo esté en otra dirección.
  return (
    <div
      role="status"
      className="fixed left-0 right-0 top-0 z-[90] flex items-center gap-3 px-4 py-3 bg-[#154139] text-[#eaf4f0] shadow-lg"
      style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
    >
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="font-titulo font-black uppercase text-lg leading-none">{t("apk.hayNueva")}</span>
        <span className="text-xs text-[#b9d3ca]">{t("apk.detalle")}</span>
      </span>
      <a
        href="https://padelitoapp.com.ar/padelito.apk"
        download
        onClick={() => setTimeout(cerrar, 500)}
        className="rounded-[6px] bg-[#f2c53d] text-[#14261f] font-titulo font-black uppercase text-base px-3 py-2 flex-shrink-0"
      >
        {t("apk.actualizar")}
      </a>
      <button onClick={cerrar} aria-label={t("apk.cerrar")} className="text-[#b9d3ca] text-xl leading-none px-1 cursor-pointer">
        ×
      </button>
    </div>
  );
}
