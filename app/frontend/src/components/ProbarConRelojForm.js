"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DotDigit from "@/components/DotDigit";
import PongPunto from "@/components/PongPunto";
import styles from "@/components/Marcador.module.css";
import { IconoReloj } from "@/components/Icons";
import { crearEstadoInicial, sumarPunto, formatearPuntos, setsGanados } from "@/lib/marcadorEngine";

// Página pública /probar (2026-10-05, para el MVP): el Marcadorcito de verdad
// (mismo motor de puntaje, mismo tablero, mismos botones y sonidos) para
// probarlo sin cuenta, con el reloj de quien lo prueba. Nada se guarda. Cuando
// suma un par de puntos, invita a crear la cuenta para guardar los partidos.
// El reloj funciona como en el Marcadorcito: Media Session con un silencio en
// loop; siguiente = punto A, anterior = punto B, pausa/play = deshacer.

function textoReloj(est) {
  const { textoA, textoB } = formatearPuntos(est);
  const { a, b } = setsGanados(est.setsA, est.setsB);
  const gA = est.setsA[est.setsA.length - 1];
  const gB = est.setsB[est.setsB.length - 1];
  if (est.finalizado) return { titulo: `Final ${a}-${b}`, subtitulo: est.setsA.map((g, i) => `${g}-${est.setsB[i]}`).join(" ") };
  const tb = est.tiebreak ? "TB " : "";
  const pts = est.saque === "B" ? `${tb}${textoA}-${textoB}●` : `${tb}●${textoA}-${textoB}`;
  return { titulo: pts, subtitulo: `G ${gA}-${gB} · S ${a}-${b}` };
}

