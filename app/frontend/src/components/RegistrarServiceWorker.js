"use client";

import { useEffect } from "react";
import { sincronizarTodo } from "@/lib/marcadorOffline";

// Registra el service worker de la PWA (public/sw.js) apenas carga la
// app -- sin esto, el archivo existe pero el navegador nunca lo usa.
// No renderiza nada, es puro efecto de arranque.
//
// También (2026-09-30, Marcadorcito sin internet): al abrir la app y cada
// vez que vuelve la conexión, sube lo que haya quedado guardado en el celu
// (partidos creados sin señal y puntos pendientes) -- ver marcadorOffline.js.
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla el registro (ej. navegador viejo sin soporte), la app
        // sigue funcionando normal -- este service worker es solo un
        // extra, nunca algo de lo que dependa una pantalla real.
      });
    }

    sincronizarTodo();
    window.addEventListener("online", sincronizarTodo);
    return () => window.removeEventListener("online", sincronizarTodo);
  }, []);

  return null;
}
