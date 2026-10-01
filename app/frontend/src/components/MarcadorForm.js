"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import DotDigit from "@/components/DotDigit";
import Toggle from "@/components/Toggle";
import HojaAbajo, { PestanasHoja } from "@/components/HojaAbajo";
import { IconoGirarTelefono } from "@/components/Icons";
import { sumarPunto, setsGanados, formatearPuntos } from "@/lib/marcadorEngine";
import styles from "@/components/Marcador.module.css";
import { compartirTarjetaResultado } from "@/lib/tarjetaResultado";
import {
  usuarioActual,
  sinConexion,
  esErrorDeRed,
  leerPartidoLocal,
  guardarCopiaPartido,
  actualizarResultadoLocalGuardado,
  subirPartidoSinSenal,
} from "@/lib/marcadorOffline";

// Toggle tipo switch, con la misma paleta clara del resto de la app
// (bg-surface / text-ink / --accent) -- usado en el panel "⚙️ Opciones",
// que se reordenó y restyleó (2026-09-12, opción B elegida por el
// usuario) para dejar de ser una pared de botones oscuros sueltos y pasar
// a tarjetas claras agrupadas, coherentes con el resto de la app.
function FilaOpcion({ etiqueta, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{etiqueta}</span>
      {children}
    </div>
  );
}

// Selector de tema propio, en vez del <select> nativo (2026-09-30, bug del
// usuario: "en modo apaisado... el desplegable no está en el mismo sentido
// que el celular, se ve re mal"). El apaisado gira la pantalla con CSS,
// pero la lista de un <select> la dibuja el sistema con la orientación
// real del teléfono, así que salía de costado. Este menú es parte de la
// página y gira junto con el tablero. Va en posición absoluta para no
// sumar alto al apaisado (regla de 0px de margen).
const TEMAS = [
  { valor: "verde", texto: "Tema verde" },
  { valor: "neon", texto: "Tema neón" },
  { valor: "contraste", texto: "Alto contraste" },
];

