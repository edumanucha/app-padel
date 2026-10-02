"use client";

import { useRef, useState } from "react";

// Opciones del aviso final al reloj (2026-10-01, pedido del usuario: "al
// finalizar el partido, desde el reloj debería decir arriba partido ganado y
// abajo los sets, después los minutos y después la cancha"). El aviso es una
// notificación del celu que el reloj espeja: tiene un TÍTULO (renglón de
// arriba, en negrita) y un TEXTO (renglones de abajo). Todo de ejemplo.

const PARTIDO = {
  gano: { titulo: "Partido ganado", corto: "Ganaste", sets: ["6-4", "6-3"], setsGan: "2-0" },
  perdio: { titulo: "Partido perdido", corto: "Perdiste", sets: ["4-6", "6-7"], setsGan: "0-2" },
  minutos: 72,
  cancha: "Complejo La Red",
  rivales: "Armani / Fernández",
};

const duracion = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}'` : `${m}'`);

const OPCIONES = [
  {
    id: "A",
    nombre: "A · Como pediste",
    nota: "Un dato por renglón: título, sets, minutos y cancha. Es el más claro de leer de un vistazo.",
    armar: (r) => ({ titulo: r.titulo, lineas: [r.sets.join("  "), `${PARTIDO.minutos} minutos`, PARTIDO.cancha] }),
  },
  {
    id: "B",
    nombre: "B · Con sets ganados",
    nota: "El título ya dice cómo terminó en sets (2-0). Abajo, el detalle por set y el resto en una línea.",
    armar: (r) => ({ titulo: `${r.titulo} ${r.setsGan}`, lineas: [r.sets.join("  "), `${duracion(PARTIDO.minutos)} · ${PARTIDO.cancha}`] }),
  },
  {
    id: "C",
    nombre: "C · Con los rivales",
    nota: "Como la A, pero suma contra quién jugaste. Más completo, ocupa un renglón más.",
    armar: (r) => ({ titulo: r.titulo, lineas: [r.sets.join("  "), `vs. ${PARTIDO.rivales}`, `${PARTIDO.minutos}' · ${PARTIDO.cancha}`] }),
  },
  {
    id: "D",
    nombre: "D · Compacto",
    nota: "Para relojes chicos: todo en dos renglones. Entra seguro sin cortarse ni moverse.",
    armar: (r) => ({ titulo: `${r.corto} ${r.sets.join(" ")}`, lineas: [`${duracion(PARTIDO.minutos)} · ${PARTIDO.cancha}`] }),
  },
];

