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
  const [estadoNotif, setEstadoNotif] = useState("");

  // Prueba de notificación (2026-09-30): el reloj no refresca el título de
  // la "canción", pero Mi Fitness SÍ espeja las notificaciones del celu.
  // En Android, Chrome solo permite notificaciones desde el service worker
  // (new Notification() tira error), por eso se usa registration.showNotification.
  async function probarNotificacion() {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setEstadoNotif("Este navegador no soporta notificaciones.");
        return;
      }
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstadoNotif("No diste permiso de notificaciones. Activalo en los ajustes del sitio en Chrome.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      setEstadoNotif("Listo: en 5 segundos llega la notificación. Bloqueá el celu y mirá el reloj.");
      setTimeout(() => {
        reg.showNotification("🎾 Set ganado · 6-4", {
          body: "Pareja A gana el 1er set. Sets 1-0.",
          tag: "marcadorcito-set",
          renotify: true,
          vibrate: [200, 100, 200],
          icon: "/pwa-icon?size=192",
        });
        setEstadoNotif("Notificación enviada. ¿Te llegó al reloj?");
      }, 5000);
    } catch (e) {
      setEstadoNotif(`No se pudo mandar: ${e.message}`);
    }
  }

  // Al salir de la página, soltar el control de reproducción.
  useEffect(() => () => detener(), []);

  // v6 (2026-09-30): ni cambiar metadatos (v2), ni reiniciar (v3), ni
  // recargar la misma pista (v4) hicieron que el Redmi Watch refresque el
  // título. Se prueban 3 estrategias más, elegibles en pantalla:
  //   1) "titulo": sin metadatos -- Chrome usa document.title como nombre.
  //   2) "reproductores": alternar entre dos <audio> distintos.
  //   3) "pistas": alternar entre dos archivos de distinta duración.
  const conteoRef = useRef({});
  const audio2Ref = useRef(null);
  const turnoRef = useRef(0);
  const [estrategia, setEstrategia] = useState("titulo");
  const estrategiaRef = useRef("titulo");

  function nuevaCancion(titulo, subtitulo) {
    const modo = estrategiaRef.current;
    const ponerMetadatos = () => {
      navigator.mediaSession.metadata = new MediaMetadata({ title: titulo, artist: subtitulo, album: "Padelito" });
      navigator.mediaSession.playbackState = "playing";
    };
    if (modo === "titulo") {
      navigator.mediaSession.metadata = null;
      document.title = `${titulo} · ${subtitulo}`;
      audioRef.current?.play().catch(() => {});
      return;
    }
    turnoRef.current += 1;
    if (modo === "reproductores") {
      const [sale, entra] = turnoRef.current % 2 ? [audioRef.current, audio2Ref.current] : [audio2Ref.current, audioRef.current];
      if (!sale || !entra) return;
      entra.loop = true;
      entra.currentTime = 0;
      entra.play().then(() => { sale.pause(); ponerMetadatos(); }).catch(() => {});
      return;
    }
    // "pistas": mismo reproductor, archivo distinto (12 s / 17 s)
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = turnoRef.current % 2 ? "/sonidos/silencio2.wav" : "/sonidos/silencio.wav";
    audio.load();
    audio.play().then(ponerMetadatos).catch(() => {});
  }

  function registrar(accion) {
    const etiqueta = ACCIONES.find(([a]) => a === accion)?.[1] ?? accion;
    const hora = new Date().toLocaleTimeString("es-AR");
    setEventos((ev) => [{ etiqueta, hora, id: Date.now() + Math.random() }, ...ev].slice(0, 15));
    const c = { ...conteoRef.current, [accion]: (conteoRef.current[accion] || 0) + 1 };
    conteoRef.current = c;
    setConteo(c);
    nuevaCancion(`A ${c.nexttrack || 0} – ${c.previoustrack || 0} B`, `Pausas: ${c.pause || 0} · ${hora}`);
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
            // registrar() carga una "canción" nueva y la pone a sonar, así la
            // reproducción sigue viva aunque el botón sea pausa/stop.
            registrar(accion);
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
    audio2Ref.current?.pause();
    document.title = "Padelito";
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
        <h1 className="font-heading text-xl font-semibold">⌚ Reloj / auriculares (prueba) <span className="text-xs text-muted font-normal">v7</span></h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          Volver
        </button>
      </div>

      <audio ref={audioRef} src="/sonidos/silencio.wav" preload="auto" />
      <audio ref={audio2Ref} src="/sonidos/silencio2.wav" preload="auto" />

      <div className="flex flex-col gap-2 bg-bg rounded-[14px] p-3">
        <span className="text-xs text-muted uppercase tracking-wide">Estrategia para el título del reloj</span>
        {[
          ["titulo", "1) Título de la página"],
          ["reproductores", "2) Dos reproductores alternados"],
          ["pistas", "3) Pistas de distinta duración"],
        ].map(([valor, texto]) => (
          <label key={valor} className="text-sm flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="estrategia"
              checked={estrategia === valor}
              onChange={() => { setEstrategia(valor); estrategiaRef.current = valor; }}
            />
            {texto}
          </label>
        ))}
        <span className="text-xs text-muted">Elegí una, tocá ⏭️ en el reloj 2-3 veces y fijate si el título cambia a &quot;A 1 – 0 B&quot;. Después probá la siguiente.</span>
      </div>

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

          {/* Mini marcador (pedido del usuario): lo que se ve cambiar acá con
              cada toque del reloj es lo que en el modo real suma puntos. */}
          <div className="bg-[#0f2a1f] text-white rounded-[16px] p-4 flex items-center justify-around">
            <div className="flex flex-col items-center">
              <span className="text-xs opacity-70">Pareja A · ⏭️</span>
              <span className="font-heading text-5xl font-bold tabular-nums">{conteo.nexttrack || 0}</span>
            </div>
            <span className="text-2xl opacity-50">–</span>
            <div className="flex flex-col items-center">
              <span className="text-xs opacity-70">Pareja B · ⏮️</span>
              <span className="font-heading text-5xl font-bold tabular-nums">{conteo.previoustrack || 0}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs opacity-70">Deshacer · ⏸️</span>
              <span className="font-heading text-2xl font-bold tabular-nums">{(conteo.pause || 0) + (conteo.play || 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ACCIONES.map(([accion, etiqueta]) => (
              <div key={accion} className={`rounded-[12px] border-2 p-2 text-sm flex justify-between ${conteo[accion] ? "border-green-600 bg-green-50" : "border-outline bg-bg"}`}>
                <span>{etiqueta}</span>
                <b>{conteo[accion] ? `✓ ${conteo[accion]}` : "—"}</b>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-outline pt-3">
            <span className="text-xs text-muted uppercase tracking-wide">Prueba de notificación al reloj</span>
            <button
              onClick={probarNotificacion}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink border-2 border-outline cursor-pointer"
            >
              🔔 Mandar &quot;Set ganado&quot; en 5 segundos
            </button>
            {estadoNotif && <span className="text-sm">{estadoNotif}</span>}
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
