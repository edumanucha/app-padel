"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { crearEstadoInicial, sumarPunto, setsGanados, formatearPuntos } from "@/lib/marcadorEngine";

// Simulador del modo "⌚ Reloj" (v8, 2026-09-30) -- herramienta de QA aislada
// del Marcadorcito real, para probar el reloj con puntuación REAL de pádel
// (mismo motor que el Marcadorcito) sin armar un partido.
//
// Historia de lo probado con el Redmi Watch 5 Lite del usuario (Android):
//  - Los botones de música llegan vía Media Session: ⏭️ ⏮️ ⏸️ sí; volumen no
//    (lo maneja el sistema, la página nunca se entera).
//  - El título que muestra el reloj NO se refresca cambiando solo los
//    metadatos (v2), reiniciando (v3), recargando la misma pista (v4), ni
//    con document.title. Lo que SÍ funciona (v6, estrategia 2, elegida por
//    el usuario): alternar entre dos <audio> -- el nuevo empieza a sonar,
//    se pausa el viejo y recién ahí se ponen los metadatos.
//  - Las notificaciones (service worker) llegan al reloj vía Mi Fitness
//    mientras la página está viva (el audio en loop la mantiene viva).
//
// Mapeo: ⏭️ = punto A, ⏮️ = punto B, ⏸️/▶️ = deshacer, anti doble toque 1 s.
// Formato en el reloj (pedido del usuario): "40-15 Marcadorcito" arriba y
// "3-2 · Sets 1-0 · 45'" abajo.

// Distribuciones de los 2 renglones del reloj, elegibles en pantalla para
// comparar (pedido del usuario, 2026-09-30). En el Redmi Watch el renglón
// de arriba (título) tiene letra grande y se mueve si no entra; el de
// abajo queda quieto.
const DISTRIBUCIONES = [
  ["games-arriba", "1) Games arriba · puntos abajo"],
  ["puntos-arriba", "2) Puntos arriba · games abajo"],
  ["puntos-solos", "3) Solo puntos arriba · todo lo demás abajo"],
  ["marca-arriba", "4) Marca y minutos arriba · puntos y games abajo"],
  ["puntos-y-todo", "5) Puntos + marca arriba · todo abajo"],
  ["corto-letras", "6) Corto: ●40-15 / G 1-0 · S 1-0"],
  ["corto-palabras", "7) Corto: ●40-15 / Games 1-0 · Sets 1-0"],
];

function textosReloj(est, minutos, distribucion = "games-arriba") {
  const { textoA, textoB } = formatearPuntos(est);
  const { a, b } = setsGanados(est.setsA, est.setsB);
  const gA = est.setsA[est.setsA.length - 1];
  const gB = est.setsB[est.setsB.length - 1];
  const tb = est.tiebreak ? "TB " : "";
  const ptsSinSaque = est.finalizado ? `Final ${a}-${b}` : `${tb}${textoA}-${textoB}`;
  // ● = quién saca ("●30-15" saca A, "30-15●" saca B)
  const pts = est.finalizado ? ptsSinSaque : est.saque === "B" ? `${tb}${textoA}-${textoB}●` : `${tb}●${textoA}-${textoB}`;
  const games = `Games ${gA}-${gB} · Sets ${a}-${b}`;
  // Pantalla final (en la prueba, "vos" = pareja A).
  if (est.finalizado) {
    return {
      titulo: est.ganador === "A" ? "Partido ganado" : "Partido perdido",
      subtitulo: est.setsA.map((g, i) => `${g}-${est.setsB[i]}`).join("  "),
    };
  }
  switch (distribucion) {
    case "puntos-arriba":
      return { titulo: `${pts} Marcadorcito`, subtitulo: `${games} · ${minutos}'` };
    case "puntos-solos":
      return { titulo: pts, subtitulo: `${gA}-${gB} · S ${a}-${b} · ${minutos}' · Marcadorcito` };
    // 6 y 7 (2026-09-30): versiones cortas para que ningún renglón se mueva
    // tipo marquesina -- sin minutos ni marca. Games = solo los del set en
    // curso; los sets ya terminados se ven en "S".
    case "corto-letras":
      return { titulo: pts, subtitulo: `G ${gA}-${gB} · S ${a}-${b}` };
    case "corto-palabras":
      return { titulo: pts, subtitulo: `Games ${gA}-${gB} · Sets ${a}-${b}` };
    case "puntos-y-todo":
      return { titulo: `${pts} Marcadorcito`, subtitulo: `${ptsSinSaque} · G ${gA}-${gB} · S ${a}-${b} · ${minutos}'` };
    case "marca-arriba":
      return { titulo: `Marcadorcito · ${minutos}'`, subtitulo: `${pts} · ${gA}-${gB} · S ${a}-${b}` };
    default:
      return { titulo: `${games} · ${minutos}'`, subtitulo: `${pts} Marcadorcito` };
  }
}

