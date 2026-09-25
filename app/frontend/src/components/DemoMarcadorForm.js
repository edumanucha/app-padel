"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/Marcador.module.css";
import DotDigit from "@/components/DotDigit";
import AvisoGirarTelefono from "@/components/AvisoGirarTelefono";

// Demo autoplay del Marcadorcito (US-2.7): réplica fiel del marcador real
// (mismas clases de Marcador.module.css, mismo DotDigit) que juega sola un
// guion prearmado de puntos para mostrar cómo se va a ver y sentir el
// marcador con manos libres, ANTES de pedirle a nadie que arme un partido
// de verdad. Portado del mockup aprobado como Artifact (cf047cf4) -- acá
// nomás se muestra el preview; los modos Cámara/Voz todavía no están
// conectados a la cámara/mic real (eso es un paso aparte).

const JUGADORES = { A: "Vos y tu compañero/a", B: "Rival 1 y Rival 2" };

function terminoElGame(a, b) {
  return Math.max(a, b) >= 4 && Math.abs(a - b) >= 2;
}
function etiquetaPunto(propio, rival) {
  if (propio >= 3 && rival >= 3) return propio === rival ? "40" : propio > rival ? "AD" : "40";
  return ["0", "15", "30", "40"][Math.min(propio, 3)];
}

// Guion prearmado (a propósito, no random): en cada vuelta muestra un punto
// normal, un deuce/ventaja, un deshacer y un game ganado -- lo que "vende"
// el efecto visual, sin depender del azar.
const GUION = ["A", "A", "B", "A", "B", "B", "A", "B", "undo", "A", "A", "B", "A", "A"];

const MODOS = [
  {
    label: "✊ Cámara",
    textos: [
      "✋ Modo Cámara: mano abierta a la derecha suma el punto a tu equipo",
      "✋ Mano abierta a la izquierda suma el punto al equipo rival",
      "👎 Pulgar solo (para arriba o para abajo) deshace el último punto",
      "👀 Mientras sostenés la seña, un anillo te confirma que se está leyendo",
    ],
  },
  {
    label: "🗣️ Voz",
    textos: [
      '🗣️ Modo Voz: decí "marcador punto a", "marcador punto b" o "marcador deshacer"',
      '🎙️ También podés decir "marcador 40-15" para corregir todo de una',
    ],
  },
  {
    label: "🔘 Botones",
    textos: ["🔘 Modo Botones: el marcador de siempre, como respaldo si hace falta"],
  },
];

