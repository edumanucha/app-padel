"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Herramienta de QA (2026-10-04, pedido del usuario): saber hasta qué
// distancia del celu llegan los botones del reloj. Solo cuenta puntos, sin
// partido ni base de datos. Usa el mismo modo reloj del Marcadorcito real
// (Media Session con un silencio en loop): siguiente = punto A, anterior =
// punto B, pausa/play = un comando más para probar. Cada vez que el celu
// recibe un toque del reloj suena un beep fuerte (agudo = A, dos graves = B),
// se ilumina la pantalla y se anota la hora, así se puede ir alejando con el
// reloj puesto y ver hasta dónde llega. El reloj también muestra el conteo
// (así se ve en la muñeca si el toque se registró).

const DISTANCIAS = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20];

export default function PruebaDistanciaRelojForm() {
  const router = useRouter();
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState("");
  const [puntosA, setPuntosA] = useState(0);
  const [puntosB, setPuntosB] = useState(0);
  const [destello, setDestello] = useState(null); // "A" | "B" | "otro"
  const [distancia, setDistancia] = useState(null);
  const [registro, setRegistro] = useState([]); // { hora, tipo, metros }

  const audio1Ref = useRef(null);
  const audio2Ref = useRef(null);
  const sonandoRef = useRef(null);
  const ctxRef = useRef(null);
  const wakeRef = useRef(null);
  const distanciaRef = useRef(null);
  const cuentaRef = useRef({ a: 0, b: 0 });
  const destelloTimerRef = useRef(null);
  const activoRef = useRef(false);

  useEffect(() => { distanciaRef.current = distancia; }, [distancia]);

  function audioCtx() {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) ctxRef.current = new Ctor();
    }
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  // Beep fuerte para oírlo desde lejos: A = uno agudo, B = dos graves,
  // otro botón = uno medio largo.
  function beep(tipo) {
    const ctx = audioCtx();
    if (!ctx) return;
    const tonos = tipo === "A" ? [[1400, 0, 0.25]] : tipo === "B" ? [[500, 0, 0.2], [500, 0.28, 0.2]] : [[900, 0, 0.5]];
    for (const [freq, retraso, largo] of tonos) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + retraso;
      gain.gain.setValueAtTime(0.6, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + largo);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + largo + 0.02);
    }
  }

  // Mismo truco del Marcadorcito: el reloj no refresca si solo cambian los
  // metadatos; se alterna entre dos audios en silencio.
  async function mostrarEnReloj() {
    try {
      const { a, b } = cuentaRef.current;
      const actual = sonandoRef.current;
      const siguiente = actual === audio1Ref.current ? audio2Ref.current : audio1Ref.current;
      siguiente.loop = true;
      await siguiente.play();
      actual?.pause();
      sonandoRef.current = siguiente;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `A ${a} · B ${b}`,
        artist: "⏭ Punto A · ⏮ Punto B",
        album: "Prueba de distancia",
      });
      navigator.mediaSession.playbackState = "playing";
    } catch {
      /* si falla el refresco, la prueba sigue contando igual */
    }
  }

  function llego(tipo) {
    if (!activoRef.current) return;
    if (tipo === "A") cuentaRef.current.a += 1;
    if (tipo === "B") cuentaRef.current.b += 1;
    setPuntosA(cuentaRef.current.a);
    setPuntosB(cuentaRef.current.b);
    beep(tipo);
    if (navigator.vibrate) navigator.vibrate(120);
    setDestello(tipo);
    clearTimeout(destelloTimerRef.current);
    destelloTimerRef.current = setTimeout(() => setDestello(null), 800);
    const hora = new Date().toLocaleTimeString("es-AR");
    setRegistro((r) => [{ hora, tipo, metros: distanciaRef.current }, ...r].slice(0, 80));
    if (tipo !== "otro") mostrarEnReloj();
    else {
      // Mantener viva la "reproducción" aunque el botón sea pausa/play.
      sonandoRef.current?.play().catch(() => {});
      navigator.mediaSession.playbackState = "playing";
    }
  }

  async function activar() {
    setError("");
    if (!("mediaSession" in navigator)) {
      setError("Este navegador no permite controlar con el reloj. Usá Chrome en Android.");
      return;
    }
    try {
      audioCtx(); // despierta el audio con este toque
      const audio = audio1Ref.current;
      audio.loop = true;
      await audio.play();
      sonandoRef.current = audio;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `A ${cuentaRef.current.a} · B ${cuentaRef.current.b}`,
        artist: "⏭ Punto A · ⏮ Punto B",
        album: "Prueba de distancia",
      });
      const acciones = {
        nexttrack: () => llego("A"),
        previoustrack: () => llego("B"),
        pause: () => llego("otro"),
        play: () => llego("otro"),
      };
      for (const [accion, fn] of Object.entries(acciones)) {
        try { navigator.mediaSession.setActionHandler(accion, fn); } catch { /* nada */ }
      }
      navigator.mediaSession.playbackState = "playing";
      activoRef.current = true;
      setActivo(true);
      try {
        if (navigator.wakeLock) wakeRef.current = await navigator.wakeLock.request("screen");
      } catch {
        /* sigue sin mantener la pantalla prendida */
      }
    } catch (e) {
      setError(`No se pudo activar: ${e.message}`);
    }
  }

  function apagar() {
    activoRef.current = false;
    audio1Ref.current?.pause();
    audio2Ref.current?.pause();
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      for (const accion of ["nexttrack", "previoustrack", "pause", "play"]) {
        try { navigator.mediaSession.setActionHandler(accion, null); } catch { /* nada */ }
      }
      navigator.mediaSession.playbackState = "none";
    }
    wakeRef.current?.release?.().catch(() => {});
    wakeRef.current = null;
    setActivo(false);
  }

  function ponerEnCero() {
    cuentaRef.current = { a: 0, b: 0 };
    setPuntosA(0);
    setPuntosB(0);
    setRegistro([]);
    if (activoRef.current) mostrarEnReloj();
  }

  useEffect(() => () => {
    apagar();
    clearTimeout(destelloTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resumen por distancia: cuántos toques llegaron a cada una.
  const resumen = DISTANCIAS.map((m) => ({ m, n: registro.filter((r) => r.metros === m).length })).filter((x) => x.n > 0);
  const sinDistancia = registro.filter((r) => r.metros == null).length;

  const fondoDestello = destello === "A" ? "bg-accent" : destello === "B" ? "bg-accent-2" : destello === "otro" ? "bg-accent-3/30" : "bg-bg";

  return (
    <div className="w-full max-w-md flex flex-col gap-4 text-ink">
      <div className="flex items-center justify-between">
        <h1 className="font-titulo text-3xl uppercase leading-none">Prueba de distancia del reloj</h1>
        <button onClick={() => router.push("/")} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
          Volver
        </button>
      </div>

      <p className="text-sm text-muted leading-relaxed">
        Dejá el celu quieto, activá la prueba y andá alejándote con el reloj puesto, tocando <b className="text-ink">siguiente</b> (punto A) y{" "}
        <b className="text-ink">anterior</b> (punto B). Cada toque que le llega al celu suena un beep fuerte (agudo = A, dos graves = B) y se ilumina la
        pantalla. Si el reloj no llega, no pasa nada. No guarda nada.
      </p>

      <div className={`rounded-[8px] border border-ink/15 p-4 flex flex-col items-center gap-2 transition-colors duration-200 ${fondoDestello}`}>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{activo ? "Esperando toques del reloj" : "Apagado"}</span>
        <div className="w-full flex items-center justify-around">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase text-muted">Punto A</span>
            <span className="font-numero text-7xl leading-none">{puntosA}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase text-muted">Punto B</span>
            <span className="font-numero text-7xl leading-none">{puntosB}</span>
          </div>
        </div>
        <span className="text-sm font-semibold h-5">
          {destello === "A" && "¡Llegó el toque: punto A!"}
          {destello === "B" && "¡Llegó el toque: punto B!"}
          {destello === "otro" && "Llegó otro botón (pausa/play)"}
        </span>
      </div>

      {!activo ? (
        <button onClick={activar} className="rounded-[6px] bg-accent text-accent-ink font-titulo uppercase text-2xl py-3 cursor-pointer">
          Activar prueba
        </button>
      ) : (
        <button onClick={apagar} className="rounded-[6px] border border-ink/15 font-bold py-3 text-[#dc2626] cursor-pointer">
          Apagar prueba
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-[#dc2626]">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">¿A cuántos metros estás? (opcional)</span>
        <div className="flex flex-wrap gap-2">
          {DISTANCIAS.map((m) => (
            <button
              key={m}
              onClick={() => setDistancia(distancia === m ? null : m)}
              aria-pressed={distancia === m}
              className={`px-3 py-1.5 rounded-[6px] border text-sm font-bold cursor-pointer ${distancia === m ? "bg-ink text-bg border-ink" : "border-ink/15"}`}
            >
              {m} m
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Elegí la distancia antes de alejarte (cada toque queda anotado con ese número) o mirá la hora de cada toque en la lista de abajo.
        </p>
      </div>

      {(resumen.length > 0 || sinDistancia > 0) && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">Toques que llegaron</span>
          {resumen.map((x) => (
            <div key={x.m} className="flex justify-between py-1.5 border-b border-ink/10 text-sm">
              <span className="font-bold">{x.m} m</span>
              <span>{x.n}</span>
            </div>
          ))}
          {sinDistancia > 0 && (
            <div className="flex justify-between py-1.5 border-b border-ink/10 text-sm">
              <span className="text-muted">Sin distancia elegida</span>
              <span>{sinDistancia}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Toques recibidos</span>
        <button onClick={ponerEnCero} className="text-xs font-semibold px-2.5 py-1 rounded-[6px] border border-ink/15 cursor-pointer">
          Poner en cero
        </button>
      </div>
      {registro.length === 0 ? (
        <p className="text-xs text-muted">Todavía no llegó ningún toque.</p>
      ) : (
        <div className="flex flex-col">
          {registro.map((r, i) => (
            <div key={i} className="flex justify-between gap-3 py-1.5 border-b border-ink/10 text-sm">
              <span className={r.tipo === "otro" ? "text-muted" : "font-bold"}>
                {r.tipo === "A" ? "Punto A (siguiente)" : r.tipo === "B" ? "Punto B (anterior)" : "Pausa / play"}
              </span>
              <span className="text-xs text-muted whitespace-nowrap">
                {r.metros ? `${r.metros} m · ` : ""}
                {r.hora}
              </span>
            </div>
          ))}
        </div>
      )}

      <audio ref={audio1Ref} src="/sonidos/silencio.wav" preload="auto" className="hidden" />
      <audio ref={audio2Ref} src="/sonidos/silencio2.wav" preload="auto" className="hidden" />
    </div>
  );
}