function Reloj({ forma, aviso }) {
  const redondo = forma === "redondo";
  return (
    <div
      style={{
        width: 196,
        height: redondo ? 196 : 230,
        borderRadius: redondo ? "50%" : 44,
        background: "#0b0b0b",
        border: "9px solid #2a2f2c",
        boxShadow: "inset 0 0 0 2px #444",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: redondo ? 26 : 18,
        boxSizing: "border-box",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center", width: "100%" }}>
        <span style={{ fontSize: 10, color: "#9aa39f", letterSpacing: "0.04em" }}>Padelito · ahora</span>
        <b style={{ fontSize: 17, lineHeight: 1.15 }}>{aviso.titulo}</b>
        {aviso.lineas.map((l, i) => (
          <span key={i} style={{ fontSize: i === 0 ? 15 : 12.5, lineHeight: 1.2, color: i === 0 ? "#f2c53d" : "#d8dedb", fontWeight: i === 0 ? 700 : 400 }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// Prueba EN EL RELOJ (2026-10-01, pedido del usuario: "no me interesa una
// maqueta quieta en una web, quiero verlo desde el reloj"). Dos caminos,
// los mismos que usa el Marcadorcito real:
//  - Aviso: notificación del celu (service worker); Mi Fitness / Garmin
//    Connect la espejan al reloj y vibra.
//  - Pantalla de música: título y subtítulo del "tema que suena" (Media
//    Session), con el audio en silencio en loop, como en el modo Reloj.
async function mandarAviso(aviso) {
  if (typeof Notification === "undefined") return "Este navegador no permite avisos.";
  if (Notification.permission === "default") await Notification.requestPermission();
  if (Notification.permission !== "granted") return "Sin permiso para avisos: activalo en los ajustes del navegador.";
  const reg = await navigator.serviceWorker?.ready;
  if (!reg) return "No hay service worker: abrí la página desde Chrome.";
  await reg.showNotification(aviso.titulo, {
    body: aviso.lineas.join("\n"),
    tag: "prueba-reloj-final",
    renotify: true,
    vibrate: [150, 80, 150],
    icon: "/pwa-icon?size=192",
  });
  return "Aviso mandado: mirá el reloj.";
}

export default function PruebaRelojFinalForm() {
  const [resultado, setResultado] = useState("gano");
  const [estado, setEstado] = useState("");
  const audioRef = useRef(null);
  const r = PARTIDO[resultado];

  async function aviso(op) {
    try {
      setEstado(`${op.id}: ${await mandarAviso(op.armar(r))}`);
    } catch (e) {
      setEstado(`No se pudo mandar el aviso: ${e.message}`);
    }
  }

  async function pantallaMusica(op) {
    if (!("mediaSession" in navigator)) return setEstado("Este navegador no maneja la pantalla de música.");
    try {
      const a = audioRef.current;
      a.loop = true;
      await a.play();
      const av = op.armar(r);
      navigator.mediaSession.metadata = new MediaMetadata({ title: av.titulo, artist: av.lineas.join(" · "), album: "Marcadorcito" });
      navigator.mediaSession.playbackState = "playing";
      // Misma duración fija de 4 h que el Marcadorcito real, para que el celu
      // no lo muestre como algo que se repite cada segundo.
      try {
        navigator.mediaSession.setPositionState({ duration: 4 * 60 * 60, playbackRate: 1, position: 0 });
      } catch {
        // Navegador sin setPositionState.
      }
      setEstado(`${op.id}: mostrando en la pantalla de música del reloj (abrí "música" o "ahora suena").`);
    } catch (e) {
      setEstado(`No se pudo: ${e.message}`);
    }
  }

  function parar() {
    audioRef.current?.pause();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
    setEstado("Pantalla de música apagada.");
  }
  return (
    <div className="w-full flex flex-col gap-6" style={{ maxWidth: "92rem" }}>
      <div className="flex flex-col gap-2" style={{ maxWidth: "60rem" }}>
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">Aviso final en el reloj</h1>
        <p className="text-muted text-sm">
          Lo que vibra en la muñeca al terminar el partido. Cada opción en un reloj cuadrado (como el Redmi Watch) y uno redondo (como
          el Garmin). Probá también cómo se ve si perdés.
        </p>
        <p className="text-sm">
          <b>Probalo en tu reloj:</b> abrí esta página en el celu (Chrome) con el reloj conectado y tocá{" "}
          <b>Mandar aviso</b> (vibra como al terminar el partido) o <b>Ver en pantalla de música</b> (como el marcador durante el
          partido).
        </p>
        <audio ref={audioRef} src="/sonidos/silencio.wav" preload="auto" className="hidden" />
        <div className="flex gap-2">
          {[
            ["gano", "Si ganás"],
            ["perdio", "Si perdés"],
          ].map(([id, t]) => (
            <button
              key={id}
              onClick={() => setResultado(id)}
              className={`text-sm font-semibold px-3 py-1.5 rounded-[6px] cursor-pointer ${
                resultado === id ? "bg-accent text-accent-ink" : "border border-ink/15 text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {estado && (
        <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-3 text-sm">
          <span>{estado}</span>
          <button onClick={parar} className="text-xs font-semibold px-2 py-1 rounded-[6px] border border-white/30 cursor-pointer">
            Apagar música
          </button>
        </div>
      )}
      <div className="grid gap-x-8 gap-y-10" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 430px), 1fr))" }}>
        {OPCIONES.map((op) => {
          const aviso = op.armar(r);
          return (
            <section key={op.id} className="flex flex-col gap-3">
              <h2 className="font-titulo text-2xl font-black uppercase leading-none">{op.nombre}</h2>
              <div className="flex gap-5 flex-wrap items-center">
                <Reloj forma="cuadrado" aviso={aviso} />
                <Reloj forma="redondo" aviso={aviso} />
              </div>
              <p className="text-sm text-muted">{op.nota}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => aviso(op)}
                  className="font-titulo font-black uppercase text-lg px-4 py-2 rounded-[6px] bg-accent text-accent-ink cursor-pointer"
                >
                  Mandar aviso al reloj
                </button>
                <button
                  onClick={() => pantallaMusica(op)}
                  className="text-sm font-semibold px-3 py-2 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
                >
                  Ver en pantalla de música
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
