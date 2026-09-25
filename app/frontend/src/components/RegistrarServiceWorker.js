"use client";

import { useEffect } from "react";

// Registra el service worker de la PWA (public/sw.js) apenas carga la
// app -- sin esto, el archivo existe pero el navegador nunca lo usa.
// No renderiza nada, es puro efecto de arranque.
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla el registro (ej. navegador viejo sin soporte), la app
        // sigue funcionando normal -- este service worker es solo un
        // extra, nunca algo de lo que dependa una pantalla real.
      });
    }
  }, []);

  return null;
}