export default function ProbarConRelojForm() {
  const router = useRouter();
  const [estado, setEstado] = useState(crearEstadoInicial());
  const [relojActivo, setRelojActivo] = useState(false);
  const [soporteReloj, setSoporteReloj] = useState(true);
  const [error, setError] = useState("");
  const [pongEvento, setPongEvento] = useState(null);
  const [puntosSumados, setPuntosSumados] = useState(0);
  const [cartelCerrado, setCartelCerrado] = useState(false);
  const [pulso, setPulso] = useState(0);

  const estadoRef = useRef(estado);
  const histRef = useRef([]);
  const activoRef = useRef(false);
  const ctxRef = useRef(null);
  const audio1Ref = useRef(null);
  const audio2Ref = useRef(null);
  const sonandoRef = useRef(null);
  const wakeRef = useRef(null);
  const ultimoRef = useRef({ lado: null, t: 0 });

  useEffect(() => {
    setSoporteReloj(typeof navigator !== "undefined" && "mediaSession" in navigator);
  }, []);

  // ---------- sonidos (los mismos tonos del Marcadorcito) ----------
  function audioCtx() {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) ctxRef.current = new Ctor();
    }
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }
  function tonos(lista, volumen = 0.6) {
    const ctx = audioCtx();
    if (!ctx) return;
    for (const [freq, retraso, largo] of lista) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + retraso;
      gain.gain.setValueAtTime(volumen, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + largo);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + largo + 0.02);
    }
  }
  const sonarPunto = (lado) => tonos(lado === "A" ? [[1400, 0, 0.25]] : [[500, 0, 0.2], [500, 0.28, 0.2]]);
  const sonarJuego = () => tonos([[660, 0, 0.14], [880, 0.16, 0.14], [1320, 0.32, 0.3]], 0.5);
  const sonarDeshacer = () => tonos([[900, 0, 0.5]]);

  // ---------- marcador ----------
  function accion(tipo) {
    const actual = estadoRef.current;
    if (tipo === "deshacer") {
      const previo = histRef.current.pop();
      if (!previo) return;
      estadoRef.current = previo;
      setEstado(previo);
      sonarDeshacer();
      return;
    }
    if (actual.finalizado) return;
    // Anti doble toque: el mismo lado en menos de 1 segundo cuenta una vez.
    const ahora = Date.now();
    if (ultimoRef.current.lado === tipo && ahora - ultimoRef.current.t < 1000) return;
    ultimoRef.current = { lado: tipo, t: ahora };
    histRef.current = [...histRef.current, actual].slice(-30);
    const { estado: nuevo, eventos } = sumarPunto(actual, tipo);
    estadoRef.current = nuevo;
    setEstado(nuevo);
    setPuntosSumados((n) => n + 1);
    setPongEvento({ lado: tipo, n: ahora });
    sonarPunto(tipo);
    if (eventos.some((e) => e.tipo === "juego")) setTimeout(sonarJuego, 450);
    if (navigator.vibrate) navigator.vibrate(80);
  }
  const accionRef = useRef(accion);
  accionRef.current = accion;

  // ---------- reloj ----------
  async function activarReloj() {
    setError("");
    if (!("mediaSession" in navigator)) {
      setError("Este navegador no permite controlarlo con el reloj. Probá con Chrome en Android.");
      return;
    }
    try {
      audioCtx();
      const audio = audio1Ref.current;
      audio.loop = true;
      audio2Ref.current.loop = true;
      await audio.play();
      sonandoRef.current = audio;
      const acciones = {
        nexttrack: () => accionRef.current("A"),
        previoustrack: () => accionRef.current("B"),
        pause: () => accionRef.current("deshacer"),
        play: () => accionRef.current("deshacer"),
      };
      for (const [a, fn] of Object.entries(acciones)) {
        try {
          navigator.mediaSession.setActionHandler(a, () => {
            fn();
            sonandoRef.current?.play().catch(() => {});
            navigator.mediaSession.playbackState = "playing";
          });
        } catch {
          /* nada */
        }
      }
      navigator.mediaSession.playbackState = "playing";
      activoRef.current = true;
      setRelojActivo(true);
      try {
        if (navigator.wakeLock) wakeRef.current = await navigator.wakeLock.request("screen");
      } catch {
        /* sigue sin mantener la pantalla prendida */
      }
    } catch (e) {
      setError(`No se pudo activar el reloj: ${e.message}`);
    }
  }
  function apagarReloj() {
    activoRef.current = false;
    audio1Ref.current?.pause();
    audio2Ref.current?.pause();
    if ("mediaSession" in navigator) {
      for (const a of ["nexttrack", "previoustrack", "pause", "play"]) {
        try {
          navigator.mediaSession.setActionHandler(a, null);
        } catch {
          /* nada */
        }
      }
      navigator.mediaSession.playbackState = "none";
    }
    wakeRef.current?.release?.().catch(() => {});
    wakeRef.current = null;
    setRelojActivo(false);
  }

  // Manda el marcador al reloj (alternando dos audios en silencio, como el Marcadorcito).
  useEffect(() => {
    if (!relojActivo) return;
    const sale = sonandoRef.current;
    const entra = sale === audio1Ref.current ? audio2Ref.current : audio1Ref.current;
    if (!entra) return;
    const { titulo, subtitulo } = textoReloj(estado);
    entra.currentTime = 0;
    entra
      .play()
      .then(() => {
        if (sale && sale !== entra) sale.pause();
        sonandoRef.current = entra;
        navigator.mediaSession.metadata = new MediaMetadata({ title: titulo, artist: subtitulo, album: "Padelito" });
        navigator.mediaSession.playbackState = "playing";
      })
      .catch(() => {});
  }, [estado, relojActivo, pulso]);
  useEffect(() => {
    if (!relojActivo) return;
    const tiempos = [1500, 4000, 8000, 14000].map((ms) => setTimeout(() => setPulso((n) => n + 1), ms));
    return () => tiempos.forEach(clearTimeout);
  }, [relojActivo, estado]);
  useEffect(() => {
    if (!relojActivo) return;
    const id = setInterval(() => setPulso((n) => n + 1), 8000);
    return () => clearInterval(id);
  }, [relojActivo]);
  useEffect(() => () => apagarReloj(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const { textoA, textoB } = formatearPuntos(estado);
  const { a: setsA, b: setsB } = setsGanados(estado.setsA, estado.setsB);
  const gA = estado.setsA[estado.setsA.length - 1];
  const gB = estado.setsB[estado.setsB.length - 1];
  const mostrarCartel = puntosSumados >= 2 && !cartelCerrado;

  return (
    <div className="w-full max-w-md text-ink flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">Probá el Marcadorcito</h1>
        <button onClick={() => router.push("/")} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
          Volver
        </button>
      </div>
      <p className="text-[15px] text-muted leading-relaxed -mt-1">
        Es el de verdad: sumá los puntos con los botones o, mejor, con tu reloj. No se guarda nada.
      </p>

      <div className={styles.board}>
        <div className={styles.header}>
          <div style={{ minWidth: 0 }}>
            <div className={styles.matchLabel}>Partido de prueba</div>
            <div className={styles.matchSub}>
              {estado.tiebreak ? "Tie-break" : `Set ${estado.setsA.length}`} · Sacan {estado.saque === "A" ? "Pareja A" : "Pareja B"} · Sets {setsA}-{setsB} · Games {gA}-{gB}
            </div>
          </div>
        </div>
        {estado.finalizado ? (
          <div className={styles.finalBanner}>
            Partido para la Pareja {estado.ganador}
            <span style={{ fontSize: "0.7em", opacity: 0.8 }}>Con la cuenta se guardan las estadísticas y la tarjeta del resultado.</span>
          </div>
        ) : (
          <div className={styles.pointsHero}>
            <span className={styles.pointsLabel}>{estado.tiebreak ? "Tie-break" : "Puntos"}</span>
            <div className={styles.pointsRow}>
              <div className={styles.pointsSide}>
                <span className={styles.who}>Pareja A{estado.saque === "A" ? " ●" : ""}</span>
                <span className={styles.pointsValue}>
                  <DotDigit valor={textoA} />
                </span>
              </div>
              <span className={styles.pointsSep}>–</span>
              <div className={styles.pointsSide}>
                <span className={styles.who}>Pareja B{estado.saque === "B" ? " ●" : ""}</span>
                <span className={styles.pointsValue}>
                  <DotDigit valor={textoB} />
                </span>
              </div>
            </div>
          </div>
        )}
        <div className={styles.controls} style={{ justifyContent: "center" }}>
          <div className={styles.filaControles}>
            <button className={`${styles.ctrlBtn} ${styles.ctrlBtnPunto} ${styles.ctrlPuntoA}`} onClick={() => accion("A")} disabled={estado.finalizado}>
              <span className={styles.ctrlBtnPuntoLabel}>Punto</span>
              <span className={styles.ctrlBtnPuntoNombre}>Pareja A</span>
            </button>
            <button className={`${styles.ctrlBtn} ${styles.ctrlBtnPunto} ${styles.ctrlDeshacer}`} onClick={() => accion("deshacer")}>
              <span className={styles.ctrlBtnPuntoLabel}>Deshacer</span>
              <span className={styles.ctrlDeshacerIcono} aria-hidden="true">
                ↶
              </span>
            </button>
            <button className={`${styles.ctrlBtn} ${styles.ctrlBtnPunto} ${styles.ctrlPuntoB}`} onClick={() => accion("B")} disabled={estado.finalizado}>
              <span className={styles.ctrlBtnPuntoLabel}>Punto</span>
              <span className={styles.ctrlBtnPuntoNombre}>Pareja B</span>
            </button>
          </div>
        </div>
        <div className="px-4">
          <PongPunto evento={pongEvento} />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-y border-ink/10 py-4">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Con tu reloj</span>
        {!soporteReloj ? (
          <p className="text-sm text-muted leading-relaxed">Este navegador no deja controlar el marcador con el reloj. Probá desde Chrome en un celu Android; mientras tanto, usá los botones de arriba.</p>
        ) : relojActivo ? (
          <>
            <p className="text-sm leading-relaxed">
              <b>Reloj activado.</b> Desde los controles de música de tu reloj: <b>siguiente</b> es punto A, <b>anterior</b> es punto B y <b>pausa</b> deshace. Tu reloj muestra el marcador.
            </p>
            <button onClick={apagarReloj} className="text-sm font-semibold px-3 py-2 rounded-[6px] border border-ink/15 cursor-pointer self-start">
              Apagar el reloj
            </button>
          </>
        ) : (
          <>
            <ol className="text-sm text-muted leading-relaxed list-decimal pl-5 flex flex-col gap-0.5">
              <li>Conectá tu reloj al celu por Bluetooth.</li>
              <li>Tocá el botón de abajo.</li>
              <li>Usá los controles de música del reloj.</li>
            </ol>
            <button onClick={activarReloj} className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer inline-flex items-center justify-center gap-2">
              <IconoReloj className="ico" aria-hidden /> Activar mi reloj
            </button>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-[#dc2626]">
            {error}
          </p>
        )}
        <p className="text-xs text-muted">Necesitás un reloj que controle la música del celu, y la pantalla del celu prendida.</p>
      </div>

      {mostrarCartel && (
        <div className="flex flex-col gap-3 border-2 border-ink rounded-[8px] p-4">
          <span className="font-titulo font-black uppercase text-2xl leading-none">¿Te gustó?</span>
          <p className="text-sm text-muted leading-relaxed">Creá tu cuenta gratis y guardá tus partidos, tus estadísticas y la tarjeta del resultado para compartir.</p>
          <button onClick={() => router.push("/login")} className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer">
            Crear mi cuenta
          </button>
          <button onClick={() => setCartelCerrado(true)} className="text-sm font-semibold px-3 py-2 rounded-[6px] border border-ink/15 cursor-pointer">
            Seguir probando
          </button>
        </div>
      )}
      {!mostrarCartel && (
        <button onClick={() => router.push("/login")} className="text-sm font-semibold px-3 py-2 rounded-[6px] border border-ink/15 cursor-pointer">
          Crear mi cuenta
        </button>
      )}

      <audio ref={audio1Ref} src="/sonidos/silencio.wav" preload="auto" className="hidden" />
      <audio ref={audio2Ref} src="/sonidos/silencio2.wav" preload="auto" className="hidden" />
    </div>
  );
}
