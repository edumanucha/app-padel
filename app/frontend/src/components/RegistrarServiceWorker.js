"use client";

import { useEffect } from "react";
import { sincronizarTodo } from "@/lib/marcadorOffline";
import { supabase } from "@/lib/supabaseClient";
import { permisoPush, activarPush } from "@/lib/push";

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

    // Avisos al celu (2026-10-07): si este celu ya dio permiso, se vuelve a
    // guardar la suscripción con la cuenta abierta (sin preguntar nada).
    if (permisoPush() === "granted") {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) activarPush();
      });
    }

    sincronizarTodo();
    window.addEventListener("online", sincronizarTodo);
    return () => window.removeEventListener("online", sincronizarTodo);
  }, []);

  return null;
}
