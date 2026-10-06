"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { crearEstadoInicial, sumarPunto, formatearPuntos, setsGanados } from "@/lib/marcadorEngine";

// Herramienta de QA (2026-10-06): copia de /pruebas-distancia con el ENVÍO
// NUEVO al reloj: cada 1,5 s, con el renglón de arriba fijo (puntaje) y el de
// abajo alternando entre "Games · Sets · minutos" y "puntos Marcadorcito".
// Además lleva un registro de cada envío (hora, si anduvo o falló) y de los
// cambios de pantalla/segundo plano, para ver por qué el reloj se atrasa.
// (Base) Herramienta de QA (2026-10-04, pedido del usuario): probar con el reloj
// (1) hasta qué distancia del celu llegan sus botones y (2) que el puntaje
// se actualice bien en el reloj, con los reenvíos del Marcadorcito real.
// Usa el mismo motor de puntaje (15/30/40, games, sets, tie-break, saque) y
// el mismo modo reloj: Media Session con un silencio en loop. Siguiente =
// punto A, anterior = punto B, pausa/play = deshacer. Cada toque que le llega
// al celu suena (agudo = A, dos graves = B, medio = deshacer), vibra y se
// ilumina. El puntaje se manda al reloj igual que en el Marcadorcito: cuando
// cambia, a los 1,5 / 4 / 8 / 14 s y cada 8 s. No guarda nada.

const DISTANCIAS = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20];

// Mismo formato del reloj que el Marcadorcito ("corto-letras"): arriba el
// game en curso con ● del que saca; abajo games y sets.
function textoReloj(est, pulso = 0, minutos = 0) {
  const { textoA, textoB } = formatearPuntos(est);
  const { a, b } = setsGanados(est.setsA, est.setsB);
  const gA = est.setsA[est.setsA.length - 1];
  const gB = est.setsB[est.setsB.length - 1];
  if (est.finalizado) return { titulo: `Final ${a}-${b}`, subtitulo: est.setsA.map((g, i) => `${g}-${est.setsB[i]}`).join(" ") };
  const tb = est.tiebreak ? "TB " : "";
  const pts = est.saque === "B" ? `${tb}${textoA}-${textoB}●` : `${tb}●${textoA}-${textoB}`;
  const ptsSinSaque = `${tb}${textoA}-${textoB}`;
  return { titulo: pts, subtitulo: pulso % 2 === 0 ? `Games ${gA}-${gB} · Sets ${a}-${b} · ${minutos}'` : `${ptsSinSaque} Marcadorcito` };
}

const CADA_MS = 1500;

