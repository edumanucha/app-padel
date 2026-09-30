"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Herramienta de QA (2026-09-30): probar si los botones de control de
// música de un reloj Bluetooth (Redmi Watch 5 Lite del usuario, Android) o
// de auriculares llegan a la página, antes de sumarlo al Marcadorcito real.
//
// Cómo funciona: una página web no puede leer los botones del reloj
// directamente, pero SÍ recibe los comandos de reproducción del sistema
// (Media Session API) mientras está reproduciendo audio. Para eso se
// reproduce en loop un audio en silencio (public/sonidos/silencio.wav, 12 s:
// Chrome Android solo muestra el control de reproducción -- que es lo que
// el reloj maneja -- si el audio dura más de 5 s). Cada comando que llega
// se muestra en pantalla, así se ve qué botones del reloj sirven.
//
// Propuesta de mapeo si funciona: siguiente = punto A, anterior = punto B,
// play/pausa = deshacer.

const ACCIONES = [
  ["nexttrack", "⏭️ Siguiente"],
  ["previoustrack", "⏮️ Anterior"],
  ["play", "▶️ Play"],
  ["pause", "⏸️ Pausa"],
  ["stop", "⏹️ Stop"],
  ["seekforward", "⏩ Adelantar"],
  ["seekbackward", "⏪ Atrasar"],
];

export default function PruebaRelojForm() {
  const router = useRouter();
  const audioRef = useRef(null);
  const [activo, setActivo] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [conteo, setConteo] = useState({});
  const [error, setError] = useState(null);

  // Al salir de la página, soltar el control de reproducción.
  useEffect(() => () => detener(), []);

  function registrar(accion) {
    const etiqueta = ACCIONES.find(([a]) => a === accion)?.[1] ?? accion;
    const hora = new Date().toLocaleTimeString("es-AR");
    setEventos((ev) => [{ etiqueta, hora, id: Date.now() + Math.random() }, ...ev].slice(0, 15));
    setConteo((c) => ({ ...c, [accion]: (c[accion] || 0) + 1 }));
    if (navigator.vibrate) navigator.vibrate(60);
  }

  async function iniciar() {
    setError(null);
    if (!("mediaSession" in navigator)) {
      setError("Este navegador no soporta control de reproducción. Probá con Chrome en Android.");
      return;
    }
    try {
      const audio = audioRef.current;
      audio.loop = true;
      audio.volume = 1; // el archivo ya es silencio; con volumen 0 Chrome podría no mostrar el control
      await audio.play();

      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Marcadorcito",
        artist: "Prueba de reloj / auriculares",
        album: "Padelito",
      });
      for (const [accion] of ACCIONES) {
        try {
          navigator.mediaSession.setActionHandler(accion, () => {
            registrar(accion);
            // Mantener la "reproducción" viva aunque el botón sea pausa/stop,
            // si no el sistema saca el control y el reloj deja de mandar comandos.
            audio.play().catch(() => {});
            navigator.mediaSession.playbackState = "playing";
          });
        } catch {
          // algunos navegadores no soportan todas las acciones: se ignora
        }
      }
      navigator.mediaSession.playbackState = "playing";
      setActivo(true);
    } catch (e) {
      setError(`No se pudo iniciar el audio: ${e.message}`);
    }
  }

  function detener() {
    const audio = audioRef.current;
    if (audio) audio.pause();
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      for (const [accion] of ACCIONES) {
        try { navigator.mediaSession.setActionHandler(accion, null); } catch {}
      }
      navigator.mediaSession.playbackState = "none";
    }
    setActivo(false);
  }

  return (
    <div className="w-full max-w-md bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">⌚ Reloj / auriculares (prueba)</h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          Volver
        </button>
      </div>

      <audio ref={audioRef} src="/sonidos/silencio.wav" preload="auto" />

      {(
        <>
          <ol className="text-sm text-muted list-decimal pl-5 flex flex-col gap-1">
            <li>Conectá el reloj al celular (como siempre, con Mi Fitness).</li>
            <li>Tocá <b>Iniciar prueba</b>. En la barra de notificaciones va a aparecer &quot;Marcadorcito&quot; como si fuera una canción.</li>
            <li>En el reloj, abrí el <b>control de música</b> y tocá cada botón.</li>
            <li>Mirá acá abajo cuál llegó. Probá también con la pantalla del celular apagada.</li>
          </ol>

          <button
            onClick={activo ? detener : iniciar}
            className={`font-heading font-semibold px-4 py-3 rounded-full border-2 border-outline cursor-pointer ${activo ? "bg-bg text-ink" : "bg-accent text-accent-ink"}`}
          >
            {activo ? "Detener prueba" : "Iniciar prueba"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-2 gap-2">
            {ACCIONES.map(([accion, etiqueta]) => (
              <div key={accion} className={`rounded-[12px] border-2 p-2 text-sm flex justify-between ${conteo[accion] ? "border-green-600 bg-green-50" : "border-outline bg-bg"}`}>
                <span>{etiqueta}</span>
                <b>{conteo[accion] ? `✓ ${conteo[accion]}` : "—"}</b>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted uppercase tracking-wide">Últimos comandos recibidos</span>
            {eventos.length === 0 ? (
              <span className="text-sm text-muted">{activo ? "Esperando que toques un botón del reloj..." : "Todavía no empezaste la prueba."}</span>
            ) : (
              eventos.map((e) => (
                <span key={e.id} className="text-sm">{e.hora} — {e.etiqueta}</span>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