export default function PruebaRelojForm() {
  const router = useRouter();
  const audio1Ref = useRef(null);
  const audio2Ref = useRef(null);
  const sonandoRef = useRef(null);
  const ultimoToqueRef = useRef(0);

  const [activo, setActivo] = useState(false);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState(crearEstadoInicial);
  const estadoRef = useRef(estado);
  const historialRef = useRef([]);
  const [inicio, setInicio] = useState(null);
  const [ahora, setAhora] = useState(0);
  const [eventos, setEventos] = useState([]);
  const [distribucion, setDistribucion] = useState("games-arriba");

  const minutos = inicio ? Math.max(0, Math.floor((ahora - inicio) / 60000)) : 0;

  // Reloj de la página (para los minutos jugados).
  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activo]);

  // Al salir de la página, soltar el control de reproducción.
  useEffect(() => () => detener(), []);

  // Título del reloj: se "cambia de tema" en cada cambio de marcador y una
  // vez por minuto (dep. minutos).
  useEffect(() => {
    if (!activo) return;
    const { titulo, subtitulo } = textosReloj(estado, minutos, distribucion);
    const sale = sonandoRef.current;
    const entra = sale === audio1Ref.current ? audio2Ref.current : audio1Ref.current;
    if (!entra) return;
    entra.currentTime = 0;
    entra
      .play()
      .then(() => {
        if (sale && sale !== entra) sale.pause();
        sonandoRef.current = entra;
        navigator.mediaSession.metadata = new MediaMetadata({ title: titulo, artist: subtitulo, album: "Marcadorcito" });
        navigator.mediaSession.playbackState = "playing";
      })
      .catch(() => {});
  }, [estado, minutos, activo, distribucion]);

  function anotar(texto) {
    const hora = new Date().toLocaleTimeString("es-AR");
    setEventos((ev) => [{ texto, hora, id: Date.now() + Math.random() }, ...ev].slice(0, 12));
  }

  function notificar(titulo, cuerpo) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification(titulo, { body: cuerpo, tag: "marcadorcito", renotify: true, vibrate: [150, 80, 150], icon: "/pwa-icon?size=192" }))
      .catch(() => {});
  }

  function cambiarEstado(nuevo) {
    estadoRef.current = nuevo;
    setEstado(nuevo);
  }

  function punto(lado) {
    const actual = estadoRef.current;
    if (actual.finalizado) return;
    historialRef.current = [...historialRef.current, actual].slice(-50);
    const { estado: nuevo, eventos: evs } = sumarPunto(actual, lado);
    cambiarEstado(nuevo);
    const evPartido = evs.find((e) => e.tipo === "partido");
    const evSet = evs.find((e) => e.tipo === "set");
    const evJuego = evs.find((e) => e.tipo === "juego");
    if (evPartido) {
      // Único aviso al reloj: el final (en la prueba, "vos" = pareja A).
      const detalle = `${nuevo.setsA.map((g, i) => `${g}-${nuevo.setsB[i]}`).join("  ")} · ⏱️ ${minutos}'`;
      notificar(evPartido.ganador === "A" ? "🏆 ¡Ganaste!" : "Perdiste", detalle);
      anotar(`🏁 Partido para ${evPartido.ganador} (${detalle})`);
    } else if (evSet) {
      anotar(`🏆 Set para ${evSet.ganador}`);
    } else if (evJuego) {
      const gA = nuevo.setsA[nuevo.setsA.length - 1];
      const gB = nuevo.setsB[nuevo.setsB.length - 1];
      anotar(`🎾 Game para ${evJuego.ganador} (${gA}-${gB})`);
    } else {
      anotar(`Punto ${lado}`);
    }
    if (navigator.vibrate) navigator.vibrate(60);
  }

  function deshacer() {
    const previo = historialRef.current.pop();
    if (!previo) return;
    cambiarEstado(previo);
    anotar("↩️ Deshacer");
    if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
  }

  function reiniciar() {
    historialRef.current = [];
    cambiarEstado(crearEstadoInicial());
    setInicio(Date.now());
    setEventos([]);
  }

  async function iniciar() {
    setError(null);
    if (!("mediaSession" in navigator)) {
      setError("Este navegador no soporta control de reproducción. Probá con Chrome en Android.");
      return;
    }
    try {
      const a1 = audio1Ref.current;
      a1.loop = true;
      audio2Ref.current.loop = true;
      await a1.play();
      sonandoRef.current = a1;

      const conAntiRebote = (fn) => () => {
        const t = Date.now();
        if (t - ultimoToqueRef.current >= 1000) {
          ultimoToqueRef.current = t;
          fn();
        }
        sonandoRef.current?.play().catch(() => {});
        navigator.mediaSession.playbackState = "playing";
      };
      const acciones = {
        nexttrack: conAntiRebote(() => punto("A")),
        previoustrack: conAntiRebote(() => punto("B")),
        pause: conAntiRebote(deshacer),
        play: conAntiRebote(deshacer),
      };
      for (const [accion, fn] of Object.entries(acciones)) {
        try { navigator.mediaSession.setActionHandler(accion, fn); } catch {}
      }
      navigator.mediaSession.playbackState = "playing";
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      if (!inicio) setInicio(Date.now());
      setAhora(Date.now());
      setActivo(true);
    } catch (e) {
      setError(`No se pudo iniciar el audio: ${e.message}`);
    }
  }

  function detener() {
    audio1Ref.current?.pause();
    audio2Ref.current?.pause();
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      for (const accion of ["nexttrack", "previoustrack", "pause", "play"]) {
        try { navigator.mediaSession.setActionHandler(accion, null); } catch {}
      }
      navigator.mediaSession.playbackState = "none";
    }
    setActivo(false);
  }

  const { textoA, textoB } = formatearPuntos(estado);
  const { a: setsA, b: setsB } = setsGanados(estado.setsA, estado.setsB);
  const gamesA = estado.setsA[estado.setsA.length - 1];
  const gamesB = estado.setsB[estado.setsB.length - 1];
  const vistaReloj = textosReloj(estado, minutos, distribucion);

  return (
    <div className="w-full max-w-md bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">
          ⌚ Simulador modo Reloj <span className="text-xs text-muted font-normal">v14</span>
        </h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          Volver
        </button>
      </div>

      <audio ref={audio1Ref} src="/sonidos/silencio.wav" preload="auto" />
      <audio ref={audio2Ref} src="/sonidos/silencio2.wav" preload="auto" />

      <p className="text-sm text-muted">
        En el reloj: <b>⏭️ punto A</b> · <b>⏮️ punto B</b> · <b>⏸️ deshacer</b>. Al terminar el partido te vibra la muñeca con el resultado (acá vos sos la pareja A).
      </p>

      <div className="flex gap-2">
        <button
          onClick={activo ? detener : iniciar}
          className={`flex-1 font-heading font-semibold px-4 py-3 rounded-full border-2 border-outline cursor-pointer ${activo ? "bg-bg text-ink" : "bg-accent text-accent-ink"}`}
        >
          {activo ? "Detener" : "Iniciar"}
        </button>
        <button
          onClick={reiniciar}
          className="font-heading font-semibold px-4 py-3 rounded-full bg-bg text-ink border-2 border-outline cursor-pointer"
        >
          Reiniciar
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-1.5 bg-bg rounded-[14px] p-3">
        <span className="text-xs text-muted uppercase tracking-wide">Cómo se reparte en el reloj</span>
        {DISTRIBUCIONES.map(([valor, texto]) => (
          <label key={valor} className="text-sm flex items-center gap-2 cursor-pointer">
            <input type="radio" name="distribucion" checked={distribucion === valor} onChange={() => setDistribucion(valor)} />
            {texto}
          </label>
        ))}
      </div>

      {/* Mini marcador */}
      <div className="bg-[#0f2a1f] text-white rounded-[16px] p-4 flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center text-sm opacity-70">
          <span></span><span>Sets</span><span>Games</span><span className="text-right">{estado.tiebreak ? "TB" : "Puntos"}</span>
        </div>
        {[["A", "⏭️", setsA, gamesA, textoA], ["B", "⏮️", setsB, gamesB, textoB]].map(([lado, icono, s, g, p]) => (
          <div key={lado} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center">
            <span className="font-heading font-semibold">Pareja {lado} {estado.saque === lado && !estado.finalizado && <span className="text-[#e8ff5a]">●</span>} <span className="text-xs opacity-60">{icono}</span></span>
            <span className="font-heading text-2xl tabular-nums text-center">{s}</span>
            <span className="font-heading text-2xl tabular-nums text-center">{g}</span>
            <span className="font-heading text-4xl font-bold tabular-nums text-right min-w-[3ch]">{p}</span>
          </div>
        ))}
        <span className="text-xs opacity-60">{estado.finalizado ? "Partido terminado" : `Minutos jugados: ${minutos}'`}</span>
      </div>

      {/* Lo que debería verse en el reloj */}
      <div className="bg-black text-white rounded-[24px] p-4 flex flex-col items-center gap-1 mx-auto w-56">
        <span className="text-[10px] opacity-50 uppercase tracking-wide">Así se ve en el reloj</span>
        <span className="font-semibold text-center">{vistaReloj.titulo}</span>
        <span className="text-xs opacity-80 text-center">{vistaReloj.subtitulo}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted uppercase tracking-wide">Últimos toques</span>
        {eventos.length === 0 ? (
          <span className="text-sm text-muted">{activo ? "Tocá un botón del reloj..." : "Tocá Iniciar para empezar."}</span>
        ) : (
          eventos.map((e) => (
            <span key={e.id} className="text-sm">{e.hora} — {e.texto}</span>
          ))
        )}
      </div>
    </div>
  );
}