export default function PruebaRelojAlternaForm() {
  const router = useRouter();
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState("");
  const [estado, setEstado] = useState(crearEstadoInicial());
  const [destello, setDestello] = useState(null); // "A" | "B" | "deshacer" | "tope"
  const [distancia, setDistancia] = useState(null);
  const [registro, setRegistro] = useState([]); // { hora, tipo, metros, marcador }
  const [envios, setEnvios] = useState(0);
  const [ultimoEnvio, setUltimoEnvio] = useState("");
  const [pulso, setPulso] = useState(0);
  const [envioLog, setEnvioLog] = useState([]); // { hora, ok, texto }
  const [fallas, setFallas] = useState(0);
  const [eventosPantalla, setEventosPantalla] = useState([]);
  const inicioRef = useRef(Date.now());
  const [ahora, setAhora] = useState(Date.now());

  const audio1Ref = useRef(null);
  const audio2Ref = useRef(null);
  const sonandoRef = useRef(null);
  const ctxRef = useRef(null);
  const wakeRef = useRef(null);
  const distanciaRef = useRef(null);
  const estadoRef = useRef(estado);
  const histRef = useRef([]);
  const destelloTimerRef = useRef(null);
  const activoRef = useRef(false);

  useEffect(() => { distanciaRef.current = distancia; }, [distancia]);
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  // Cambios de visibilidad: si Chrome manda la página a segundo plano se nota acá.
  useEffect(() => {
    function alCambiar() {
      setEventosPantalla((e) => [{ hora: new Date().toLocaleTimeString("es-AR"), texto: document.visibilityState === "visible" ? "Pantalla visible" : "Pantalla oculta / segundo plano" }, ...e].slice(0, 20));
    }
    document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, []);

  function audioCtx() {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) ctxRef.current = new Ctor();
    }
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  // Sonidos fuertes para oírlos desde lejos: A = uno agudo, B = dos graves,
  // deshacer = uno medio y largo.
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

  function aplicar(tipo) {
    const actual = estadoRef.current;
    let nuevo = actual;
    if (tipo === "deshacer") {
      if (actual.finalizado) return actual;
      const previo = histRef.current.pop();
      if (previo) nuevo = previo;
    } else if (!actual.finalizado) {
      histRef.current = [...histRef.current, actual].slice(-30);
      nuevo = sumarPunto(actual, tipo).estado;
    }
    estadoRef.current = nuevo;
    setEstado(nuevo);
    return nuevo;
  }

  // Un toque llegó (del reloj o de los botones de la pantalla).
  function llego(tipo, origen = "reloj") {
    if (origen === "reloj" && !activoRef.current) return;
    const antes = estadoRef.current;
    const tope = tipo !== "deshacer" && antes.finalizado;
    const nuevo = tope ? antes : aplicar(tipo);
    beep(tipo === "deshacer" ? "otro" : tipo);
    if (navigator.vibrate) navigator.vibrate(120);
    setDestello(tope ? "tope" : tipo);
    clearTimeout(destelloTimerRef.current);
    destelloTimerRef.current = setTimeout(() => setDestello(null), 900);
    const { textoA, textoB } = formatearPuntos(nuevo);
    const hora = new Date().toLocaleTimeString("es-AR");
    setRegistro((r) => [{ hora, tipo: tope ? "tope" : tipo, origen, metros: distanciaRef.current, marcador: `${textoA}-${textoB}` }, ...r].slice(0, 80));
    // Mantener viva la "reproducción" aunque el botón sea pausa/play.
    if (origen === "reloj") {
      sonandoRef.current?.play().catch(() => {});
      navigator.mediaSession.playbackState = "playing";
    }
  }

  // Manda el puntaje al reloj: alterna entre dos audios en silencio (el reloj
  // no refresca si solo cambian los metadatos).
  useEffect(() => {
    if (!activo) return;
    const sale = sonandoRef.current;
    const entra = sale === audio1Ref.current ? audio2Ref.current : audio1Ref.current;
    if (!entra) return;
    const minutos = Math.floor((Date.now() - inicioRef.current) / 60000);
    const { titulo, subtitulo } = textoReloj(estado, pulso, minutos);
    entra.currentTime = 0;
    entra
      .play()
      .then(() => {
        if (sale && sale !== entra) sale.pause();
        sonandoRef.current = entra;
        navigator.mediaSession.metadata = new MediaMetadata({ title: titulo, artist: subtitulo, album: "Prueba del reloj" });
        navigator.mediaSession.playbackState = "playing";
        setEnvios((n) => n + 1);
        const hora = new Date().toLocaleTimeString("es-AR");
        setUltimoEnvio(hora);
        setEnvioLog((l) => [{ hora, ok: true, texto: `${titulo} | ${subtitulo}` }, ...l].slice(0, 14));
      })
      .catch((e) => {
        setFallas((n) => n + 1);
        setEnvioLog((l) => [{ hora: new Date().toLocaleTimeString("es-AR"), ok: false, texto: `FALLÓ: ${e?.name || "error"}` }, ...l].slice(0, 14));
      });
  }, [estado, activo, pulso]);

  // Envío fijo cada 1,5 s; el renglón de abajo alterna en cada envío.
  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => setPulso((n) => n + 1), CADA_MS);
    return () => clearInterval(id);
  }, [activo]);

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
      audio2Ref.current.loop = true;
      await audio.play();
      sonandoRef.current = audio;
      const acciones = {
        nexttrack: () => llego("A"),
        previoustrack: () => llego("B"),
        pause: () => llego("deshacer"),
        play: () => llego("deshacer"),
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
    const inicial = crearEstadoInicial();
    estadoRef.current = inicial;
    histRef.current = [];
    setEstado(inicial);
    setRegistro([]);
    setEnvios(0);
    setUltimoEnvio("");
    setEnvioLog([]);
    setFallas(0);
    inicioRef.current = Date.now();
  }

  useEffect(() => () => {
    apagar();
    clearTimeout(destelloTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { textoA, textoB } = formatearPuntos(estado);
  const { a: setsA, b: setsB } = setsGanados(estado.setsA, estado.setsB);
  const gA = estado.setsA[estado.setsA.length - 1];
  const gB = estado.setsB[estado.setsB.length - 1];
  const enReloj = textoReloj(estado, pulso, Math.floor((ahora - inicioRef.current) / 60000));

  // Resumen por distancia: toques del reloj que llegaron a cada una.
  const delReloj = registro.filter((r) => r.origen === "reloj");
  const resumen = DISTANCIAS.map((m) => ({ m, n: delReloj.filter((r) => r.metros === m).length })).filter((x) => x.n > 0);
  const sinDistancia = delReloj.filter((r) => r.metros == null).length;

  const fondoDestello =
    destello === "A" ? "bg-accent" : destello === "B" ? "bg-accent-2" : destello === "deshacer" || destello === "tope" ? "bg-accent-3/30" : "bg-bg";
  const mensajeDestello =
    destello === "A" ? "¡Llegó el toque: punto A!" : destello === "B" ? "¡Llegó el toque: punto B!" : destello === "deshacer" ? "Llegó pausa/play: deshacer" : destello === "tope" ? "Partido terminado: poné en cero" : "";

  return (
    <div className="w-full max-w-md flex flex-col gap-4 text-ink">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-titulo text-3xl uppercase leading-none">Prueba del reloj (envío alternado)</h1>
        <button onClick={() => router.push("/")} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
          Volver
        </button>
      </div>

      <p className="text-sm text-muted leading-relaxed">
        Dejá el celu quieto, activá la prueba y andá alejándote con el reloj puesto: <b className="text-ink">siguiente</b> = punto A,{" "}
        <b className="text-ink">anterior</b> = punto B, <b className="text-ink">pausa/play</b> = deshacer. Cada toque que llega suena, vibra y suma
        con puntaje real. Mirá el reloj: arriba tiene que estar el mismo puntaje que el celu y abajo tiene que ir cambiando cada 1,5 s entre games/sets/minutos y puntos + Marcadorcito. Si se queda quieto o atrasado, mirá abajo el registro de envíos. No guarda nada.
      </p>

      <div className={`rounded-[8px] border border-ink/15 p-4 flex flex-col items-center gap-2 transition-colors duration-200 ${fondoDestello}`}>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
          {activo ? "Esperando toques del reloj" : "Apagado"} · Sets {setsA}-{setsB} · Games {gA}-{gB}
          {estado.tiebreak ? " · Tie-break" : ""}
        </span>
        <div className="w-full flex items-center justify-around">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase text-muted">A {estado.saque === "A" && !estado.finalizado ? "●" : ""}</span>
            <span className="font-numero text-7xl leading-none">{textoA}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase text-muted">B {estado.saque === "B" && !estado.finalizado ? "●" : ""}</span>
            <span className="font-numero text-7xl leading-none">{textoB}</span>
          </div>
        </div>
        <span className="text-sm font-semibold min-h-5 text-center">{estado.finalizado ? `Ganó ${estado.ganador}` : mensajeDestello}</span>
        {estado.finalizado && mensajeDestello && <span className="text-sm font-semibold text-center">{mensajeDestello}</span>}
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

      <div className="flex flex-col gap-1.5 border-y border-ink/10 py-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Lo que se le manda al reloj</span>
        <span className="font-numero text-2xl leading-tight">{enReloj.titulo}</span>
        <span className="text-sm text-muted">{enReloj.subtitulo}</span>
        <span className="text-xs text-muted">
          {activo ? `Envíos: ${envios}${ultimoEnvio ? ` · último a las ${ultimoEnvio}` : ""}` : "Se manda cuando activás la prueba."} Si el reloj muestra otra cosa, no se actualizó.
        </span>
        {activo && (
          <span className={`text-xs font-bold ${fallas > 0 ? "text-[#dc2626]" : "text-muted"}`}>Envíos fallidos: {fallas}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">Registro de envíos (últimos 14)</span>
        {envioLog.length === 0 ? (
          <p className="text-xs text-muted">Todavía no se mandó nada.</p>
        ) : (
          envioLog.map((e, i) => (
            <div key={i} className={`flex justify-between gap-2 py-1 border-b border-ink/10 text-xs ${e.ok ? "" : "text-[#dc2626] font-bold"}`}>
              <span className="min-w-0 break-words">{e.texto}</span>
              <span className="text-muted whitespace-nowrap">{e.hora}</span>
            </div>
          ))
        )}
        {eventosPantalla.length > 0 && (
          <div className="flex flex-col pt-2">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Cambios de pantalla</span>
            {eventosPantalla.map((e, i) => (
              <div key={i} className="flex justify-between py-1 border-b border-ink/10 text-xs">
                <span>{e.texto}</span>
                <span className="text-muted">{e.hora}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Sumar desde la pantalla (para comparar)</span>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => llego("A", "pantalla")} className="rounded-[6px] bg-accent text-accent-ink font-bold py-2 cursor-pointer">
            Punto A
          </button>
          <button onClick={() => llego("B", "pantalla")} className="rounded-[6px] bg-accent-2 text-accent-2-ink font-bold py-2 cursor-pointer">
            Punto B
          </button>
          <button onClick={() => llego("deshacer", "pantalla")} className="rounded-[6px] border border-ink/15 font-bold py-2 cursor-pointer">
            Deshacer
          </button>
        </div>
      </div>

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
          Elegí la distancia antes de alejarte: cada toque del reloj queda anotado con ese número. La página no puede medirla sola.
        </p>
      </div>

      {(resumen.length > 0 || sinDistancia > 0) && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">Toques del reloj que llegaron</span>
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
              <span className={r.tipo === "deshacer" || r.tipo === "tope" ? "text-muted" : "font-bold"}>
                {r.tipo === "A" ? "Punto A" : r.tipo === "B" ? "Punto B" : r.tipo === "deshacer" ? "Deshacer" : "Ignorado (terminó)"} → {r.marcador}
                <span className="font-normal text-muted"> · {r.origen === "reloj" ? "reloj" : "pantalla"}</span>
              </span>
              <span className="text-xs text-muted whitespace-nowrap">
                {r.metros && r.origen === "reloj" ? `${r.metros} m · ` : ""}
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