export default function DemoMarcadorForm() {
  const router = useRouter();

  // Estado del guion: vive en un ref (no en useState) porque se actualiza
  // varias veces por segundo desde un setInterval y necesitamos leer/escribir
  // el valor MÁS RECIENTE en cada paso -- con useState normal, el callback
  // del interval quedaría con el valor de la primera vez que se creó
  // (closure vieja). Un `tick` aparte fuerza el re-render para que DotDigit
  // muestre los valores nuevos.
  const estadoRef = useRef({ pA: 0, pB: 0, sA: [0], sB: [0], saque: "A" });
  const snapshotsRef = useRef([]);
  const pasoRef = useRef(0);
  const [, forceRender] = useReducer((x) => x + 1, 0);

  const [modoIdx, setModoIdx] = useState(0);
  const [textoIdx, setTextoIdx] = useState(0);
  const [explicacionVisible, setExplicacionVisible] = useState(true);

  const boardRef = useRef(null);
  const ladoARef = useRef(null);
  const ladoBRef = useRef(null);
  const numARef = useRef(null);
  const numBRef = useRef(null);
  const ballRef = useRef(null);
  const bigTextRef = useRef(null);
  // Cápsula "Leyendo seña..." que se va llenando (2026-09-18) -- mismo
  // componente visual que el marcador real (Marcador.module.css), pero
  // acá el llenado se anima con un tween de 0.8s en vez de seguir el
  // progreso cuadro a cuadro de una cámara real, porque el guion es
  // prearmado (ver mostrarLeyendoYLuego). Solo se muestra mientras el
  // chip "✊ Cámara" está activo, para no confundir durante Voz/Botones.
  const leyendoOverlayRef = useRef(null);
  const leyendoRellenoRef = useRef(null);
  const leyendoIconRef = useRef(null);
  const leyendoAccionRef = useRef(null);
  const modoIdxRef = useRef(0);

  const COLOR_ACCION_DEMO = {
    A: { fondo: "#3fd0c7", tinta: "#062421" },
    B: { fondo: "#f2955f", tinta: "#331002" },
    undo: { fondo: "#ef5b50", tinta: "#ffffff" },
  };

  // Animaciones "fire and forget" disparadas por classList directo (mismo
  // patrón que PruebaManosLibresForm.js): así se pueden repetir aunque el
  // mismo equipo sume dos veces seguidas, cosa que React no permite si solo
  // cambia el estado y la clase queda igual.
  function efectoPunto(accion, opts = {}) {
    const lado = accion === "A" ? ladoARef.current : ladoBRef.current;
    const num = accion === "A" ? numARef.current : numBRef.current;
    const ball = ballRef.current;
    const bigText = bigTextRef.current;
    if (!lado || !num || !ball) return;

    num.classList.remove(styles.pop);
    void num.offsetWidth;
    num.classList.add(styles.pop);

    lado.classList.remove(styles.flashA, styles.flashB);
    void lado.offsetWidth;
    lado.classList.add(accion === "A" ? styles.flashA : styles.flashB);

    ball.classList.remove(styles.toA, styles.toB);
    void ball.offsetWidth;
    ball.style.opacity = 0;
    ball.classList.add(accion === "A" ? styles.toA : styles.toB);

    // En el segmento de Cámara la cápsula ya mostró su propia
    // confirmación (mostrarLeyendoYLuego) -- no duplicamos con el
    // cartel genérico.
    if (!opts.skipBigText && bigText) {
      bigText.classList.remove(styles.showA, styles.showB, styles.showUndo, styles.showGame);
      void bigText.offsetWidth;
      bigText.textContent = `¡PUNTO ${accion}!`;
      bigText.classList.add(accion === "A" ? styles.showA : styles.showB);
    }
  }

  function efectoDeshacer(opts = {}) {
    const box = boardRef.current;
    const bigText = bigTextRef.current;
    if (!box) return;
    box.classList.remove(styles.shake);
    void box.offsetWidth;
    box.classList.add(styles.shake);

    if (!opts.skipBigText && bigText) {
      bigText.classList.remove(styles.showA, styles.showB, styles.showUndo, styles.showGame);
      void bigText.offsetWidth;
      bigText.textContent = "DESHACER";
      bigText.classList.add(styles.showUndo);
    }
  }

  function efectoGame(accion) {
    const bigText = bigTextRef.current;
    if (!bigText) return;
    bigText.classList.remove(styles.showA, styles.showB, styles.showUndo, styles.showGame);
    void bigText.offsetWidth;
    bigText.textContent = `¡GAME ${accion}!`;
    bigText.classList.add(styles.showGame);
  }

  // Muestra la cápsula "Leyendo seña..." llenándose de 0 a 100% en 0.8s
  // (mismo umbral que el real, GESTO_HOLD_MIN_MS en MarcadorForm.js),
  // al llegar al 100% la transforma en la confirmación un instante, y
  // recién ahí ejecuta `cb` (el punto/deshacer de verdad) -- solo cuando
  // el chip activo es "✊ Cámara"; en Voz/Botones el punto se aplica al
  // toque, igual que en el marcador real. Usa una transición CSS de
  // `transform: scale()` sobre `.leyendoRelleno` (no un `radial-gradient`
  // reescrito por JS a mano): más liviano y sin el "se traba" que tenía
  // la primera versión en el celular real.
  function mostrarLeyendoYLuego(accion, cb) {
    const overlay = leyendoOverlayRef.current;
    const relleno = leyendoRellenoRef.current;
    const icono = leyendoIconRef.current;
    const etiqueta = leyendoAccionRef.current;
    if (!overlay || !relleno || !icono || !etiqueta || modoIdxRef.current !== 0) {
      cb();
      return;
    }
    const { fondo, tinta } = COLOR_ACCION_DEMO[accion];
    icono.textContent = accion === "undo" ? "👎" : "✋";
    etiqueta.textContent = accion === "undo" ? "Deshacer" : `Punto ${accion}`;
    relleno.style.backgroundColor = fondo;
    relleno.style.transition = "none";
    relleno.style.transform = "scale(0)";
    overlay.classList.remove(styles.leyendoConfirmado);
    overlay.classList.add(styles.leyendoVisible);
    void relleno.offsetWidth;
    relleno.style.transition = "transform 0.8s linear";
    relleno.style.transform = "scale(1)";

    setTimeout(() => {
      icono.textContent = "✅";
      etiqueta.textContent = accion === "undo" ? "¡DESHECHO!" : `¡PUNTO ${accion}!`;
      overlay.style.color = tinta;
      overlay.classList.add(styles.leyendoConfirmado);
      setTimeout(() => {
        overlay.classList.remove(styles.leyendoVisible, styles.leyendoConfirmado);
        overlay.style.color = "";
        relleno.style.transition = "none";
        relleno.style.transform = "scale(0)";
        cb();
      }, 500);
    }, 800);
  }

  function paso() {
    const accion = GUION[pasoRef.current % GUION.length];
    pasoRef.current += 1;

    mostrarLeyendoYLuego(accion, () => {
      const e = estadoRef.current;
      const skipBigText = modoIdxRef.current === 0;

      if (accion === "undo") {
        const snap = snapshotsRef.current.pop();
        efectoDeshacer({ skipBigText });
        if (snap) estadoRef.current = snap;
        forceRender();
        return;
      }

      snapshotsRef.current.push({ pA: e.pA, pB: e.pB, sA: [...e.sA], sB: [...e.sB], saque: e.saque });
      efectoPunto(accion, { skipBigText });

      const nuevoA = accion === "A" ? e.pA + 1 : e.pA;
      const nuevoB = accion === "B" ? e.pB + 1 : e.pB;

      if (terminoElGame(nuevoA, nuevoB)) {
        const ganador = nuevoA > nuevoB ? "A" : "B";
        estadoRef.current = { ...e, pA: nuevoA, pB: nuevoB };
        forceRender();
        setTimeout(() => {
          const actual = estadoRef.current;
          const sA = ganador === "A" ? [...actual.sA.slice(0, -1), actual.sA[actual.sA.length - 1] + 1] : actual.sA;
          const sB = ganador === "B" ? [...actual.sB.slice(0, -1), actual.sB[actual.sB.length - 1] + 1] : actual.sB;
          estadoRef.current = { pA: 0, pB: 0, sA, sB, saque: actual.saque === "A" ? "B" : "A" };
          efectoGame(ganador);
          forceRender();
        }, 550);
      } else {
        estadoRef.current = { ...e, pA: nuevoA, pB: nuevoB };
        forceRender();
      }
    });
  }

  useEffect(() => {
    modoIdxRef.current = modoIdx;
  }, [modoIdx]);

  useEffect(() => {
    const timerPaso = setInterval(paso, 1900);
    return () => clearInterval(timerPaso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timerModo = setInterval(() => {
      setExplicacionVisible(false);
      setTimeout(() => {
        setTextoIdx((prevTexto) => {
          const modo = MODOS[modoIdx];
          const siguienteTexto = prevTexto + 1;
          if (siguienteTexto >= modo.textos.length) {
            setModoIdx((prevModo) => (prevModo + 1) % MODOS.length);
            return 0;
          }
          return siguienteTexto;
        });
        setExplicacionVisible(true);
      }, 150);
    }, 7000);
    return () => clearInterval(timerModo);
  }, [modoIdx]);

  const { pA, pB, sA, sB, saque } = estadoRef.current;

  return (
    <>
      <AvisoGirarTelefono />
      <div className={`w-full flex flex-col gap-3 items-center ${styles.contenidoMarcador}`}>
      <div className="w-full max-w-[1180px] flex items-center justify-between">
        <button
          onClick={() => router.push("/marcador-libre")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          Volver
        </button>
        <span className="font-heading text-sm text-muted">Demo del Marcadorcito</span>
        <span style={{ width: 76 }} />
      </div>

      <div className={styles.board} ref={boardRef}>
        <div className={styles.header}>
          <div>
            <div className={styles.matchLabel}>Cancha de ejemplo</div>
            <div className={styles.matchSub}>
              Set {sA.length} · Sacan {JUGADORES[saque]}
            </div>
          </div>
          <div className={styles.statusCluster}>
            <span className={`${styles.pill} ${styles.pillMic}`}>
              <span className={styles.pillDot} />
              Demo
            </span>
          </div>
        </div>

        <div className={styles.tableHead}>
          <span>Ant.</span>
          <span className={styles.playersHead}>Pareja</span>
          <span>Sets</span>
          <span>Games</span>
        </div>
        <div className={styles.scoreTable}>
          <div className={styles.row} ref={ladoARef}>
            <div className={styles.prevSets}>
              {sA.slice(0, -1).map((g, i) => (
                <span key={i} className={styles.digitCell}>
                  <DotDigit valor={g} />
                </span>
              ))}
            </div>
            <div className={styles.players}>
              <span className={styles.name}>
                {saque === "A" && <span className={styles.serveBall}>●</span>}
                {JUGADORES.A}
              </span>
            </div>
            <div className={styles.bigDigit}>
              <DotDigit valor={0} />
            </div>
            <div className={styles.bigDigit}>
              <DotDigit valor={sA[sA.length - 1]} />
            </div>
          </div>
          <div className={styles.row} ref={ladoBRef}>
            <div className={styles.prevSets}>
              {sB.slice(0, -1).map((g, i) => (
                <span key={i} className={styles.digitCell}>
                  <DotDigit valor={g} />
                </span>
              ))}
            </div>
            <div className={styles.players}>
              <span className={styles.name}>
                {saque === "B" && <span className={styles.serveBall}>●</span>}
                {JUGADORES.B}
              </span>
            </div>
            <div className={styles.bigDigit}>
              <DotDigit valor={0} />
            </div>
            <div className={styles.bigDigit}>
              <DotDigit valor={sB[sB.length - 1]} />
            </div>
          </div>
        </div>

        <div className={styles.pointsHero}>
          <span className={styles.ball} ref={ballRef}>🎾</span>
          <span className={styles.bigText} ref={bigTextRef} />
          <div className={styles.leyendoOverlay} ref={leyendoOverlayRef}>
            <div className={styles.leyendoRelleno} ref={leyendoRellenoRef} />
            <span className={styles.leyendoEyebrow}>👀 Leyendo seña...</span>
            <span className={styles.leyendoIcon} ref={leyendoIconRef} />
            <span className={styles.leyendoAccion} ref={leyendoAccionRef} />
          </div>
          <span className={styles.pointsLabel}>Puntos</span>
          <div className={styles.pointsRow}>
            <div className={styles.pointsSide}>
              <span className={styles.who}>{JUGADORES.A}</span>
              <span className={styles.pointsValue} ref={numARef}>
                <DotDigit valor={etiquetaPunto(pA, pB)} />
              </span>
            </div>
            <span className={styles.pointsSep}>–</span>
            <div className={styles.pointsSide}>
              <span className={styles.who}>{JUGADORES.B}</span>
              <span className={styles.pointsValue} ref={numBRef}>
                <DotDigit valor={etiquetaPunto(pB, pA)} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1180px] flex flex-col gap-3">
        <div className={styles.modoFila}>
          {MODOS.map((modo, i) => (
            <div key={modo.label} className={`${styles.modoChip} ${i === modoIdx ? styles.modoChipOn : ""}`}>
              {modo.label}
            </div>
          ))}
        </div>
        <div className={`${styles.explicacion} ${explicacionVisible ? "" : styles.explicacionCambiando}`}>
          {MODOS[modoIdx].textos[textoIdx]}
        </div>

        <p className={styles.caption}>🔁 Demo en loop -- datos de ejemplo, no se guarda nada.</p>

        <button
          onClick={() => router.push("/marcador-libre")}
          className="font-heading font-semibold text-sm px-4 py-3 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          Listo, quiero armar mi partido 🎾
        </button>
      </div>
      </div>
    </>
  );
}