function SelectorTema({ tema, onElegir }) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    function cerrarSiAfuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("pointerdown", cerrarSiAfuera);
    return () => document.removeEventListener("pointerdown", cerrarSiAfuera);
  }, [abierto]);

  const actual = TEMAS.find((t) => t.valor === tema) ?? TEMAS[0];
  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label="Tema del tablero"
        className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer flex items-center gap-1"
      >
        {actual.texto}
        <span aria-hidden className="text-xs">▾</span>
      </button>
      {abierto && (
        <ul
          role="listbox"
          aria-label="Tema del tablero"
          className="absolute right-0 top-full mt-1 z-50 min-w-full bg-surface text-ink rounded-[14px] shadow-xl py-1 whitespace-nowrap"
        >
          {TEMAS.map((t) => (
            <li key={t.valor}>
              <button
                type="button"
                role="option"
                aria-selected={t.valor === tema}
                onClick={() => {
                  onElegir(t.valor);
                  setAbierto(false);
                }}
                className={`w-full text-left font-heading text-sm px-4 py-2 cursor-pointer ${
                  t.valor === tema ? "font-bold text-accent-ink bg-accent" : "font-semibold"
                }`}
              >
                {t.texto}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Contenido de la hoja "¿Cómo llevamos los puntos?": 4 íconos redondos,
// el detalle del elegido y "Empezar con ...". Arranca marcado el Reloj.
function ElegirModo({ modos, bateria }) {
  const [elegido, setElegido] = useState("reloj");
  const actual = modos.find((m) => m.modo === elegido) ?? modos[0];
  return (
    <>
      <div className="flex justify-between gap-1">
        {modos.map((m) => (
          <button
            key={m.modo}
            type="button"
            onClick={() => setElegido(m.modo)}
            aria-pressed={m.modo === elegido}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          >
            <span
              className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl border-2 ${
                m.modo === elegido ? "bg-accent border-outline" : "border-black/10"
              }`}
            >
              {m.icono}
            </span>
            <span className={`text-xs ${m.modo === elegido ? "font-bold" : "text-muted"}`}>{m.nombre}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-center text-muted min-h-[2.75em]">{actual.detalle}</p>
      {bateria && !bateria.cargando && bateria.nivel < 50 && actual.modo === "camara" && (
        <p className="text-xs rounded-[12px] px-3 py-2 bg-amber-100 text-amber-900">
          🔋 Batería: {bateria.nivel}%. La cámara consume bastante: para un partido entero conviene arrancar con más de 50%.
        </p>
      )}
      <button
        type="button"
        onClick={actual.activar}
        className="rounded-full font-heading font-bold text-base py-3 bg-accent text-accent-ink border-2 border-outline cursor-pointer"
      >
        Empezar con {actual.nombre} →
      </button>
      <p className="text-xs text-center text-muted -mt-1">
        {bateria ? `🔋 ${bateria.nivel}%${bateria.cargando ? " (cargando)" : ""} · ` : ""}La pantalla queda prendida. Lo cambiás
        cuando quieras desde ⚙️.
      </p>
    </>
  );
}

const ESTADO_INICIAL = {
  setsA: [0],
  setsB: [0],
  puntosA: 0,
  puntosB: 0,
  tiebreak: false,
  tiebreakHasta: 7,
  esSuperTiebreakFinal: false,
  saque: "A",
  historial: [],
  pausado: false,
  // puntoDeOro y superTiebreak3erSet viven acá (no en `partidos`) porque
  // `resultados_partido` es la única tabla con sincronización en tiempo
  // real entre los 4 jugadores (ver suscripción más abajo) -- `partidos`
  // solo se lee una vez al entrar, así que un cambio ahí no se vería en
  // las demás pantallas sin recargar.
  puntoDeOro: false,
  superTiebreak3erSet: false,
};

function quitarAcentos(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Comando de voz "juegos X Y" (2026-09-13, a pedido del usuario, análogo
// al de corregir puntos que ya existía en el prototipo de manos libres):
// corrige de una los GAMES del set en curso, para cuando el marcador quedó
// mal por algún punto que no se escuchó/tocó bien. El reconocimiento de
// voz no siempre convierte los números a dígitos, así que se acepta la
// palabra o el dígito.
const NUMERO_JUEGO_PALABRA = { cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7 };
function numeroJuegoDesde(token) {
  if (/^\d+$/.test(token)) return Number(token);
  return NUMERO_JUEGO_PALABRA[token];
}

// Comando de voz "marcador 40 15" (2026-09-19, a pedido del usuario: "que
// corrija el juego actual" -- este SÍ existía en el prototipo de manos
// libres, `PruebaManosLibresForm.js`, pero nunca se había portado acá,
// aunque la demo del Home lo prometía). Corrige los PUNTOS del juego en
// curso (0/15/30/40), a diferencia de "marcador juegos X Y" que corrige
// los games del set. Mismo problema de siempre con el reconocimiento de
// voz: un número puede venir como dígito ("15") o como palabra
// ("cuarenta"), y a veces los dos números llegan pegados en un solo
// bloque ("4015" en vez de "40" y "15" sueltos).
const NUMERO_PUNTO_PALABRA = { cero: 0, quince: 15, treinta: 30, cuarenta: 40 };
const PUNTAJES_VALIDOS = new Set(["0", "15", "30", "40"]);
const INDICE_POR_ETIQUETA_PUNTO = { 0: 0, 15: 1, 30: 2, 40: 3 };

function separarPuntajesPegados(bloque) {
  for (let i = 1; i < bloque.length; i++) {
    const izq = bloque.slice(0, i);
    const der = bloque.slice(i);
    if (PUNTAJES_VALIDOS.has(izq) && PUNTAJES_VALIDOS.has(der)) return [Number(izq), Number(der)];
  }
  return null;
}

// Extrae dos puntajes válidos (0/15/30/40) de la frase, sean dígitos,
// palabras, o los dos números pegados en un bloque. Devuelve null si no
// encuentra dos.
function extraerDosPuntajes(texto) {
  const tokens = texto.replace(/[-–]/g, " ").split(/\s+/);
  const numeros = [];
  for (const token of tokens) {
    if (numeros.length >= 2) break;
    const limpio = token.replace(/[.,!?]/g, "");
    if (/^\d+$/.test(limpio)) {
      if (PUNTAJES_VALIDOS.has(limpio)) {
        numeros.push(Number(limpio));
      } else {
        const par = separarPuntajesPegados(limpio);
        if (par) numeros.push(...par);
      }
    } else if (limpio in NUMERO_PUNTO_PALABRA) {
      numeros.push(NUMERO_PUNTO_PALABRA[limpio]);
    }
  }
  return numeros.length >= 2 ? numeros.slice(0, 2) : null;
}

// Durante un tie-break el puntaje no es 0/15/30/40 -- es un conteo
// numérico simple (podés estar 8 a 6), así que ahí se acepta cualquier
// par de números sueltos, dígitos o palabra (0 a 7, mismo vocabulario que
// "juegos X Y" -- un tie-break rara vez pasa de ahí antes de decidirse).
function extraerDosNumerosTiebreak(texto) {
  const tokens = texto.replace(/[-–]/g, " ").split(/\s+/);
  const numeros = [];
  for (const token of tokens) {
    if (numeros.length >= 2) break;
    const limpio = token.replace(/[.,!?]/g, "");
    const n = numeroJuegoDesde(limpio);
    if (n !== undefined) numeros.push(n);
  }
  return numeros.length >= 2 ? numeros.slice(0, 2) : null;
}

// Gestos por cámara (MediaPipe Hands, on-device): constantes y umbrales
// validados en el prototipo `/pruebas-manos-libres` con pruebas reales en
// cancha (2026-09-08/10) antes de traerlos acá -- ver
// project_marcadorcito_manos_libres.md.
const REARME_GESTO_MS = 1000; // sin mano en cuadro este tiempo antes de permitir el mismo gesto de nuevo
const GESTO_HOLD_MIN_MS = 800; // el gesto tiene que sostenerse este tiempo antes de contar como decisión (subido de 700 a 800ms, 2026-09-18, a pedido del usuario: "que cueste un poco más una confusión rápida de la cámara")
const COOLDOWN_DISPARO_MS = 900; // después de CUALQUIER disparo, esperar esto antes de aceptar el próximo (tiene que ser MAYOR que GESTO_HOLD_MIN_MS o no frena nada)
const GESTO_FLICKER_TOLERANCIA_MS = 200; // cuadros sueltos sin lectura válida mientras se sostiene un gesto: se toleran hasta este tiempo antes de reiniciar la cuenta

// Identifica la FORMA de la mano (0 a 5 dedos extendidos, midiendo qué tan
// lejos queda cada punta respecto de la MUÑECA en vez de si "apunta para
// arriba" en la pantalla, así no depende de sostener la mano perfectamente
// derecha) y devuelve solo los dos estados que Marcadorcito usa como seña
// (2026-09-18, rediseño a pedido del usuario: "que no se confunda la
// seña" -- antes se distinguía 1 vs 2 vs 3 dedos, formas demasiado
// parecidas entre sí y con la mano agarrando la paleta; ahora son dos
// formas bien separadas):
// - manoAbierta: los 4 dedos (sin el pulgar) extendidos, tipo "mano
//   abierta" -- gesto de PUNTO. El lado (izquierda/derecha) decide si es
//   para el equipo A o B.
// - pulgarSolo: el pulgar extendido y AISLADO (los otros 4 cerrados),
//   sea que apunte para arriba o para abajo -- gesto de DESHACER, no
//   depende de la orientación de la mano así que funciona igual en
//   vertical y en apaisado sin necesitar otra calibración de eje.
function contarDedosExtendidos(landmarks) {
  const muneca = landmarks[0];
  const dedos = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ];
  let extendidosSinPulgar = 0;
  for (const [punta, nudillo] of dedos) {
    const distPuntaMuneca = Math.hypot(landmarks[punta].x - muneca.x, landmarks[punta].y - muneca.y);
    const distNudilloMuneca = Math.hypot(landmarks[nudillo].x - muneca.x, landmarks[nudillo].y - muneca.y);
    if (distPuntaMuneca > distNudilloMuneca * 1.15) extendidosSinPulgar++;
  }
  const distPunta = Math.hypot(landmarks[4].x - landmarks[17].x, landmarks[4].y - landmarks[17].y);
  const distBase = Math.hypot(landmarks[2].x - landmarks[17].x, landmarks[2].y - landmarks[17].y);
  let pulgarExtendido = distPunta > distBase;
  // Puño cerrado -- con o sin paleta agarrada -- no tiene que contar como
  // gesto (2026-09-14, bug real reportado: un puño agarrando la paleta
  // hacía que el pulgar, apoyado sobre el mango, se leyera "extendido"
  // por el chequeo de arriba y disparaba punto/deshacer solo). Si los
  // otros 4 dedos ya están cerrados, exigimos ADEMÁS que la punta del
  // pulgar esté realmente lejos de la punta del índice -- en un puño (con
  // o sin mango en la mano) el pulgar queda apoyado contra los dedos
  // cerrados, cerca del índice; en un gesto real de "pulgar solo" el
  // pulgar se separa bien del resto de la mano cerrada. Este mismo chequeo
  // es lo que hace que "pulgar solo" sea seguro como seña de deshacer.
  if (extendidosSinPulgar === 0 && pulgarExtendido) {
    const distPulgarIndice = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
    const escalaMano = Math.hypot(landmarks[5].x - muneca.x, landmarks[5].y - muneca.y);
    if (distPulgarIndice < escalaMano * 0.9) pulgarExtendido = false;
  }
  return {
    // >= 3 de 4 (no los 4 exactos) -- exigir los 4 dedos justos hacía que
    // un solo cuadro con un dedo mal leído (temblor de mano, ángulo,
    // sombra) reiniciara toda la cuenta de sostenido (2026-09-18, bug
    // real reportado en cancha: "a veces sostengo la mano y no termina de
    // leer el punto"). Sigue lejos de un puño (0) o de la mano agarrando
    // la paleta, así que no reabre el riesgo de falso positivo.
    manoAbierta: extendidosSinPulgar >= 3,
    pulgarSolo: extendidosSinPulgar === 0 && pulgarExtendido,
  };
}

function tiempoTranscurrido(desde) {
  if (!desde) return "00:00";
  const segundos = Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 1000));
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const dosDigitos = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${dosDigitos(h)}:${dosDigitos(m)}:${dosDigitos(s)}` : `${dosDigitos(m)}:${dosDigitos(s)}`;
}

// Marcador en vivo (US-2.7): voz con vocabulario fijo ("marcador, punto A",
// "marcador, deshacer", etc. -- ver historias-usuario-mvp.md) + respaldo
// táctil siempre visible. El estado vive en `resultados_partido` y se
// sincroniza en tiempo real entre los dispositivos de los 4 jugadores vía
// Supabase Realtime -- cualquiera de los dos parejas puede cantar el punto.
export default function MarcadorForm({ partidoId }) {
  const router = useRouter();
  const [usuarioId, setUsuarioId] = useState(null);
  const [partido, setPartido] = useState(null);
  const [equipoA, setEquipoA] = useState([]);
  const [equipoB, setEquipoB] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // Modo apaisado manual (2026-09-13, a pedido del usuario): reemplaza la
  // detección automática por orientación física (que no servía para
  // nada si el celular tiene el auto-rotate del sistema apagado) por un
  // botón -- quien lo toca ya sabe que después tiene que girar el
  // teléfono para leerlo bien.
  const [modoApaisado, setModoApaisado] = useState(false);
  // Tema visual del tablero (2026-09-13, a pedido del usuario: "poder
  // elegir otro estilo... que sea visible de todos lados") -- se guarda
  // en localStorage para que la elección no se pierda entre partidos.
  // Tercer tema (2026-09-14, a pedido del usuario): alto contraste
  // blanco/negro, pensado para cuando el sol o la falta de luz hacen
  // difícil leer el verde de siempre -- con 3 opciones un botón que solo
  // alterna ya no alcanza, pasa a ser un desplegable.
  const [tema, setTema] = useState("verde");
  useEffect(() => {
    const guardado = localStorage.getItem("marcadorcito_tema");
    if (guardado === "neon" || guardado === "contraste") setTema(guardado);
  }, []);
  function elegirTema(nuevo) {
    setTema(nuevo);
    localStorage.setItem("marcadorcito_tema", nuevo);
  }
  // Arranca en pausa (revertido a pedido del usuario, 2026-09-05 -- se
  // había probado que arranque escuchando de entrada, pero se pidió volver
  // a que el jugador lo active a mano).
  const [escuchando, setEscuchando] = useState(false);
  const [vozDisponible, setVozDisponible] = useState(false);
  // Arranca en silencio (2026-09-11, a pedido del usuario): el anuncio por
  // voz de los tantos/juegos/sets no debe empezar solo -- cada uno lo
  // activa a mano desde "⚙️ Opciones" si lo quiere.
  const [silenciado, setSilenciado] = useState(true);
  const [ahora, setAhora] = useState(Date.now());
  const [confirmandoTerminar, setConfirmandoTerminar] = useState(false);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [pestanaOpciones, setPestanaOpciones] = useState("puntos");
  const [mostrarApelar, setMostrarApelar] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [motivoApelacion, setMotivoApelacion] = useState("");
  const [enviandoApelacion, setEnviandoApelacion] = useState(false);
  const [apelacionEnviada, setApelacionEnviada] = useState(false);

  // Modo cámara (gestos con la mano, MediaPipe on-device) -- portado del
  // prototipo `/pruebas-manos-libres` a pedido del usuario (2026-09-10):
  // "en las opciones debería estar el de llevar los puntos por cámara o
  // por voz, sino para qué hicimos todas esas pruebas".
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [cargandoModeloCamara, setCargandoModeloCamara] = useState(false);
  const [errorCamara, setErrorCamara] = useState("");
  // Arranca en `true` (revertido 2026-09-11: el intento anterior de
  // arrancar en `false` estaba mal razonado y el usuario confirmó el
  // síntoma contrario -- "me toma la mano izquierda como derecha"). Con
  // cámara FRONTAL sin espejar, el frame crudo que analiza MediaPipe queda
  // invertido respecto de cómo la persona se ve a sí misma (igual que una
  // foto sin espejar vs. mirarse al espejo): la mano derecha real aparece
  // del lado "izquierda" del frame. `espejoCamara` en `true` corrige eso.
  // El checkbox sigue ahí por si algún celular/navegador ya entrega el
  // frame espejado de fábrica y hay que destildarlo.
  const [espejoCamara, setEspejoCamara] = useState(true);
  // Eje para "mano a la izquierda o derecha" en modo apaisado: confirmado
  // en cancha (2026-09-15, probado en vivo con el botón "Cambiar sentido"
  // que existió acá temporalmente) que es el eje Y invertido. Ya no hace
  // falta ni el botón de prueba ni el cuadradito de la cámara visible --
  // quedó fijo. En vertical el eje X de siempre sigue andando bien.
  const modoApaisadoRef = useRef(false);
  useEffect(() => {
    modoApaisadoRef.current = modoApaisado;
  }, [modoApaisado]);
  const [ultimoGesto, setUltimoGesto] = useState("");
  const [sonidoActivo, setSonidoActivo] = useState(true);

  // Paso explícito antes de mostrar el tablero (2026-09-11, a pedido del
  // usuario): "quiero que los puntos se lleven por la cámara, que esa
  // funcionalidad empiece activa -- que antes de pasar del formulario al
  // marcador me diga 'vamos a activar tu cámara', y pueda elegir voz o
  // gesto". Reemplaza el auto-activado silencioso de antes (que arriesgaba
  // prenderle la cámara a los 4 jugadores sin que lo pidieran) por una
  // elección real de un click, con Cámara como opción recomendada/default.
  const [modoElegido, setModoElegido] = useState(null); // null | "camara" | "voz" | "botones"

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamVideoRef = useRef(null);
  const rafGestoRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const manoAusenteDesdeRef = useRef(0);
  const ultimoConteoDisparadoRef = useRef(null);
  const ultimoDisparoTsRef = useRef(0);
  const ultimoTimestampGestoRef = useRef(0);
  const conteoActualRef = useRef(null);
  const conteoDesdeRef = useRef(0);
  // Si un cuadro suelto no detecta el gesto que se venía sosteniendo (mano
  // agarrando la paleta que tiembla, sombra, ángulo raro un instante), no
  // se reinicia la cuenta de sostenido de inmediato -- se da este margen
  // corto antes de dar por perdido el gesto (2026-09-18, bug real: "a
  // veces sostengo la mano y no termina de leer el punto").
  const gestoPerdidoDesdeRef = useRef(0);
  // Cápsula "Leyendo seña..." que se va llenando (2026-09-18) -- se
  // actualiza a mano (no por estado de React) en cada cuadro mientras se
  // sostiene un gesto válido, mismo patrón que efectoPunto/efectoDeshacer.
  const leyendoOverlayRef = useRef(null);
  const leyendoRellenoRef = useRef(null);
  const leyendoIconRef = useRef(null);
  const leyendoAccionRef = useRef(null);
  // Sonidos (mismos archivos reales que el prototipo, ver
  // project_marcadorcito_manos_libres.md) -- se leen de un ref, no del
  // estado, porque el loop de gestos arma su closure una sola vez al
  // activar la cámara y no vería un toggle de sonido cambiado después.
  const audioCtxRef = useRef(null);
  const sonidoActivoRef = useRef(true);
  useEffect(() => {
    sonidoActivoRef.current = sonidoActivo;
  }, [sonidoActivo]);

  function obtenerAudioCtx() {
    if (!audioCtxRef.current) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) audioCtxRef.current = new AudioContextCtor();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }
  function sonarError() {
    if (!sonidoActivoRef.current) return;
    const ctx = obtenerAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  // Efectos visuales (pop del puntaje, flash del lado que sumó, pelotita
  // volando, texto grande superpuesto) -- portados del prototipo y de la
  // demo (2026-09-10/11) a pedido del usuario, que notó que en el
  // Marcadorcito real solo se habían sumado los sonidos pero no las
  // animaciones que sí se ven en la demo. Se disparan por classList
  // directo (no por estado de React) para poder repetirse aunque el mismo
  // equipo sume dos veces seguidas.
  const boardRef = useRef(null);
  const ladoARef = useRef(null);
  const ladoBRef = useRef(null);
  const numARef = useRef(null);
  const numBRef = useRef(null);
  const ballRef = useRef(null);
  const bigTextRef = useRef(null);

  function efectoPunto(lado) {
    const ladoEl = lado === "A" ? ladoARef.current : ladoBRef.current;
    const num = lado === "A" ? numARef.current : numBRef.current;
    const ball = ballRef.current;
    const bigText = bigTextRef.current;
    if (!ladoEl || !num || !ball || !bigText) return;

    num.classList.remove(styles.pop);
    void num.offsetWidth;
    num.classList.add(styles.pop);

    ladoEl.classList.remove(styles.flashA, styles.flashB);
    void ladoEl.offsetWidth;
    ladoEl.classList.add(lado === "A" ? styles.flashA : styles.flashB);

    ball.classList.remove(styles.toA, styles.toB);
    void ball.offsetWidth;
    ball.style.opacity = 0;
    ball.classList.add(lado === "A" ? styles.toA : styles.toB);

    bigText.classList.remove(styles.showA, styles.showB, styles.showUndo, styles.showGame);
    void bigText.offsetWidth;
    bigText.textContent = `¡PUNTO ${lado}!`;
    bigText.classList.add(lado === "A" ? styles.showA : styles.showB);
  }

  function efectoDeshacer() {
    const box = boardRef.current;
    const bigText = bigTextRef.current;
    if (!box || !bigText) return;
    box.classList.remove(styles.shake);
    void box.offsetWidth;
    box.classList.add(styles.shake);

    bigText.classList.remove(styles.showA, styles.showB, styles.showUndo, styles.showGame);
    void bigText.offsetWidth;
    bigText.textContent = "DESHACER";
    bigText.classList.add(styles.showUndo);
  }

  // Cápsula "Leyendo seña..." (2026-09-18, rediseño a pedido del usuario:
  // "una sola cápsula, mismo tamaño siempre, que se va llenando y al
  // completarse se transforma en la confirmación") -- una mancha circular
  // (`.leyendoRelleno`) crece desde el centro de la cápsula hacia afuera
  // mientras se sostiene el gesto, y al llegar al 100% esa MISMA cápsula
  // pasa a mostrar la confirmación (mostrarConfirmacionEnCapsula), sin
  // que aparezca un cartel distinto superpuesto.
  //
  // El "se traba" que reportó el usuario en cancha (con un `transform`
  // simple + `transition` CSS, más liviano que el `radial-gradient` de la
  // primera versión, pero TODAVÍA se sentía a los saltos) tenía otra
  // causa: `actualizarOverlayLeyendo` se llama desde `frame()` del loop de
  // cámara, que corre a la velocidad de MediaPipe (`detectForVideo`) -- en
  // un celular real eso NO es un `requestAnimationFrame` fluido a 60fps,
  // es más lento y desparejo (la inferencia de la mano tarda). Cualquier
  // cosa atada 1 a 1 a ese loop hereda su propio entrecortado, sin
  // importar qué tan liviano sea lo que se dibuja.
  // Por eso el llenado ahora vive en SU PROPIO loop de rAF
  // (`loopSuavizadoLeyendo`), separado del de cámara: el loop de cámara
  // solo actualiza un "objetivo" (`leyendoObjetivoRef`, una simple
  // asignación de número, gratis), y el loop de suavizado interpola el
  // valor que se ve en pantalla hacia ese objetivo a 60fps reales,
  // independiente de cada cuántos milisegundos llegue una lectura nueva
  // de la cámara.
  const COLOR_ACCION = {
    A: { fondo: "#3fd0c7", tinta: "#062421" },
    B: { fondo: "#f2955f", tinta: "#331002" },
    deshacer: { fondo: "#ef5b50", tinta: "#ffffff" },
  };
  const CONFIRMACION_CAPSULA_MS = 1600;
  const leyendoObjetivoRef = useRef(0);
  const leyendoMostradoRef = useRef(0);
  // Mientras la confirmación está en pantalla (mostrarConfirmacionEnCapsula),
  // el loop de cámara NO puede tocar la cápsula -- si no, apenas la mano
  // seguía sostenida un cuadro más (`listo` sigue en true mientras no se
  // suelte la mano), `actualizarOverlayLeyendo` la escondía de nuevo casi
  // al instante, sin importar cuánto durara el setTimeout de la
  // confirmación (bug real: "el punto A casi no se llega a leer").
  const leyendoConfirmandoRef = useRef(false);
  // Hasta qué momento (Date.now()) la cápsula de confirmación sigue
  // ocupando el centro del tablero -- lo usa el timing de "¡GAME!" más
  // abajo para no pisarla (bug real: "el de lectura tapa el de game").
  // En 0 mientras no hay ningún gesto de cámara confirmado, así que para
  // voz/botones (que nunca tocan este ref) el cálculo da el delay de
  // siempre, sin cambiar nada para esos casos.
  const leyendoOcupadaHastaRef = useRef(0);

  useEffect(() => {
    let raf;
    function loopSuavizadoLeyendo() {
      const relleno = leyendoRellenoRef.current;
      if (relleno) {
        const objetivo = leyendoObjetivoRef.current;
        const actual = leyendoMostradoRef.current;
        const diferencia = objetivo - actual;
        const siguiente = Math.abs(diferencia) < 0.004 ? objetivo : actual + diferencia * 0.3;
        leyendoMostradoRef.current = siguiente;
        relleno.style.transform = `scale(${siguiente})`;
      }
      raf = requestAnimationFrame(loopSuavizadoLeyendo);
    }
    raf = requestAnimationFrame(loopSuavizadoLeyendo);
    return () => cancelAnimationFrame(raf);
  }, []);

  function actualizarOverlayLeyendo(accion, progreso, listo) {
    if (leyendoConfirmandoRef.current) return;
    const overlay = leyendoOverlayRef.current;
    const relleno = leyendoRellenoRef.current;
    const icono = leyendoIconRef.current;
    const etiqueta = leyendoAccionRef.current;
    if (!overlay || !relleno || !icono || !etiqueta) return;

    if (!accion || listo) {
      overlay.classList.remove(styles.leyendoVisible);
      leyendoObjetivoRef.current = 0;
      leyendoMostradoRef.current = 0;
      return;
    }
    overlay.classList.remove(styles.leyendoConfirmado);
    overlay.classList.add(styles.leyendoVisible);
    const { fondo } = COLOR_ACCION[accion === "deshacer" ? "deshacer" : accion];
    relleno.style.backgroundColor = fondo;
    leyendoObjetivoRef.current = progreso;
    if (accion === "deshacer") {
      icono.textContent = "👎";
      etiqueta.textContent = "Deshacer";
    } else {
      icono.textContent = "✋";
      etiqueta.textContent = `Punto ${accion}`;
    }
  }

  // Se llama apenas se confirma el gesto (mismo instante en que dispara
  // handleSumarPunto/handleDeshacer): la cápsula que venía llenándose se
  // "congela" sólida y muestra la confirmación un instante, en vez de
  // esconderse y dejar que aparezca el cartel genérico (bigText) en otro
  // lado -- por eso el disparador del gesto también apaga bigText para
  // este caso puntual (ver loopGesto).
  function mostrarConfirmacionEnCapsula(accion) {
    const overlay = leyendoOverlayRef.current;
    const relleno = leyendoRellenoRef.current;
    const icono = leyendoIconRef.current;
    const etiqueta = leyendoAccionRef.current;
    if (!overlay || !relleno || !icono || !etiqueta) return;
    leyendoConfirmandoRef.current = true;
    leyendoOcupadaHastaRef.current = Date.now() + CONFIRMACION_CAPSULA_MS;
    const { fondo, tinta } = COLOR_ACCION[accion === "deshacer" ? "deshacer" : accion];
    relleno.style.backgroundColor = fondo;
    leyendoObjetivoRef.current = 1;
    leyendoMostradoRef.current = 1;
    relleno.style.transform = "scale(1)";
    overlay.style.color = tinta;
    icono.textContent = "✅";
    etiqueta.textContent = accion === "deshacer" ? "¡DESHECHO!" : `¡PUNTO ${accion}!`;
    overlay.classList.add(styles.leyendoVisible, styles.leyendoConfirmado);
    // 1.6s (antes 0.9s, a pedido del usuario: "casi no se llegan a
    // leer") -- tiempo que queda la confirmación sólida en pantalla
    // antes de esconderse. `leyendoConfirmandoRef` bloquea a
    // `actualizarOverlayLeyendo` durante esta ventana -- si no, el loop
    // de cámara la tapaba con el ícono de "leyendo" (✋) casi al
    // instante en cuanto la mano seguía sostenida un cuadro más.
    setTimeout(() => {
      leyendoConfirmandoRef.current = false;
      overlay.classList.remove(styles.leyendoVisible, styles.leyendoConfirmado);
      overlay.style.color = "";
      leyendoObjetivoRef.current = 0;
      leyendoMostradoRef.current = 0;
      relleno.style.transform = "scale(0)";
    }, CONFIRMACION_CAPSULA_MS);
  }

  function efectoGame(lado) {
    const ladoEl = lado === "A" ? ladoARef.current : ladoBRef.current;
    const num = lado === "A" ? numARef.current : numBRef.current;
    const ball = ballRef.current;
    const bigText = bigTextRef.current;
    if (!ladoEl || !num || !ball || !bigText) return;

    num.classList.remove(styles.pop);
    void num.offsetWidth;
    num.classList.add(styles.pop);

    ladoEl.classList.remove(styles.flashA, styles.flashB);
    void ladoEl.offsetWidth;
    ladoEl.classList.add(lado === "A" ? styles.flashA : styles.flashB);

    ball.classList.remove(styles.toA, styles.toB);
    void ball.offsetWidth;
    ball.style.opacity = 0;
    ball.classList.add(lado === "A" ? styles.toA : styles.toB);

    bigText.classList.remove(styles.showA, styles.showB, styles.showUndo, styles.showGame);
    void bigText.offsetWidth;
    bigText.textContent = `¡GAME ${lado}!`;
    bigText.classList.add(styles.showGame);
  }

  const reconocimientoRef = useRef(null);
  const escuchandoRef = useRef(false);
  const silenciadoRef = useRef(false);
  useEffect(() => {
    silenciadoRef.current = silenciado;
    if (silenciado && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [silenciado]);
  // Espejo síncrono de `resultado`, para no perder puntos por condición de
  // carrera: si se toca "+1" varias veces rápido, cada click tiene que
  // encadenar sobre el último estado ya calculado, no sobre el que React
  // todavía no terminó de re-renderizar (el estado de React solo se
  // actualiza async, entre un click y el siguiente puede no haber pasado
  // un render todavía).
  const resultadoRef = useRef(null);

  function actualizarResultadoLocal(nuevo) {
    resultadoRef.current = nuevo;
    setResultado(nuevo);
  }

  // Blindaje sin señal (2026-09-30, antes del primer partido real): cada
  // cambio se guarda PRIMERO en el celular (localStorage) como "pendiente"
  // y después se manda a Supabase. Si falla la red, queda pendiente y se
  // reintenta solo (cada 5 s y apenas vuelve la conexión); mientras haya
  // algo pendiente, un cartelito fijo avisa "sin señal". Como cada envío
  // manda el estado COMPLETO, alcanza con guardar el último (el más nuevo
  // pisa al anterior). Si la página se recarga con señal, cargarTodo()
  // recupera el pendiente y lo sube. Límite: si se recarga SIN señal, la
  // página no llega a cargar -- por eso también el Wake Lock de más abajo.
  const clavePendiente = `marcadorcito_pendiente_${partidoId}`;
  const [sinSincronizar, setSinSincronizar] = useState(false);
  const enviandoRef = useRef(false);

  function leerPendiente() {
    try {
      const crudo = localStorage.getItem(clavePendiente);
      return crudo ? JSON.parse(crudo) : null;
    } catch {
      return null;
    }
  }

  async function enviarPendiente() {
    const pendiente = leerPendiente();
    if (!pendiente || enviandoRef.current) return;
    // Partido creado sin señal y todavía no subido: se sube entero (con el
    // último estado adentro) en vez de actualizar una fila que no existe.
    const local = leerPartidoLocal(partidoId);
    if (local?.creadoSinSenal && !local.subido) {
      enviandoRef.current = true;
      const ok = await subirPartidoSinSenal(partidoId);
      enviandoRef.current = false;
      if (!ok) {
        setSinSincronizar(true);
        return;
      }
      if (leerPendiente()) enviarPendiente();
      else setSinSincronizar(false);
      return;
    }
    enviandoRef.current = true;
    const { error: updateError } = await supabase
      .from("resultados_partido")
      .update({ estado: pendiente.estado, finalizado: pendiente.finalizado, ganador: pendiente.ganador })
      .eq("partido_id", partidoId);
    enviandoRef.current = false;
    if (updateError) {
      setSinSincronizar(true);
      return;
    }
    // Solo se borra si no llegó otro punto más nuevo mientras viajaba este.
    if (leerPendiente()?.ts === pendiente.ts) {
      try { localStorage.removeItem(clavePendiente); } catch {}
      setSinSincronizar(false);
    } else {
      enviarPendiente();
    }
  }

  // Reintento automático: cada 5 s mientras haya algo pendiente, y al toque
  // cuando el celular avisa que volvió la conexión.
  useEffect(() => {
    if (!sinSincronizar) return;
    const id = setInterval(enviarPendiente, 5000);
    window.addEventListener("online", enviarPendiente);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", enviarPendiente);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinSincronizar]);

  // Pantalla siempre prendida mientras el marcador está abierto (Wake Lock
  // API, Chrome Android). El sistema la suelta sola si la app pasa a
  // segundo plano, así que se vuelve a pedir al volver a primer plano.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock = null;
    let cancelado = false;
    async function pedir() {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelado) lock.release();
      } catch {
        // sin permiso / batería muy baja: se sigue sin wake lock
      }
    }
    function alVolver() {
      if (document.visibilityState === "visible") pedir();
    }
    pedir();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", alVolver);
      if (lock) lock.release().catch(() => {});
    };
  }, []);

  // Botón/gesto "atrás" durante el partido (2026-09-30, a pedido del usuario:
  // "sin querer hago para atrás y me vuelve al formulario"). Mientras el
  // partido está en juego se agrega una entrada extra al historial (copia
  // de la actual, con el estado de Next adentro); al tocar "atrás" se cae a
  // la original -- misma URL -- y en vez de salir se pregunta. El listener va
  // en fase de captura + stopImmediatePropagation para que el router de
  // Next no se entere de ese "atrás" y no cambie de pantalla.
  const enJuego = !!resultado && !resultado.finalizado;
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const saliendoRef = useRef(false);
  useEffect(() => {
    if (!enJuego) return;
    history.pushState(history.state, "", location.href);
    function alVolverAtras(e) {
      if (saliendoRef.current) return;
      e.stopImmediatePropagation();
      setConfirmarSalida(true);
    }
    function alCerrar(e) {
      e.preventDefault();
    }
    window.addEventListener("popstate", alVolverAtras, true);
    window.addEventListener("beforeunload", alCerrar);
    return () => {
      window.removeEventListener("popstate", alVolverAtras, true);
      window.removeEventListener("beforeunload", alCerrar);
    };
  }, [enJuego]);

  function seguirEnElPartido() {
    setConfirmarSalida(false);
    history.pushState(history.state, "", location.href);
  }

  function salirDelPartido() {
    saliendoRef.current = true;
    setConfirmarSalida(false);
    history.back();
  }

  // Partido en curso: se recuerda en el celu para ofrecer "volver al
  // marcador" desde el inicio (si se salió, se cerró la app o se bloqueó).
  useEffect(() => {
    if (!resultado) return;
    try {
      if (resultado.finalizado) {
        if (localStorage.getItem("marcadorcito_en_curso") === String(partidoId)) localStorage.removeItem("marcadorcito_en_curso");
      } else {
        localStorage.setItem("marcadorcito_en_curso", String(partidoId));
      }
    } catch {
      // sin localStorage: no se ofrece volver desde el inicio
    }
  }, [resultado, partidoId]);

  // Nivel de batería para el consejo del selector de modo (solo Chrome).
  const [bateria, setBateria] = useState(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.getBattery) return;
    let bat = null;
    const actualizar = () => bat && setBateria({ nivel: Math.round(bat.level * 100), cargando: bat.charging });
    navigator.getBattery().then((b) => {
      bat = b;
      actualizar();
      b.addEventListener("levelchange", actualizar);
      b.addEventListener("chargingchange", actualizar);
    }).catch(() => {});
    return () => {
      if (bat) {
        bat.removeEventListener("levelchange", actualizar);
        bat.removeEventListener("chargingchange", actualizar);
      }
    };
  }, []);

  useEffect(() => {
    async function iniciar() {
      // Sin señal usa la sesión guardada en el celu (marcadorOffline.js).
      const user = await usuarioActual();
      if (!user) {
        // Sin señal y sin sesión guardada: la pantalla de login no se puede
        // abrir, se muestra la de "sin conexión".
        if (sinConexion()) window.location.replace("/offline");
        else router.replace("/login");
        return;
      }
      setUsuarioId(user.id);
    }
    iniciar();
  }, [router]);

  useEffect(() => {
    if (!usuarioId) return;
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId]);

  // Arma el plantel y el marcador a partir de los datos (de la base o de
  // la copia guardada en el celu).
  function aplicarPlantel(filas) {
    const nombreDe = (f) => f.perfiles?.nombre ?? f.invitado_nombre ?? "Jugador";
    setEquipoA(filas.filter((f) => f.equipo === "A").map(nombreDe));
    // En qué pareja juega el usuario (para el aviso final del modo Reloj:
    // "Ganaste"/"Perdiste"). Null si opera el marcador sin jugar.
    miEquipoRef.current = filas.find((f) => f.jugador_id === usuarioId)?.equipo ?? null;
    setEquipoB(filas.filter((f) => f.equipo === "B").map(nombreDe));
  }

  // Sin señal (2026-09-30): partido creado en el celu y todavía no subido,
  // o copia de uno que ya estaba en la base. Lo pendiente gana siempre.
  function cargarDesdeElCelu(local) {
    setPartido(local.partido);
    aplicarPlantel(local.filas);
    const pendiente = leerPendiente();
    actualizarResultadoLocal(
      pendiente
        ? { ...local.resultado, estado: pendiente.estado, finalizado: pendiente.finalizado, ganador: pendiente.ganador }
        : local.resultado
    );
    const faltaSubir = !!pendiente || (local.creadoSinSenal && !local.subido);
    setSinSincronizar(faltaSubir);
    if (pendiente) enviarPendiente();
    setCargando(false);
  }

  async function cargarTodo() {
    setCargando(true);
    setError("");

    const local = leerPartidoLocal(partidoId);
    if (local?.creadoSinSenal && !local.subido) {
      cargarDesdeElCelu(local);
      if (!leerPendiente()) subirPartidoSinSenal(partidoId).then((ok) => ok && setSinSincronizar(false));
      return;
    }

    // Las 3 lecturas iniciales no dependen entre sí (2026-09-13, arreglo
    // de performance: antes iban una atrás de la otra -- 3 viajes de ida
    // y vuelta seguidos en la pantalla de más tráfico de la app, en vez
    // de uno solo en paralelo). La única dependencia real (usar
    // partidoRes.data.punto_de_oro) aparece recién más abajo, en el
    // fallback de creación de resultadoRes, para cuando ya tenemos los
    // tres resultados.
    const [partidoRes, jugadoresRes, resultadoResInicial] = await Promise.all([
      supabase.from("partidos").select("*").eq("id", partidoId).single(),
      supabase
        .from("partido_jugadores")
        .select("id, jugador_id, invitado_nombre, equipo, estado, created_at, perfiles(nombre)")
        .eq("partido_id", partidoId)
        .eq("estado", "confirmado")
        .order("created_at", { ascending: true }),
      supabase.from("resultados_partido").select("*").eq("partido_id", partidoId).maybeSingle(),
    ]);

    if (partidoRes.error && local && esErrorDeRed(partidoRes.error)) {
      cargarDesdeElCelu(local);
      return;
    }
    if (partidoRes.error) {
      setError(`No se pudo cargar el partido: ${partidoRes.error.message}`);
      setCargando(false);
      return;
    }
    setPartido(partidoRes.data);

    if (jugadoresRes.error) {
      setError(`No se pudo cargar el plantel: ${jugadoresRes.error.message}`);
      setCargando(false);
      return;
    }

    let filas = jugadoresRes.data ?? [];
    const faltaAsignar = filas.some((f) => !f.equipo);
    if (faltaAsignar && filas.length > 0) {
      const mitad = Math.ceil(filas.length / 2);
      await Promise.all(
        filas.map((f, i) => {
          const equipo = i < mitad ? "A" : "B";
          if (f.equipo === equipo) return null;
          return supabase.from("partido_jugadores").update({ equipo }).eq("id", f.id);
        })
      );
      const refetch = await supabase
        .from("partido_jugadores")
        .select("id, jugador_id, invitado_nombre, equipo, estado, created_at, perfiles(nombre)")
        .eq("partido_id", partidoId)
        .eq("estado", "confirmado")
        .order("created_at", { ascending: true });
      filas = refetch.data ?? [];
    }

    aplicarPlantel(filas);

    let resultadoRes = resultadoResInicial;

    if (!resultadoRes.data) {
      const insertRes = await supabase
        .from("resultados_partido")
        .insert({
          partido_id: partidoId,
          // Semilla inicial de punto de oro: lo que el organizador eligió al
          // crear el partido -- de acá en adelante vive en el estado
          // sincronizado y se puede cambiar en vivo desde "⚙️ Opciones".
          estado: { ...ESTADO_INICIAL, puntoDeOro: partidoRes.data.punto_de_oro ?? false },
        })
        .select()
        .single();
      resultadoRes = insertRes;
    }

    if (resultadoRes.error) {
      setError(`No se pudo cargar el marcador: ${resultadoRes.error.message}`);
      setCargando(false);
      return;
    }

    // Copia en el celu, para poder reabrir este marcador sin señal.
    guardarCopiaPartido(partidoId, { partido: partidoRes.data, filas, resultado: resultadoRes.data });

    // Si quedó un punto sin subir (se recargó la página sin haber podido
    // sincronizar), manda lo guardado en el celular -- es más nuevo que lo
    // que tiene Supabase.
    const pendiente = leerPendiente();
    if (pendiente) {
      actualizarResultadoLocal({
        ...resultadoRes.data,
        estado: pendiente.estado,
        finalizado: pendiente.finalizado,
        ganador: pendiente.ganador,
      });
      setSinSincronizar(true);
      enviarPendiente();
    } else {
      actualizarResultadoLocal(resultadoRes.data);
    }
    setCargando(false);
  }

  // Sincronización en tiempo real entre los dispositivos de los jugadores.
  useEffect(() => {
    if (!partidoId) return;
    const channel = supabase
      .channel(`resultado-${partidoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "resultados_partido", filter: `partido_id=eq.${partidoId}` },
        (payload) => {
          // Con puntos todavía sin subir, lo local es más nuevo que lo que
          // llega del servidor: no pisarlo (se pisa recién al sincronizar).
          if (leerPendiente()) return;
          actualizarResultadoLocal(payload.new);
          const { estado, finalizado, ganador } = payload.new;
          actualizarResultadoLocalGuardado(partidoId, { estado, finalizado, ganador });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partidoId]);

  // Reloj del tiempo jugado (solo visual, no persiste).
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Elige una voz femenina en español (2026-09-05: primero se probó en
  // inglés, el usuario pidió volver a español manteniendo la voz de
  // mujer). Se recalcula cuando el navegador termina de cargar la lista de
  // voces (evento async "voiceschanged").
  const vozPreferidaRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    function elegirVoz() {
      const voces = window.speechSynthesis.getVoices();
      const esVoces = voces.filter((v) => v.lang?.toLowerCase().startsWith("es"));
      const preferida =
        esVoces.find((v) => /female/i.test(v.name)) ||
        esVoces.find((v) => /(helena|sabina|paulina|monica|mónica|esperanza|lucia|lucía|google español)/i.test(v.name)) ||
        esVoces.find((v) => /google/i.test(v.name)) ||
        esVoces[0] ||
        null;
      vozPreferidaRef.current = preferida;
    }

    elegirVoz();
    window.speechSynthesis.addEventListener("voiceschanged", elegirVoz);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", elegirVoz);
  }, []);

  const anunciar = useCallback((texto) => {
    if (silenciadoRef.current) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "es-AR";
    if (vozPreferidaRef.current) utterance.voice = vozPreferidaRef.current;
    // Tono más grave y pausado -- se acerca más a un juez de silla que a la
    // voz por defecto, que suele salir aguda y apurada.
    utterance.rate = 0.92;
    utterance.pitch = 0.85;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Notificaciones al reloj (modo "⌚ Reloj", 2026-09-30): Mi Fitness espeja
  // las notificaciones del celu al Redmi Watch, así que al terminar cada
  // game/set/partido le vibra la muñeca con el resultado. (Se probó mostrar
  // el tanteador como "título de la canción" en el reloj, pero ese reloj
  // no refresca el título -- ver /pruebas-reloj.) En Android, Chrome solo
  // deja notificar desde el service worker (sw.js ya está registrado).
  const relojActivoRef = useRef(false);
  const miEquipoRef = useRef(null);
  const notificarReloj = useCallback((titulo, cuerpo) => {
    if (!relojActivoRef.current) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then((reg) =>
        reg.showNotification(titulo, {
          body: cuerpo,
          tag: "marcadorcito",
          renotify: true,
          vibrate: [150, 80, 150],
          icon: "/pwa-icon?size=192",
        })
      )
      .catch(() => {});
  }, []);

  const nombreEquipo = useCallback(
    (lado) => (lado === "A" ? equipoA.join(" / ") : equipoB.join(" / ")) || `Pareja ${lado}`,
    [equipoA, equipoB]
  );

  // Versión para la voz (2026-09-11, a pedido del usuario): el "/" entre
  // compañeros de pareja se ve bien en pantalla, pero la síntesis de voz lo
  // lee literal como "diagonal" ("eduardo diagonal jugador"). Acá se unen
  // con "y" en vez de "/" -- solo para lo que se anuncia por voz, la
  // pantalla sigue mostrando "/".
  const nombreEquipoVoz = useCallback(
    (lado) => (lado === "A" ? equipoA.join(" y ") : equipoB.join(" y ")) || `Pareja ${lado}`,
    [equipoA, equipoB]
  );

  async function persistir(nuevoEstado, finalizado, ganador) {
    // Optimista y SÍNCRONO antes del await -- así, si llega otro click
    // (propio o de otro dispositivo) mientras este update todavía viaja a
    // la red, ya encuentra resultadoRef.current al día y encadena bien.
    const base = resultadoRef.current;
    if (base) actualizarResultadoLocal({ ...base, estado: nuevoEstado, finalizado, ganador });

    // Primero al celular, después a la red (ver "Blindaje sin señal" arriba).
    // Si falla, ya no se muestra un error que empuja el tablero: queda
    // pendiente, se reintenta solo y lo avisa el cartelito de "sin señal".
    try {
      localStorage.setItem(clavePendiente, JSON.stringify({ estado: nuevoEstado, finalizado, ganador, ts: Date.now() }));
      actualizarResultadoLocalGuardado(partidoId, { estado: nuevoEstado, finalizado, ganador });
    } catch {
      // Sin almacenamiento local (caso raro): se envía directo, como antes.
      const { error: updateError } = await supabase
        .from("resultados_partido")
        .update({ estado: nuevoEstado, finalizado, ganador })
        .eq("partido_id", partidoId);
      setSinSincronizar(!!updateError);
      return;
    }
    await enviarPendiente();
  }

  const handleSumarPunto = useCallback(
    async (lado) => {
      const actual = resultadoRef.current;
      if (!actual || actual.finalizado || actual.estado.pausado) return;
      const core = {
        setsA: actual.estado.setsA,
        setsB: actual.estado.setsB,
        puntosA: actual.estado.puntosA,
        puntosB: actual.estado.puntosB,
        tiebreak: actual.estado.tiebreak,
        tiebreakHasta: actual.estado.tiebreakHasta,
        esSuperTiebreakFinal: actual.estado.esSuperTiebreakFinal,
        saque: actual.estado.saque,
      };
      const { estado: nuevoCore, eventos } = sumarPunto(core, lado, {
        puntoDeOro: actual.estado.puntoDeOro ?? false,
        superTiebreak3erSet: actual.estado.superTiebreak3erSet ?? false,
      });
      const historial = [...(actual.estado.historial ?? []), core].slice(-30);
      const nuevoEstado = {
        setsA: nuevoCore.setsA,
        setsB: nuevoCore.setsB,
        puntosA: nuevoCore.puntosA,
        puntosB: nuevoCore.puntosB,
        tiebreak: nuevoCore.tiebreak,
        tiebreakHasta: nuevoCore.tiebreakHasta,
        esSuperTiebreakFinal: nuevoCore.esSuperTiebreakFinal,
        saque: nuevoCore.saque,
        historial,
        pausado: false,
        // Las preferencias en sí no se tocan por sumar un punto -- solo se
        // "traban" (esSuperTiebreakFinal arriba) cuando corresponde.
        puntoDeOro: actual.estado.puntoDeOro,
        superTiebreak3erSet: actual.estado.superTiebreak3erSet,
      };

      // Sin "await": persistir() ya actualiza el estado local en forma
      // síncrona (optimista) apenas se la llama, antes de su propio
      // `await` a la red -- esperarla acá solo demoraba el marcador y el
      // anuncio de voz hasta que Supabase confirmara el guardado. El
      // guardado real sigue viajando en paralelo, sin bloquear nada.
      persistir(nuevoEstado, nuevoCore.finalizado, nuevoCore.ganador);

      efectoPunto(lado);

      // Al reloj: un único aviso, al final del partido (2026-09-30, pedido
      // del usuario -- el tanteador ya se ve en vivo en el título, los avisos
      // de game/set sobraban). "Ganaste"/"Perdiste" si el usuario juega.
      {
        const evPartido = eventos.find((e) => e.tipo === "partido");
        if (evPartido) {
          const sets = nuevoCore.setsA.map((g, i) => `${g}-${nuevoCore.setsB[i]}`).join("  ");
          const desde = resultadoRef.current?.created_at ? new Date(resultadoRef.current.created_at).getTime() : Date.now();
          const min = Math.max(0, Math.floor((Date.now() - desde) / 60000));
          const duracion = min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}'` : `${min}'`;
          const detalle = `${sets} · ⏱️ ${duracion}`;
          const mio = miEquipoRef.current;
          const titulo = mio
            ? mio === evPartido.ganador ? "🏆 ¡Ganaste!" : "Perdiste"
            : `🏁 Ganó ${nombreEquipoVoz(evPartido.ganador)}`;
          notificarReloj(titulo, detalle);
        }
      }

      eventos.forEach((ev) => {
        if (ev.tipo === "juego") {
          // Se dispara un toque después del efecto de punto (mismo timing
          // que el prototipo) para que no se pisen las dos animaciones de
          // bigText sobre el mismo elemento -- pero si el punto vino de un
          // gesto de cámara, la confirmación no vive en bigText sino en la
          // cápsula (mostrarConfirmacionEnCapsula), que puede seguir
          // ocupando el centro del tablero más de esos 550ms -- se espera
          // a que termine para que no se pisen entre sí (bug real: "el de
          // lectura tapa el de game"). Para voz/botones esto no cambia
          // nada, `leyendoOcupadaHastaRef` queda en 0.
          const delayGame = Math.max(550, leyendoOcupadaHastaRef.current - Date.now());
          setTimeout(() => efectoGame(ev.ganador), delayGame);
          const { a, b } = setsGanados(nuevoCore.setsA, nuevoCore.setsB);
          anunciar(`Juego para ${nombreEquipoVoz(ev.ganador)}. ${a} a ${b}.`);
        } else if (ev.tipo === "set") {
          const { a, b } = setsGanados(nuevoCore.setsA, nuevoCore.setsB);
          anunciar(`Set para ${nombreEquipoVoz(ev.ganador)}. Sets ${a} a ${b}.`);
        } else if (ev.tipo === "partido") {
          anunciar(`Partido para ${nombreEquipoVoz(ev.ganador)}.`);
        }
      });

      if (eventos.length === 0) {
        const { textoA, textoB } = formatearPuntos(nuevoCore);
        anunciar(`${nombreEquipoVoz("A")}, ${textoA}. ${nombreEquipoVoz("B")}, ${textoB}.`);
      }
    },
    [anunciar, nombreEquipoVoz, notificarReloj]
  );

  // Pisa los games del set actual de una sola vez ("juegos 6 4"), en vez
  // de tener que deshacer y repuntuar juego por juego. Si el nuevo
  // resultado queda 6-6, arranca el tie-break -- cualquier otro caso solo
  // ajusta el número, sin reevaluar más reglas (mismo espíritu que el
  // atajo de corregir puntos del prototipo de manos libres).
  const handleCorregirJuegos = useCallback(
    async (nuevoGA, nuevoGB) => {
      const actual = resultadoRef.current;
      if (!actual || actual.finalizado || actual.estado.pausado) return;
      if (nuevoGA < 0 || nuevoGA > 7 || nuevoGB < 0 || nuevoGB > 7) return;

      const core = {
        setsA: actual.estado.setsA,
        setsB: actual.estado.setsB,
        puntosA: actual.estado.puntosA,
        puntosB: actual.estado.puntosB,
        tiebreak: actual.estado.tiebreak,
        tiebreakHasta: actual.estado.tiebreakHasta,
        esSuperTiebreakFinal: actual.estado.esSuperTiebreakFinal,
        saque: actual.estado.saque,
      };

      const setsA = [...actual.estado.setsA];
      const setsB = [...actual.estado.setsB];
      const idx = setsA.length - 1;
      setsA[idx] = nuevoGA;
      setsB[idx] = nuevoGB;
      const entrandoATiebreak = nuevoGA === 6 && nuevoGB === 6;

      const historial = [...(actual.estado.historial ?? []), core].slice(-30);
      const nuevoEstado = {
        ...actual.estado,
        setsA,
        setsB,
        puntosA: 0,
        puntosB: 0,
        tiebreak: entrandoATiebreak,
        tiebreakHasta: entrandoATiebreak ? 7 : actual.estado.tiebreakHasta,
        esSuperTiebreakFinal: entrandoATiebreak ? false : actual.estado.esSuperTiebreakFinal,
        historial,
        pausado: false,
      };

      persistir(nuevoEstado, false, null);
      anunciar(`Juegos corregidos a ${nuevoGA} a ${nuevoGB}.`);
    },
    [anunciar]
  );

  // Comando de voz "marcador 40 15" (2026-09-19, a pedido del usuario --
  // ver extraerDosPuntajes/extraerDosNumerosTiebreak arriba). Corrige los
  // PUNTOS del juego en curso, sin tocar sets/games. En tie-break los
  // números son un conteo directo (`esTiebreak=true`); fuera de
  // tie-break tienen que ser 0/15/30/40 (`INDICE_POR_ETIQUETA_PUNTO`).
  const handleCorregirPuntos = useCallback(
    async (nuevoA, nuevoB, esTiebreak) => {
      const actual = resultadoRef.current;
      if (!actual || actual.finalizado || actual.estado.pausado) return;
      if (actual.estado.tiebreak !== esTiebreak) return; // la frase no coincide con el modo actual (ej. dijo "40 15" en medio de un tie-break)

      let idxA;
      let idxB;
      if (esTiebreak) {
        if (nuevoA < 0 || nuevoA > 30 || nuevoB < 0 || nuevoB > 30) return;
        idxA = nuevoA;
        idxB = nuevoB;
      } else {
        idxA = INDICE_POR_ETIQUETA_PUNTO[nuevoA];
        idxB = INDICE_POR_ETIQUETA_PUNTO[nuevoB];
        if (idxA === undefined || idxB === undefined) return;
      }

      const core = {
        setsA: actual.estado.setsA,
        setsB: actual.estado.setsB,
        puntosA: actual.estado.puntosA,
        puntosB: actual.estado.puntosB,
        tiebreak: actual.estado.tiebreak,
        tiebreakHasta: actual.estado.tiebreakHasta,
        esSuperTiebreakFinal: actual.estado.esSuperTiebreakFinal,
        saque: actual.estado.saque,
      };
      const historial = [...(actual.estado.historial ?? []), core].slice(-30);
      const nuevoEstado = { ...actual.estado, puntosA: idxA, puntosB: idxB, historial, pausado: false };

      persistir(nuevoEstado, false, null);
      anunciar(`Puntos corregidos a ${nuevoA} a ${nuevoB}.`);
    },
    [anunciar]
  );

  async function handleDeshacer() {
    const actual = resultadoRef.current;
    if (!actual) return;
    const historial = [...(actual.estado.historial ?? [])];
    const previo = historial.pop();
    if (!previo) return;
    // `previo` es un snapshot de solo lo relativo al puntaje (ver `core` en
    // handleSumarPunto) -- las preferencias en sí (punto de oro, súper
    // tie-break) no se guardan ahí, así que se preservan tal cual están
    // ahora: deshacer un punto no debería revertir un cambio de
    // configuración no relacionado.
    const nuevoEstado = {
      ...previo,
      puntoDeOro: actual.estado.puntoDeOro,
      superTiebreak3erSet: actual.estado.superTiebreak3erSet,
      historial,
      pausado: actual.estado.pausado,
    };
    persistir(nuevoEstado, false, null);
    sonarError();
    efectoDeshacer();
    anunciar("Corregido.");
  }

  // ---------- Modo "⌚ Reloj / auriculares" (2026-09-30) ----------
  // Una página no puede leer los botones del reloj, pero sí los comandos de
  // música del sistema (Media Session API) mientras reproduce audio -- se
  // reproduce en loop un silencio de 12 s (public/sonidos/silencio.wav) y
  // se mapean: ⏭️ siguiente = punto A, ⏮️ anterior = punto B, ⏸️/▶️ =
  // deshacer. Probado con el Redmi Watch 5 Lite del usuario en
  // /pruebas-reloj (volumen +/- NO llega a la página: lo maneja el sistema).
  // Los handlers de media se registran una sola vez, por eso llaman a las
  // versiones más nuevas de sumar/deshacer a través de refs.
  const relojAudioRef = useRef(null);
  const relojAudio2Ref = useRef(null);
  // Cómo se reparten los 2 renglones del reloj (elegido en ⚙️ Opciones, se
  // recuerda en el celu). Las dos que eligió el usuario en /pruebas-reloj:
  //   "games-arriba": "Games 2-0 · Sets 0-0 · 1'" / "30-15 Marcadorcito"
  //   "puntos-solos": "30-15" / "2-0 · S 0-0 · 1' · Marcadorcito"
  // Default "corto-letras" (el favorito final del usuario, 2026-09-30): corto
  // para que ningún renglón se mueva tipo marquesina en el reloj.
  const [formatoReloj, setFormatoReloj] = useState(() => {
    if (typeof window === "undefined") return "corto-letras";
    try {
      return localStorage.getItem("marcadorcito_formato_reloj") || "corto-letras";
    } catch {
      return "corto-letras";
    }
  });
  function elegirFormatoReloj(valor) {
    setFormatoReloj(valor);
    try { localStorage.setItem("marcadorcito_formato_reloj", valor); } catch {}
  }
  // Cuál de los dos <audio> está sonando ahora (ver actualizarTituloReloj).
  const relojSonandoRef = useRef(null);
  const [relojActivo, setRelojActivo] = useState(false);
  const [errorReloj, setErrorReloj] = useState("");
  const sumarPuntoRelojRef = useRef(null);
  const deshacerRelojRef = useRef(null);
  const ultimoToqueRelojRef = useRef(0);
  const cambiarSaqueRelojRef = useRef(null);
  const esperaPausaRelojRef = useRef(null);
  useEffect(() => {
    sumarPuntoRelojRef.current = handleSumarPunto;
    deshacerRelojRef.current = handleDeshacer;
    cambiarSaqueRelojRef.current = () => {
      const actual = resultadoRef.current;
      if (!actual || actual.finalizado) return;
      handleCambiarSaque(actual.estado.saque === "A" ? "B" : "A");
      if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
    };
  });

  async function activarReloj() {
    setErrorReloj("");
    if (!("mediaSession" in navigator)) {
      setErrorReloj("Este navegador no permite controlar con el reloj. Usá Chrome en Android.");
      return;
    }
    try {
      const audio = relojAudioRef.current;
      audio.loop = true;
      relojAudio2Ref.current.loop = true;
      await audio.play();
      relojSonandoRef.current = audio;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Marcadorcito",
        artist: "⏭️ Punto A · ⏮️ Punto B · ⏸️ Deshacer · ⏸️⏸️ Saque",
        album: "Padelito",
      });
      const conAntiRebote = (fn) => () => {
        // Anti doble toque: un toque sin querer repetido cuenta una vez.
        const ahora = Date.now();
        if (ahora - ultimoToqueRelojRef.current >= 1000) {
          ultimoToqueRelojRef.current = ahora;
          fn();
        }
        // Mantener la "reproducción" viva aunque el botón sea pausa: si no,
        // el sistema saca el control y el reloj deja de mandar comandos.
        relojSonandoRef.current?.play().catch(() => {});
        navigator.mediaSession.playbackState = "playing";
      };
      // ⏯️ (2026-09-30, pedido del usuario): un toque = deshacer; dos
      // seguidos (< 0,8 s) = cambiar saque. El deshacer espera esos 0,8 s
      // por si llega el segundo toque.
      const pausaPlay = () => {
        if (esperaPausaRelojRef.current) {
          clearTimeout(esperaPausaRelojRef.current);
          esperaPausaRelojRef.current = null;
          cambiarSaqueRelojRef.current?.();
        } else {
          esperaPausaRelojRef.current = setTimeout(() => {
            esperaPausaRelojRef.current = null;
            // Al arrancar (sin nada para deshacer) un toque solo también
            // cambia el saque -- opción 1 elegida por el usuario.
            const sinHistorial = !(resultadoRef.current?.estado.historial ?? []).length;
            if (sinHistorial) cambiarSaqueRelojRef.current?.();
            else deshacerRelojRef.current?.();
          }, 800);
        }
        relojSonandoRef.current?.play().catch(() => {});
        navigator.mediaSession.playbackState = "playing";
      };
      const acciones = {
        nexttrack: conAntiRebote(() => sumarPuntoRelojRef.current?.("A")),
        previoustrack: conAntiRebote(() => sumarPuntoRelojRef.current?.("B")),
        pause: pausaPlay,
        play: pausaPlay,
      };
      for (const [accion, fn] of Object.entries(acciones)) {
        try { navigator.mediaSession.setActionHandler(accion, fn); } catch {}
      }
      navigator.mediaSession.playbackState = "playing";
      relojActivoRef.current = true;
      setRelojActivo(true);
      // Permiso para los avisos de game/set/partido en la muñeca (se pide
      // acá porque necesita un toque real del usuario).
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {
      setErrorReloj(`No se pudo activar el reloj: ${e.message}`);
    }
  }

  function desactivarReloj() {
    relojAudioRef.current?.pause();
    relojAudio2Ref.current?.pause();
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      for (const accion of ["nexttrack", "previoustrack", "pause", "play"]) {
        try { navigator.mediaSession.setActionHandler(accion, null); } catch {}
      }
      navigator.mediaSession.playbackState = "none";
    }
    relojActivoRef.current = false;
    setRelojActivo(false);
  }

  // Tanteador en vivo en el título del reloj. Cambiar solo los metadatos NO
  // alcanza con el Redmi Watch (no refresca); lo que sí funcionó en
  // /pruebas-reloj (estrategia 2, elegida por el usuario) es alternar entre
  // dos <audio>: el que entra empieza a sonar, recién ahí se pausa el otro
  // y se ponen los metadatos nuevos -- el sistema lo toma como "tema nuevo".
  // Formato pedido por el usuario (2026-09-30), en 2 renglones:
  //   "3-2 · Sets 1-0 · 45'"       (arriba: games del set · sets · minutos)
  //   "40-15 Marcadorcito"         (abajo, quieto: game en curso + la marca)
  // Los minutos salen del mismo created_at que usa el timer de la pantalla
  // y el título se refresca una vez por minuto (dep. minutosReloj).
  const minutosReloj = resultado?.created_at
    ? Math.max(0, Math.floor((ahora - new Date(resultado.created_at).getTime()) / 60000))
    : 0;
  useEffect(() => {
    if (!relojActivo || !resultado) return;
    const est = resultado.estado;
    const { textoA, textoB } = formatearPuntos(est);
    const { a, b } = setsGanados(est.setsA, est.setsB);
    const gA = est.setsA[est.setsA.length - 1];
    const gB = est.setsB[est.setsB.length - 1];
    // Renglones invertidos (pedido del usuario, 2026-09-30): arriba se mueve
    // tipo marquesina si no entra; abajo queda quieto -> ahí el tanteador.
    // ● marca quién saca (pedido del usuario): "●30-15" saca A, "30-15●" saca B.
    const tb = est.tiebreak ? "TB " : "";
    const pts = resultado.finalizado
      ? `Final ${a}-${b}`
      : est.saque === "B"
        ? `${tb}${textoA}-${textoB}●`
        : `${tb}●${textoA}-${textoB}`;
    const ptsSinSaque = resultado.finalizado ? `Final ${a}-${b}` : `${tb}${textoA}-${textoB}`;
    let [titulo, subtitulo] =
      formatoReloj === "corto-letras"
        ? [pts, `G ${gA}-${gB} · S ${a}-${b}`]
        : formatoReloj === "puntos-solos"
        ? [pts, `${gA}-${gB} · S ${a}-${b} · ${minutosReloj}' · Marcadorcito`]
        : formatoReloj === "puntos-y-todo"
          ? [`${pts} Marcadorcito`, `${ptsSinSaque} · G ${gA}-${gB} · S ${a}-${b} · ${minutosReloj}'`]
          : [`Games ${gA}-${gB} · Sets ${a}-${b} · ${minutosReloj}'`, `${pts} Marcadorcito`];
    // Pantalla final en el reloj (pedido del usuario): "Partido ganado" /
    // "Partido perdido" arriba y los games de cada set abajo, en cualquier
    // formato. Si quien opera no juega, "Ganó A"/"Ganó B".
    if (resultado.finalizado) {
      const mio = miEquipoRef.current;
      const ganador = resultado.ganador;
      titulo = mio ? (mio === ganador ? "Partido ganado" : "Partido perdido") : `Ganó ${ganador ?? ""}`.trim();
      subtitulo = est.setsA.map((g, i) => `${g}-${est.setsB[i]}`).join("  ");
    }
    const sale = relojSonandoRef.current;
    const entra = sale === relojAudioRef.current ? relojAudio2Ref.current : relojAudioRef.current;
    if (!entra) return;
    entra.currentTime = 0;
    entra
      .play()
      .then(() => {
        if (sale && sale !== entra) sale.pause();
        relojSonandoRef.current = entra;
        navigator.mediaSession.metadata = new MediaMetadata({ title: titulo, artist: subtitulo, album: "Marcadorcito" });
        navigator.mediaSession.playbackState = "playing";
      })
      .catch(() => {});
  }, [resultado, relojActivo, minutosReloj, formatoReloj]);

  // Al salir del marcador, soltar el control del reloj.
  useEffect(() => () => {
    relojAudioRef.current?.pause();
    relojAudio2Ref.current?.pause();
    if ("mediaSession" in navigator) {
      for (const accion of ["nexttrack", "previoustrack", "pause", "play"]) {
        try { navigator.mediaSession.setActionHandler(accion, null); } catch {}
      }
    }
  }, []);

  async function activarCamara() {
    obtenerAudioCtx(); // despierta el audio ahora, con un click real
    setErrorCamara("");
    setCargandoModeloCamara(true);
    try {
      const { HandLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        },
        numHands: 1,
        runningMode: "VIDEO",
      });

      // Cámara frontal (a pedido del usuario, tras probar en cancha,
      // 2026-09-10): quien anota tiene que ver su propia mano haciendo el
      // gesto, como en un selfie -- la trasera apunta para el otro lado.
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamVideoRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCargandoModeloCamara(false);
      setCamaraActiva(true);
      loopGesto();
    } catch (e) {
      setCargandoModeloCamara(false);
      setErrorCamara(`No se pudo iniciar la cámara/modelo: ${e.message}`);
    }
  }

  function loopGesto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = handLandmarkerRef.current;
    if (!video || !canvas || !landmarker) return;

    const ctx2d = canvas.getContext("2d");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    function frame() {
      // Un solo error de detectForVideo no puede matar el loop entero (bug
      // real encontrado en el prototipo, 2026-09-08): el requestAnimationFrame
      // queda fuera del try, así que siempre se reprograma el próximo cuadro.
      try {
        if (video.readyState >= 2) {
          let timestamp = performance.now();
          if (timestamp <= ultimoTimestampGestoRef.current) {
            timestamp = ultimoTimestampGestoRef.current + 1;
          }
          ultimoTimestampGestoRef.current = timestamp;

          const resultadoDeteccion = landmarker.detectForVideo(video, timestamp);
          ctx2d.clearRect(0, 0, canvas.width, canvas.height);
          ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);

          const manos = resultadoDeteccion.landmarks ?? [];
          if (manos.length === 1) {
            manoAusenteDesdeRef.current = 0;
            const landmarks = manos[0];
            for (const p of landmarks) {
              ctx2d.beginPath();
              ctx2d.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, 2 * Math.PI);
              ctx2d.fillStyle = "#fde047";
              ctx2d.fill();
            }

            const { manoAbierta, pulgarSolo } = contarDedosExtendidos(landmarks);
            // Eje Y invertido en apaisado, confirmado en cancha
            // (2026-09-15) -- en vertical sigue siendo el eje X de
            // siempre, que ya andaba bien.
            const ejeLado = modoApaisadoRef.current ? 1 - landmarks[0].y : landmarks[0].x;
            const ladoCrudo = ejeLado < 0.5 ? "izquierda" : "derecha";
            const ladoMano = espejoCamara ? (ladoCrudo === "izquierda" ? "derecha" : "izquierda") : ladoCrudo;

            // Señas (2026-09-18, rediseño a pedido del usuario -- ver
            // project_marcadorcito_manos_libres.md): mano abierta a la
            // derecha = punto A, mano abierta a la izquierda = punto B,
            // pulgar solo (para arriba o para abajo, no importa la
            // orientación) = deshacer. Reemplaza el conteo fino de 1/2/3
            // dedos, que se confundía fácil entre sí y con la mano
            // agarrando la paleta.
            let claveCruda = null;
            if (pulgarSolo) claveCruda = "deshacer";
            else if (manoAbierta) claveCruda = `abierta-${ladoMano}`;

            if (claveCruda) {
              // Gesto válido en ESTE cuadro: si es distinto del que se
              // venía sosteniendo arranca la cuenta de cero, si es el
              // mismo sigue sumando.
              if (claveCruda !== conteoActualRef.current) {
                conteoActualRef.current = claveCruda;
                conteoDesdeRef.current = Date.now();
              }
              gestoPerdidoDesdeRef.current = 0;
            } else if (conteoActualRef.current) {
              // Este cuadro no leyó ningún gesto válido, pero se venía
              // sosteniendo uno -- margen corto antes de darlo por
              // perdido (ver GESTO_FLICKER_TOLERANCIA_MS más arriba).
              if (gestoPerdidoDesdeRef.current === 0) gestoPerdidoDesdeRef.current = Date.now();
              if (Date.now() - gestoPerdidoDesdeRef.current > GESTO_FLICKER_TOLERANCIA_MS) {
                conteoActualRef.current = null;
                gestoPerdidoDesdeRef.current = 0;
              }
            }

            const claveGesto = conteoActualRef.current;
            const accion =
              claveGesto === "deshacer" ? "deshacer" : claveGesto === "abierta-derecha" ? "A" : claveGesto === "abierta-izquierda" ? "B" : null;
            const sostenidoMs = Date.now() - conteoDesdeRef.current;
            const progreso = accion ? Math.min(1, sostenidoMs / GESTO_HOLD_MIN_MS) : 0;
            const listo = accion ? sostenidoMs >= GESTO_HOLD_MIN_MS : false;

            // Anillo "Leyendo seña..." (2026-09-18) -- se actualiza en
            // cada cuadro mientras se sostiene un gesto válido, para que
            // si no era la intención el jugador tenga los GESTO_HOLD_MIN_MS
            // completos para sacar la mano antes de que sume de verdad.
            actualizarOverlayLeyendo(accion, progreso, listo);

            const enfriado = Date.now() - ultimoDisparoTsRef.current >= COOLDOWN_DISPARO_MS;
            if (accion && listo && enfriado && claveGesto !== ultimoConteoDisparadoRef.current) {
              ultimoConteoDisparadoRef.current = claveGesto;
              ultimoDisparoTsRef.current = Date.now();
              const etiqueta = accion === "deshacer" ? "deshacer" : `punto ${accion}`;
              setUltimoGesto(etiqueta);
              // Se llama ANTES de handleSumarPunto/handleDeshacer a
              // propósito: adentro de handleSumarPunto (eventos.forEach) se
              // calcula cuánto tiene que esperar el cartel de "¡GAME!" para
              // no pisar esta cápsula, leyendo `leyendoOcupadaHastaRef` --
              // si se llamaba después (como antes), ese cálculo siempre
              // encontraba el valor viejo del ref y el fix no hacía nada en
              // la práctica (bug real: "el game sigue saliendo mal").
              mostrarConfirmacionEnCapsula(accion);
              if (accion === "deshacer") handleDeshacer();
              else handleSumarPunto(accion);
              // handleSumarPunto/handleDeshacer disparan también el
              // cartel genérico (bigText, compartido con voz/botones) --
              // para este caso puntual lo apagamos porque la cápsula ya
              // muestra su propia confirmación.
              const bigText = bigTextRef.current;
              if (bigText) {
                bigText.classList.remove(styles.showA, styles.showB, styles.showUndo, styles.showGame);
                bigText.textContent = "";
              }
            }
          } else {
            if (manoAusenteDesdeRef.current === 0) manoAusenteDesdeRef.current = Date.now();
            if (Date.now() - manoAusenteDesdeRef.current > REARME_GESTO_MS) {
              ultimoConteoDisparadoRef.current = null;
              conteoActualRef.current = null;
              gestoPerdidoDesdeRef.current = 0;
            }
            actualizarOverlayLeyendo(null, 0, false);
          }
        }
      } catch (err) {
        console.error("Error en detección de gesto (se ignora este cuadro, el loop sigue):", err);
      }
      rafGestoRef.current = requestAnimationFrame(frame);
    }
    frame();
  }

  function desactivarCamara() {
    if (rafGestoRef.current) cancelAnimationFrame(rafGestoRef.current);
    streamVideoRef.current?.getTracks().forEach((t) => t.stop());
    handLandmarkerRef.current?.close();
    handLandmarkerRef.current = null;
    setCamaraActiva(false);
    setUltimoGesto("");
  }

  // Apaga la cámara sola si se desmonta el marcador con la cámara prendida
  // (navegar a otra pantalla sin apagarla a mano primero).
  useEffect(() => {
    return () => {
      if (rafGestoRef.current) cancelAnimationFrame(rafGestoRef.current);
      streamVideoRef.current?.getTracks().forEach((t) => t.stop());
      handLandmarkerRef.current?.close();
    };
  }, []);

  // La cámara arranca APAGADA por defecto (revertido 2026-09-11 a pedido
  // del usuario: "que no cuente los puntos nadie que esa función empiece
  // apagada") -- se había probado que arrancara sola, pero eso significaba
  // que CUALQUIERA de los 4 jugadores que abriera el marcador en su
  // teléfono le prendía la cámara sin querer, arriesgando sumar puntos de
  // más por gestos accidentales en un partido que se sincroniza en tiempo
  // real entre todos. Ahora hay que activarla a mano desde "⚙️ Opciones",
  // igual que la voz.

  // Toggles de configuración en vivo (a pedido del usuario, 2026-09-10):
  // viven en `resultados_partido.estado` (no en `partidos`) para que se
  // sincronicen en tiempo real entre los 4 jugadores -- ver nota en
  // ESTADO_INICIAL más arriba.
  function handleTogglePuntoDeOro() {
    const actual = resultadoRef.current;
    if (!actual || actual.finalizado) return;
    const puntoDeOro = !actual.estado.puntoDeOro;
    persistir({ ...actual.estado, puntoDeOro }, actual.finalizado, actual.ganador);
    anunciar(puntoDeOro ? "Punto de oro activado." : "Punto de oro desactivado.");
  }

  function handleToggleSuperTiebreak() {
    const actual = resultadoRef.current;
    if (!actual || actual.finalizado) return;
    // Solo se puede elegir/cambiar mientras el 3er set todavía no arrancó
    // (setsA.length < 3) -- una vez jugado el primer punto de ese set, la
    // elección queda fija (ver esSuperTiebreakFinal en marcadorEngine.js).
    if (actual.estado.setsA.length >= 3) return;
    const superTiebreak3erSet = !actual.estado.superTiebreak3erSet;
    persistir({ ...actual.estado, superTiebreak3erSet }, actual.finalizado, actual.ganador);
    anunciar(superTiebreak3erSet ? "Súper tie-break activado para el tercer set." : "Súper tie-break desactivado.");
  }

  async function handleCambiarSaque(lado) {
    const actual = resultadoRef.current;
    if (!actual || actual.estado.pausado) return;
    const nuevoEstado = { ...actual.estado, saque: lado };
    persistir(nuevoEstado, actual.finalizado, actual.ganador);
  }

  // Pausar/reanudar el partido (a pedido del usuario, 2026-09-05): bloquea
  // sumar puntos por táctil o por voz mientras está pausado (para cortes
  // reales -- lesión, lluvia, discusión larga), sin afectar el "Voz en
  // pausa" que solo corta el micrófono.
  function handleTogglePausa() {
    const actual = resultadoRef.current;
    if (!actual || actual.finalizado) return;
    const pausado = !actual.estado.pausado;
    persistir({ ...actual.estado, pausado }, actual.finalizado, actual.ganador);
    anunciar(pausado ? "Partido en pausa." : "Partido reanudado.");
  }

  // "Terminar partido" (2026-09-30, pedido del usuario: "si pones terminar
  // partido que lo cierre, nada más que no guarde estadística ni juegos
  // ganados"): corta el partido en el momento, vaya como vaya. El partido
  // queda cancelado y el marcador NO se marca como finalizado -- así no
  // dispara el trigger de ranking ni entra en estadísticas. Solo cuentan los
  // partidos que terminan jugando (el motor los cierra solo).
  function handleTerminarPartido() {
    const actual = resultadoRef.current;
    if (!actual || actual.finalizado) return;
    anunciar("Partido terminado.");
    handleDescartarPartido();
  }

  // Cierra el partido sin que cuente: se cancela y se borra lo guardado en
  // el celu. Si fue creado sin señal y nunca se subió, alcanza con borrarlo
  // del celu.
  async function handleDescartarPartido() {
    const local = leerPartidoLocal(partidoId);
    if (!(local?.creadoSinSenal && !local.subido)) {
      const { error: cancelarError } = await supabase.from("partidos").update({ estado: "cancelado" }).eq("id", partidoId);
      if (cancelarError) {
        setError(`No se pudo descartar el partido: ${cancelarError.message}`);
        return;
      }
    }
    try {
      localStorage.removeItem(clavePendiente);
      localStorage.removeItem(`marcadorcito_local_${partidoId}`);
      if (localStorage.getItem("marcadorcito_en_curso") === String(partidoId)) localStorage.removeItem("marcadorcito_en_curso");
    } catch {
      // nada
    }
    saliendoRef.current = true;
    router.replace("/");
  }

  // Tarjeta del resultado para compartir (2026-09-30, diseño "Tabla de TV"
  // elegido por el usuario en /pruebas-tarjeta). La duración sale de
  // created_at -> updated_at: el último update de la fila es el que cierra
  // el partido, así que no sigue contando si se comparte horas después.
  async function handleCompartirResultado() {
    const actual = resultadoRef.current;
    if (!actual?.finalizado || compartiendo) return;
    setCompartiendo(true);
    try {
      const inicio = new Date(actual.created_at).getTime();
      const fin = actual.updated_at ? new Date(actual.updated_at).getTime() : Date.now();
      const estado = await compartirTarjetaResultado({
        parejaA: nombreEquipo("A"),
        parejaB: nombreEquipo("B"),
        setsA: actual.estado.setsA,
        setsB: actual.estado.setsB,
        ganador: actual.ganador,
        miEquipo: miEquipoRef.current,
        minutos: Math.max(0, Math.floor((fin - inicio) / 60000)),
        fecha: new Date(fin),
      });
      if (estado === "descargado") setError("Este navegador no deja compartir directo: se descargó la imagen.");
    } catch {
      setError("No se pudo armar la tarjeta del resultado. Probá de nuevo.");
    } finally {
      setCompartiendo(false);
    }
  }

  // US-2.9: apelar el resultado guardado -- sin plazo límite (decisión del
  // usuario, 2026-09-05). Un superusuario lo revisa y corrige desde
  // /apelaciones.
  async function handleEnviarApelacion() {
    if (!motivoApelacion.trim()) {
      setError("Contá brevemente por qué apelás antes de enviar.");
      return;
    }
    setEnviandoApelacion(true);
    setError("");

    const {
      data: { user },
    } = await usuarioRapido();

    const { error: apelarError } = await supabase.from("apelaciones").insert({
      partido_id: partidoId,
      apelante_id: user.id,
      motivo: motivoApelacion.trim(),
    });

    setEnviandoApelacion(false);

    if (apelarError) {
      setError(`No se pudo enviar la apelación: ${apelarError.message}`);
      return;
    }

    setApelacionEnviada(true);
    setMotivoApelacion("");
  }

  // Reconocimiento de voz (Web Speech API) -- vocabulario fijo, SIN
  // palabra clave obligatoria al principio (se sacó el "marcador"
  // obligatorio a pedido del usuario, 2026-09-05, para comandos más
  // cortos -- este comentario decía lo viejo, corregido 2026-09-14).
  // Micrófono siempre activo mientras "Escuchando" está prendido, ojo que
  // eso puede disparar por error con charla de cancha que contenga
  // alguna de estas palabras sueltas.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVozDisponible(false);
      return;
    }
    setVozDisponible(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "es-AR";

    recognition.onresult = (event) => {
      const ultimo = event.results[event.results.length - 1];
      const textoCrudo = quitarAcentos(ultimo[0].transcript);
      // Palabra clave "marcador" obligatoria al principio de cada comando
      // (2026-09-14, a pedido del usuario -- vuelve después de haberse
      // sacado el 2026-09-05 "para comandos más cortos"; ahora se prefiere
      // de nuevo evitar que charla de cancha con "punto"/"pausa"/etc.
      // sueltos dispare algo por error). Si no arranca con "marcador", se
      // ignora todo el resto de la frase.
      if (!/^marcador\b/.test(textoCrudo.trim())) return;
      const texto = textoCrudo.trim().replace(/^marcador\b/, "").trim();
      const juegosMatch = texto.match(/juegos?\s+(\S+)\D+(\S+)/);
      // "marcador 40 15" (sin ninguna otra palabra clave, igual que la
      // promete la demo del Home) -- corrige los puntos del juego en
      // curso. Sigue exigiendo "marcador" adelante (ya chequeado arriba),
      // como cualquier otro comando.
      const enTiebreak = !!resultadoRef.current?.estado?.tiebreak;
      const dosPuntos = enTiebreak ? extraerDosNumerosTiebreak(texto) : extraerDosPuntajes(texto);
      if (juegosMatch) {
        const gA = numeroJuegoDesde(juegosMatch[1]);
        const gB = numeroJuegoDesde(juegosMatch[2]);
        if (gA !== undefined && gB !== undefined) handleCorregirJuegos(gA, gB);
      } else if (dosPuntos) {
        handleCorregirPuntos(dosPuntos[0], dosPuntos[1], enTiebreak);
      } else if (/punto\s*a\b/.test(texto)) handleSumarPunto("A");
      else if (/punto\s*b\b/.test(texto)) handleSumarPunto("B");
      else if (/deshacer/.test(texto)) handleDeshacer();
      else if (/saque\s*a\b/.test(texto)) handleCambiarSaque("A");
      else if (/saque\s*b\b/.test(texto)) handleCambiarSaque("B");
      else if (/pausa/.test(texto)) setEscuchando(false);
      else if (/continuar/.test(texto)) setEscuchando(true);
      else if (/estado|repetir/.test(texto) && resultadoRef.current) {
        const { textoA, textoB } = formatearPuntos(resultadoRef.current.estado);
        anunciar(`${nombreEquipoVoz("A")}, ${textoA}. ${nombreEquipoVoz("B")}, ${textoB}.`);
      } else if (/apelar/.test(texto)) {
        anunciar("La apelación todavía no está disponible.");
      }
    };

    recognition.onend = () => {
      if (escuchandoRef.current) {
        try {
          recognition.start();
        } catch {
          /* ya estaba iniciado */
        }
      }
    };

    reconocimientoRef.current = recognition;

    return () => {
      recognition.onend = null;
      recognition.stop();
    };
    // Deliberadamente SIN `resultado` en las dependencias: si estuviera,
    // cada punto anotado (que cambia `resultado`) reconstruiría el
    // reconocimiento desde cero -- la instancia nueva nunca se arranca sola
    // (el `.start()` solo se dispara desde el otro efecto, que depende de
    // `escuchando`, no de `resultado`), y el micrófono quedaba "escuchando"
    // en la UI pero sin captar nada después del primer comando. El estado
    // actual para "marcador, estado/repetir" se lee de `resultadoRef.current`
    // (siempre al día) en vez de depender de `resultado` acá.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSumarPunto, handleCorregirJuegos, handleCorregirPuntos]);

  useEffect(() => {
    escuchandoRef.current = escuchando;
    const recognition = reconocimientoRef.current;
    if (!recognition) return;
    if (escuchando) {
      try {
        recognition.start();
      } catch {
        /* ya estaba iniciado */
      }
    } else {
      recognition.stop();
    }
  }, [escuchando]);

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>Cargando...</p>
      </div>
    );
  }

  if (!resultado || !partido) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4">
        <p className="text-red-600 text-sm">{error || "No se pudo cargar el marcador."}</p>
        <button
          onClick={() => router.push(`/partido/${partidoId}`)}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer self-start"
        >
          Volver
        </button>
      </div>
    );
  }

  // OJO: el chooser de abajo NO es un `return` aparte -- si lo fuera, el
  // <video>/<canvas> de más abajo (dentro del tablero) no existirían
  // todavía cuando se clickea "Cámara" acá, y activarCamara() explotaba con
  // "Cannot set properties of null (setting 'srcObject')" (bug real,
  // encontrado 2026-09-11). Por eso el video/canvas viven SIEMPRE montados
  // en el mismo return, fuera de "⚙️ Opciones" y fuera de este chooser,
  // para que activarCamara() los encuentre sin importar desde qué pantalla
  // se la llame.
  const mostrarChooser = modoElegido === null && !resultado.finalizado;

  const { setsA, setsB, tiebreak, esSuperTiebreakFinal, saque, pausado, puntoDeOro, superTiebreak3erSet } = resultado.estado;
  // "Sets jugados" muestra TODOS los sets, incluido el actual/último
  // (2026-09-12, a pedido del usuario: "quiero que en sets jugados queden
  // todos, la totalidad los tres, y del lado derecho quede el último
  // jugado") -- el último también se sigue mostrando aparte en la columna
  // "Games", como antes.
  const previasA = setsA;
  const previasB = setsB;
  const gamesActualesA = setsA[setsA.length - 1];
  const gamesActualesB = setsB[setsB.length - 1];
  // El set en curso (el último de la lista) recién tiene un ganador
  // definido cuando terminó de jugarse -- mientras sigue en juego, esos
  // números son el conteo EN CURSO, no un resultado final, así que no se
  // resalta como "ganado" todavía.
  const ultimoSetTerminado = resultado.finalizado && gamesActualesA !== gamesActualesB;
  const { a: setsGanadosA, b: setsGanadosB } = setsGanados(setsA, setsB);
  const { textoA, textoB } = formatearPuntos(resultado.estado);

  return (
    <div className={`w-full flex flex-col gap-3 items-center ${modoApaisado ? styles.forzarApaisado : ""}`}>
      {/* Cartelito "sin señal": posición fija, fuera del flujo, para no
          sumar altura al apaisado (ver regla de 0px de margen en el CSS). */}
      {confirmarSalida && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface text-ink rounded-[20px] p-5 flex flex-col gap-3 shadow-xl">
            <h2 className="font-heading text-lg font-semibold">¿Salir del partido?</h2>
            <p className="text-sm text-muted">
              El partido sigue en juego. Los puntos quedan guardados y podés volver desde el inicio
              cuando quieras. Si lo terminás, se cierra y no cuenta para estadísticas ni ranking.
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => {
                  setConfirmarSalida(false);
                  seguirEnElPartido();
                  handleTerminarPartido();
                }}
                className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-red-600/10 text-red-600 cursor-pointer mr-auto"
              >
                🏁 Terminar partido
              </button>
              <button
                onClick={salirDelPartido}
                className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink cursor-pointer"
              >
                Salir
              </button>
              <button
                onClick={seguirEnElPartido}
                className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink cursor-pointer"
              >
                Seguir jugando
              </button>
            </div>
          </div>
        </div>
      )}
      {sinSincronizar && (
        <div className="fixed top-1.5 left-1.5 z-50 pointer-events-none rounded-full bg-amber-400 text-black text-[11px] font-semibold px-2.5 py-1 shadow">
          📶 Sin señal · puntos guardados en el celu
        </div>
      )}
      <div className="w-full flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => router.push(`/partido/${partidoId}`)}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          Volver al detalle
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <SelectorTema tema={tema} onElegir={elegirTema} />
          <button
            onClick={() => setModoApaisado((v) => !v)}
            className={`${styles.botonApaisado} font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer`}
          >
            <IconoGirarTelefono width={16} height={16} />
            {modoApaisado ? "Modo vertical" : "Modo apaisado"}
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* El cuadradito visible de la cámara y el botón de "cambiar
          sentido" fueron una herramienta de calibración temporal
          (2026-09-14/15) -- una vez confirmado en cancha que en apaisado
          va con el eje Y invertido (ver `modoApaisadoRef` más arriba), se
          sacaron los dos, a pedido del usuario ("y después sacamos ese
          cuadradito"). El <canvas> sigue montado siempre (lo necesita
          loopGesto/frame() para procesar cada cuadro), solo que oculto de
          nuevo. */}
      <video ref={videoRef} muted playsInline className="hidden" />
      {/* Silencio en loop para el modo Reloj (ver activarReloj). */}
      <audio ref={relojAudioRef} src="/sonidos/silencio.wav" preload="auto" className="hidden" />
      <audio ref={relojAudio2Ref} src="/sonidos/silencio2.wav" preload="auto" className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Elegir cómo llevar los puntos (2026-10-01, opción B elegida por el
          usuario en /pruebas-marcadorcito): el tablero ya se ve atrás y desde
          abajo sube una hoja con los 4 modos. Antes era una tarjeta con una
          grilla 2x2 ("me parece que es medio fea esa opción"). */}
      {mostrarChooser && (
        <HojaAbajo titulo="¿Cómo llevamos los puntos?">
          <ElegirModo
            bateria={bateria}
            modos={[
              {
                modo: "reloj",
                icono: "⌚",
                nombre: "Reloj",
                detalle: "⏭️ punto A · ⏮️ punto B · ⏸️ deshacer. Y el reloj te muestra el resultado.",
                activar: () => {
                  setModoElegido("reloj");
                  activarReloj();
                },
              },
              {
                modo: "botones",
                icono: "👆",
                nombre: "Manual",
                detalle: "Tocás los botones de la pantalla, uno por pareja.",
                activar: () => setModoElegido("botones"),
              },
              {
                modo: "voz",
                icono: "🗣️",
                nombre: "Voz",
                detalle: "Decí “marcador punto A” o “punto B”.",
                activar: () => {
                  setModoElegido("voz");
                  setEscuchando(true);
                },
              },
              {
                modo: "camara",
                icono: "✋",
                nombre: "Gestos",
                detalle: "Con la cámara: ✋ mano abierta del lado de cada pareja · 👍 deshacer.",
                activar: () => {
                  setModoElegido("camara");
                  activarCamara();
                },
              },
            ]}
          />
        </HojaAbajo>
      )}

      {(
      <div
        className={`${styles.board} ${
          tema === "neon" ? styles.temaNeon : tema === "contraste" ? styles.temaAltoContraste : ""
        }`}
        ref={boardRef}
      >
        <div className={styles.header}>
          <div>
            <div className={styles.matchLabel}>{partido.cancha}</div>
            <div className={styles.matchSub}>
              {tiebreak ? (esSuperTiebreakFinal ? "Súper tie-break" : "Tie-break") : `Set ${setsA.length}`} · Sacan {nombreEquipo(saque)}
              {/* Resumen de sets ganados juntos, tipo "1-1"/"2-1" (2026-09-11,
                  a pedido del usuario) -- antes solo se veía como dos
                  dígitos separados, uno en cada fila de la tabla, sin
                  quedar claro el resultado global de un vistazo. */}
              {" "}· Sets {setsGanadosA}-{setsGanadosB}
            </div>
            {/* Al mejor de 3 sets, llegar al 3er set siempre significa que
                está 1-1 -- se marca bien claro que es el que define el
                partido (2026-09-11, a pedido del usuario: "no veo la
                definición del tercero"). */}
            {!resultado.finalizado && setsA.length === 3 && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#1a1305",
                  background: "#f2c53d",
                  border: "1px solid #0a211e",
                  borderRadius: 999,
                  padding: "2px 10px",
                }}
              >
                🏆 Set decisivo
              </span>
            )}
          </div>
          <div className={styles.statusCluster}>
            {camaraActiva && (
              <span className={`${styles.pill} ${styles.pillMic}`}>
                <span className={styles.pillDot} />
                <span style={{ fontSize: 14, lineHeight: 1, verticalAlign: "middle" }}>📷</span> Cámara activa
              </span>
            )}
            {escuchando && (
              <span className={`${styles.pill} ${styles.pillMic}`}>
                <span className={styles.pillDot} />
                Escuchando
              </span>
            )}
            <span className={`${styles.pill} ${styles.pillTimer}`}>{tiempoTranscurrido(resultado.created_at)}</span>
            {/* Cambiar saque visible siempre en el header (2026-09-12, a
                pedido del usuario: "que el botón de cambiar saque esté
                visible en la pantalla al lado del tiempo y de la
                configuración") -- antes solo estaba dentro de "⚙️
                Opciones", escondido. Se saca de ahí para no duplicar el
                control en dos lugares. */}
            <button
              onClick={() => handleCambiarSaque(saque === "A" ? "B" : "A")}
              disabled={pausado}
              className={`${styles.pill} ${styles.pillMicOff}`}
              style={{ marginLeft: "auto", padding: "6px 10px" }}
              aria-label="Cambiar saque"
              title="Cambiar saque"
            >
              🎾
            </button>
            <button
              onClick={() => setMostrarOpciones((v) => !v)}
              className={`${styles.pill} ${styles.pillMicOff}`}
              style={{ padding: "6px 10px" }}
              aria-label="Opciones"
              title="Opciones"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Opciones (2026-10-01, opción A elegida por el usuario en
            /pruebas-marcadorcito): hoja que sube desde abajo, ENCIMA del
            tablero, con 3 pestañas. Antes eran tarjetas apiladas adentro del
            tablero que lo empujaban hacia abajo (y en apaisado ocupaban
            toda la pantalla). */}
        {mostrarOpciones && (
          <HojaAbajo titulo="Opciones" onCerrar={() => setMostrarOpciones(false)}>
            <PestanasHoja
              pestanas={[
                ["puntos", "Puntos"],
                ["reglas", "Reglas"],
                ["partido", "Partido"],
              ]}
              activa={pestanaOpciones}
              onCambiar={setPestanaOpciones}
            />
            {pestanaOpciones === "puntos" && (
            <div className="flex flex-col gap-3">
              <FilaOpcion etiqueta="📷 Cámara (gestos)">
                <Toggle
                  checked={camaraActiva}
                  onChange={(v) => (v ? activarCamara() : desactivarCamara())}
                  disabled={cargandoModeloCamara || pausado}
                />
              </FilaOpcion>
              {cargandoModeloCamara && <span className="text-xs text-muted">Cargando modelo...</span>}
              {camaraActiva && (
                <label className="flex items-center gap-2 text-xs text-muted pl-1">
                  <input type="checkbox" checked={espejoCamara} onChange={(e) => setEspejoCamara(e.target.checked)} />
                  Corregir lados
                </label>
              )}
              {ultimoGesto && <span className="text-xs text-muted pl-1">Último gesto: {ultimoGesto}</span>}
              {errorCamara && <span className="text-xs text-red-600 pl-1">{errorCamara}</span>}

              <FilaOpcion etiqueta="⌚ Reloj / auriculares">
                <Toggle checked={relojActivo} onChange={(v) => (v ? activarReloj() : desactivarReloj())} />
              </FilaOpcion>
              {relojActivo && (
                <>
                  <span className="text-xs text-muted pl-1">⏭️ Punto A · ⏮️ Punto B · ⏸️ Deshacer · ⏸️⏸️ (dos rápido) cambiar saque. Tanteador en vivo en el reloj y aviso al terminar el partido.</span>
                  <span className="text-xs text-muted pl-1">Qué se ve en el reloj (● = quién saca):</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      ["corto-letras", "●30-15", "G 2-0 · S 0-0"],
                      ["puntos-solos", "●30-15", "2-0 · S 0-0 · 1' · Marcadorcito"],
                      ["games-arriba", "Games 2-0 · Sets 0-0 · 1'", "●30-15 Marcadorcito"],
                      ["puntos-y-todo", "●30-15 Marcadorcito", "30-15 · G 2-0 · S 0-0 · 1'"],
                    ].map(([valor, arriba, abajo]) => (
                      <button
                        key={valor}
                        onClick={() => elegirFormatoReloj(valor)}
                        className={`text-left rounded-[12px] px-3 py-2 border-2 cursor-pointer ${formatoReloj === valor ? "border-accent bg-bg" : "border-outline bg-surface"}`}
                      >
                        <span className="block text-sm font-semibold">{arriba}</span>
                        <span className="block text-xs text-muted">{abajo}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {errorReloj && <span className="text-xs text-red-600 pl-1">{errorReloj}</span>}

              {vozDisponible ? (
                <FilaOpcion etiqueta="🎙️ Voz">
                  <Toggle checked={escuchando} onChange={setEscuchando} />
                </FilaOpcion>
              ) : (
                <span className="text-xs text-muted">Voz no disponible en este navegador</span>
              )}

              <FilaOpcion etiqueta="🔊 Anuncios">
                <Toggle checked={!silenciado} onChange={(v) => setSilenciado(!v)} />
              </FilaOpcion>
              <FilaOpcion etiqueta="🔊 Sonidos">
                <Toggle checked={sonidoActivo} onChange={setSonidoActivo} />
              </FilaOpcion>
            </div>
            )}

            {pestanaOpciones === "reglas" && (
            <div className="flex flex-col gap-3">
              <FilaOpcion etiqueta="🏅 Punto de oro">
                <Toggle checked={puntoDeOro} onChange={handleTogglePuntoDeOro} disabled={pausado} />
              </FilaOpcion>
              {setsA.length < 3 ? (
                <FilaOpcion etiqueta="🎯 Súper tie-break (3er set)">
                  <Toggle checked={superTiebreak3erSet} onChange={handleToggleSuperTiebreak} disabled={pausado} />
                </FilaOpcion>
              ) : (
                esSuperTiebreakFinal && (
                  <span className="text-xs text-muted">🎯 Jugando el 3er set a súper tie-break (a 10)</span>
                )
              )}
            </div>
            )}

            {pestanaOpciones === "partido" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  className="flex-1 font-heading font-semibold text-xs px-3 py-2 rounded-xl bg-bg text-ink border-2 border-outline cursor-pointer disabled:opacity-60"
                  onClick={() => handleCambiarSaque(saque === "A" ? "B" : "A")}
                  disabled={pausado}
                >
                  🎾 Cambiar saque
                </button>
                <button
                  className="flex-1 font-heading font-semibold text-xs px-3 py-2 rounded-xl bg-bg text-ink border-2 border-outline cursor-pointer"
                  onClick={handleTogglePausa}
                >
                  {pausado ? "▶ Reanudar" : "⏸ Pausar"}
                </button>
              </div>
              {/* Apelar solo tiene sentido con el partido YA CERRADO
                  (2026-09-12, a pedido del usuario: "no tiene sentido que
                  salga apelar mientras está jugando") -- se oculta durante
                  el partido en vivo. */}
              {resultado.finalizado && (
                <>
                  <button
                    className="font-heading font-semibold text-xs px-3 py-2 rounded-xl bg-accent-3/15 text-accent-3-ink border-2 border-accent-3 cursor-pointer self-start"
                    onClick={() => setMostrarApelar((v) => !v)}
                  >
                    🚩 Apelar
                  </button>
                  {mostrarApelar && (
                    <div className="flex flex-col gap-2">
                      {apelacionEnviada ? (
                        <span className="text-xs text-muted">
                          Apelación enviada. Un superusuario la va a revisar (sin plazo límite).
                        </span>
                      ) : (
                        <>
                          <textarea
                            value={motivoApelacion}
                            onChange={(e) => setMotivoApelacion(e.target.value)}
                            placeholder="Contá brevemente por qué apelás este resultado"
                            rows={2}
                            className="rounded-xl border-2 border-outline bg-bg px-3 py-2 text-ink text-sm resize-y"
                          />
                          <button
                            className="font-heading font-semibold text-xs px-3 py-2 rounded-xl bg-accent-3 text-accent-3-ink border-2 border-outline cursor-pointer disabled:opacity-60 self-start"
                            onClick={handleEnviarApelacion}
                            disabled={enviandoApelacion}
                          >
                            {enviandoApelacion ? "Enviando..." : "Enviar apelación"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

            {!confirmandoTerminar ? (
              <button
                className="font-heading font-semibold text-xs px-3 py-2 rounded-xl bg-red-600/10 text-red-600 border-2 border-red-600 cursor-pointer self-start"
                onClick={() => setConfirmandoTerminar(true)}
              >
                🏁 Terminar partido
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  className="font-heading font-semibold text-xs px-3 py-2 rounded-xl bg-red-600 text-white border-2 border-outline cursor-pointer"
                  onClick={() => {
                    setConfirmandoTerminar(false);
                    setMostrarOpciones(false);
                    handleTerminarPartido();
                  }}
                >
                  ¿Seguro? Se cierra y no cuenta
                </button>
                <button
                  className="font-heading font-semibold text-xs px-3 py-2 rounded-xl bg-bg text-ink border-2 border-outline cursor-pointer"
                  onClick={() => setConfirmandoTerminar(false)}
                >
                  Cancelar
                </button>
              </div>
            )}
            </div>
            )}
          </HojaAbajo>
        )}

        <div>
          <div className={styles.tableHead}>
            <span>Sets jugados</span>
            <span className="playersHead" style={{ textAlign: "left" }}>
              Pareja
            </span>
            <span>Sets</span>
            <span>Games</span>
          </div>
          <div className={styles.scoreTable}>
            <div className={styles.row} ref={ladoARef}>
              <div className={styles.prevSets}>
                {previasA.map((g, i) => {
                  const esUltimo = i === previasA.length - 1;
                  const terminado = !esUltimo || resultado.finalizado;
                  return (
                    <span
                      key={i}
                      className={`${styles.digitCell} ${terminado && g > previasB[i] ? styles.digitCellGanado : ""}`}
                    >
                      <DotDigit valor={g} solido={tema === "contraste"} />
                    </span>
                  );
                })}
              </div>
              <div className={styles.players}>
                <span className={styles.name}>
                  {saque === "A" && <span className={styles.serveBall}>●</span>}
                  {equipoA.length > 0 ? equipoA.join(" / ") : "Pareja A"}
                </span>
              </div>
              <div
                className={`${styles.bigDigit} ${
                  resultado.finalizado && setsGanadosA > setsGanadosB ? styles.bigDigitGanado : ""
                }`}
              >
                <DotDigit valor={setsGanadosA} solido={tema === "contraste"} />
              </div>
              <div
                className={`${styles.bigDigit} ${
                  ultimoSetTerminado && gamesActualesA > gamesActualesB ? styles.bigDigitGanado : ""
                }`}
              >
                <DotDigit valor={gamesActualesA} solido={tema === "contraste"} />
              </div>
            </div>
            <div className={styles.row} ref={ladoBRef}>
              <div className={styles.prevSets}>
                {previasB.map((g, i) => {
                  const esUltimo = i === previasB.length - 1;
                  const terminado = !esUltimo || resultado.finalizado;
                  return (
                    <span
                      key={i}
                      className={`${styles.digitCell} ${terminado && g > previasA[i] ? styles.digitCellGanado : ""}`}
                    >
                      <DotDigit valor={g} solido={tema === "contraste"} />
                    </span>
                  );
                })}
              </div>
              <div className={styles.players}>
                <span className={styles.name}>
                  {saque === "B" && <span className={styles.serveBall}>●</span>}
                  {equipoB.length > 0 ? equipoB.join(" / ") : "Pareja B"}
                </span>
              </div>
              <div
                className={`${styles.bigDigit} ${
                  resultado.finalizado && setsGanadosB > setsGanadosA ? styles.bigDigitGanado : ""
                }`}
              >
                <DotDigit valor={setsGanadosB} solido={tema === "contraste"} />
              </div>
              <div
                className={`${styles.bigDigit} ${
                  ultimoSetTerminado && gamesActualesB > gamesActualesA ? styles.bigDigitGanado : ""
                }`}
              >
                <DotDigit valor={gamesActualesB} solido={tema === "contraste"} />
              </div>
            </div>
          </div>
        </div>

        {resultado.finalizado ? (
          <div className={styles.finalBanner}>
            🏆 Partido para {nombreEquipo(resultado.ganador)}
            <button
              className={`${styles.ctrlBtn} ${styles.ctrlBtnCompartir}`}
              onClick={handleCompartirResultado}
              disabled={compartiendo}
            >
              {compartiendo ? "Armando..." : "📤 Compartir resultado"}
            </button>
          </div>
        ) : (
          <div className={styles.pointsHero}>
            <span className={styles.ball} ref={ballRef}>🎾</span>
            <span className={styles.bigText} ref={bigTextRef} />
            <div className={styles.leyendoOverlay} ref={leyendoOverlayRef}>
              <div className={styles.leyendoRelleno} ref={leyendoRellenoRef} />
              <span className={styles.leyendoEyebrow}>👀 Leyendo seña...</span>
              <span className={styles.leyendoIcon} ref={leyendoIconRef} />
              <span className={styles.leyendoAccion} ref={leyendoAccionRef} />
            </div>
            <span className={styles.pointsLabel}>{tiebreak ? "Tie-break" : "Puntos"}</span>
            <div className={styles.pointsRow}>
              <div className={styles.pointsSide}>
                <span className={styles.who}>{nombreEquipo("A")}</span>
                <span className={styles.pointsValue} ref={numARef}>
                  <DotDigit valor={textoA} solido={tema === "contraste"} />
                </span>
              </div>
              <span className={styles.pointsSep}>–</span>
              <div className={styles.pointsSide}>
                <span className={styles.who}>{nombreEquipo("B")}</span>
                <span className={styles.pointsValue} ref={numBRef}>
                  <DotDigit valor={textoB} solido={tema === "contraste"} />
                </span>
              </div>
            </div>
          </div>
        )}

        {!resultado.finalizado && pausado && (
          <div className={styles.finalBanner}>⏸ Partido en pausa</div>
        )}

        {!resultado.finalizado && (
          <div className={styles.controls} style={{ justifyContent: "center" }}>
            <div className={styles.controlGroup}>
              <button
                className={`${styles.ctrlBtn} ${styles.ctrlBtnBig} ${styles.ctrlBtnPunto}`}
                onClick={() => handleSumarPunto("A")}
                disabled={pausado}
              >
                <span className={styles.ctrlBtnPuntoLabel}>Sumar punto</span>
                <span className={styles.ctrlBtnPuntoNombre}>{nombreEquipo("A")}</span>
              </button>
              <button
                className={`${styles.ctrlBtn} ${styles.ctrlBtnBig} ${styles.ctrlBtnPunto}`}
                onClick={() => handleSumarPunto("B")}
                disabled={pausado}
              >
                <span className={styles.ctrlBtnPuntoLabel}>Sumar punto</span>
                <span className={styles.ctrlBtnPuntoNombre}>{nombreEquipo("B")}</span>
              </button>
              <button
                className={`${styles.ctrlBtn} ${styles.ctrlBtnBig} ${styles.ctrlBtnPunto} ${styles.ctrlBtnWarn}`}
                onClick={handleDeshacer}
              >
                <span className={styles.ctrlBtnPuntoLabel}>Corregir</span>
                <span className={styles.ctrlBtnPuntoNombre}>↶ Deshacer</span>
              </button>
            </div>
          </div>
        )}

        <div className={styles.caption}>
          {puntoDeOro ? "Punto de oro activado" : "Con ventaja (deuce tradicional)"}
          {camaraActiva
            ? ' · ✋ mano abierta a la derecha = punto A · a la izquierda = punto B · 👎 pulgar solo = deshacer'
            : escuchando
            ? ' · decí "marcador, punto A/B" o "deshacer" para cantar el tanto, o "marcador, 40 15" para corregir'
            : ""}
        </div>
      </div>
      )}
    </div>
  );
}
