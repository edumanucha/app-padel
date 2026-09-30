"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dibujarTarjetaTV } from "@/lib/tarjetaResultado";

// Prueba de la "tarjeta del resultado para compartir" (v1, 2026-09-30) --
// herramienta de QA aislada del Marcadorcito real. Muestra 4 diseños con
// partidos de ejemplo para que el usuario elija uno desde el celu. Cada
// tarjeta se dibuja en un <canvas> de 1080x1350 (formato 4:5 de Instagram),
// así lo que se ve acá es exactamente la imagen que se comparte.

const DISENOS = [
  ["tv", "1) Tabla de TV ✅ elegida"],
  ["ganador", "2) Ganador grande"],
  ["minimal", "3) Minimalista"],
  ["stats", "4) Con estadísticas"],
];

// Partidos de ejemplo (datos inventados). "Vos" = pareja A.
const EJEMPLOS = [
  {
    id: "ganado3",
    nombre: "Ganado en 3 sets",
    parejaA: "Edu / Juan",
    parejaB: "Pablo / Nico",
    setsA: [6, 3, 7],
    setsB: [4, 6, 5],
    minutos: 92,
    stats: { puntosA: 98, puntosB: 87, rachaA: 6, tiebreaks: 0 },
  },
  {
    id: "perdido2",
    nombre: "Perdido en 2 sets",
    parejaA: "Edu / Juan",
    parejaB: "Martín / Lucas",
    setsA: [4, 5],
    setsB: [6, 7],
    minutos: 71,
    stats: { puntosA: 61, puntosB: 72, rachaA: 4, tiebreaks: 1 },
  },
  {
    id: "paliza",
    nombre: "Ganado 6-0 6-1",
    parejaA: "Edu / Juan",
    parejaB: "Seba / Fede",
    setsA: [6, 6],
    setsB: [0, 1],
    minutos: 48,
    stats: { puntosA: 57, puntosB: 22, rachaA: 11, tiebreaks: 0 },
  },
];

const W = 1080;
const H = 1350;

// Colores de la paleta "Cancha" de la app (globals.css).
const C = {
  verdeOscuro: "#0f2e29",
  verde: "#154139",
  verdeLinea: "#2b5d52",
  verdeClaro: "#eaf3ec",
  verdeTexto: "#14261f",
  verdeMuted: "#5f7d70",
  amarillo: "#f2c53d",
  amarilloInk: "#1a1305",
  blanco: "#ffffff",
  gris: "#d9ded9",
};

function resumen(ej) {
  let a = 0;
  let b = 0;
  ej.setsA.forEach((g, i) => (g > ej.setsB[i] ? a++ : b++));
  const ganoA = a > b;
  const hs = Math.floor(ej.minutos / 60);
  const min = ej.minutos % 60;
  const duracion = hs ? `${hs}h ${String(min).padStart(2, "0")}'` : `${min}'`;
  const sets = ej.setsA.map((g, i) => `${g}-${ej.setsB[i]}`);
  const gamesA = ej.setsA.reduce((s, g) => s + g, 0);
  const gamesB = ej.setsB.reduce((s, g) => s + g, 0);
  const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  return { a, b, ganoA, duracion, sets, gamesA, gamesB, fecha };
}

function dibujar(ctx, diseno, ej, fuente) {
  const r = resumen(ej);
  const f = (peso, px) => `${peso} ${px}px ${fuente}`;
  const texto = (t, x, y, font, color, align = "left") => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(t, x, y);
  };
  const fondo = (color) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
  };
  const ganadora = r.ganoA ? ej.parejaA : ej.parejaB;
  const perdedora = r.ganoA ? ej.parejaB : ej.parejaA;
  ctx.textBaseline = "alphabetic";

  if (diseno === "tv") {
    // Diseño elegido por el usuario -- mismo dibujo que el Marcadorcito real.
    dibujarTarjetaTV(
      ctx,
      { parejaA: ej.parejaA, parejaB: ej.parejaB, setsA: ej.setsA, setsB: ej.setsB, ganador: r.ganoA ? "A" : "B", miEquipo: "A", minutos: ej.minutos },
      fuente
    );
    return;
  }

  if (diseno === "ganador") {
    fondo(C.amarillo);
    texto("MARCADORCITO", W / 2, 150, f(800, 48), C.amarilloInk, "center");
    texto(r.ganoA ? "🏆 Partido ganado" : "Partido perdido", W / 2, 420, f(700, 72), C.amarilloInk, "center");
    texto(ganadora, W / 2, 600, f(900, 120), C.amarilloInk, "center");
    texto(r.sets.join("   "), W / 2, 800, f(800, 104), C.verde, "center");
    texto(`vs ${perdedora}`, W / 2, 960, f(500, 56), C.amarilloInk, "center");
    texto(`⏱ ${r.duracion}  ·  ${r.fecha}`, W / 2, 1060, f(500, 48), C.amarilloInk, "center");
    texto("Anotado con Marcadorcito 🎾", W / 2, 1250, f(600, 42), C.verde, "center");
    return;
  }

  if (diseno === "minimal") {
    fondo(C.blanco);
    texto("Marcadorcito", 100, 160, f(800, 52), C.verde);
    texto(`${r.a}-${r.b}`, 100, 620, f(900, 320), C.verdeTexto);
    texto(r.sets.join("  ·  "), 100, 760, f(600, 72), C.verdeMuted);
    texto(`${ganadora}`, 100, 920, f(800, 64), C.verdeTexto);
    texto(`le ${ganadora.includes("/") ? "ganaron" : "ganó"} a ${perdedora}`, 100, 1000, f(500, 56), C.verdeMuted);
    ctx.fillStyle = C.amarillo;
    ctx.fillRect(100, 1120, 160, 14);
    texto(`${r.fecha}  ·  ${r.duracion}`, 100, 1240, f(500, 46), C.verdeMuted);
    return;
  }

  // "stats"
  fondo(C.verdeClaro);
  texto("MARCADORCITO", 90, 150, f(800, 48), C.verde);
  texto(`⏱ ${r.duracion}`, W - 90, 150, f(600, 48), C.verde, "right");
  texto(r.ganoA ? "Partido ganado" : "Partido perdido", W / 2, 330, f(600, 60), C.verdeMuted, "center");
  texto(ej.parejaA, W / 2, 450, f(800, 72), C.verdeTexto, "center");
  texto(r.sets.join("  "), W / 2, 580, f(900, 110), C.verdeTexto, "center");
  texto(ej.parejaB, W / 2, 700, f(500, 64), C.verdeTexto, "center");
  // 4 cajitas de estadísticas (2x2).
  const cajas = [
    ["Puntos", `${ej.stats.puntosA}-${ej.stats.puntosB}`],
    ["Games", `${r.gamesA}-${r.gamesB}`],
    ["Mejor racha", `${ej.stats.rachaA} pts`],
    ["Tie-breaks", String(ej.stats.tiebreaks)],
  ];
  const cw = 420;
  const ch = 170;
  cajas.forEach(([label, valor], i) => {
    const x = i % 2 === 0 ? 90 : W - 90 - cw;
    const y = 810 + Math.floor(i / 2) * (ch + 30);
    ctx.fillStyle = C.blanco;
    ctx.beginPath();
    ctx.roundRect(x, y, cw, ch, 32);
    ctx.fill();
    texto(label, x + 40, y + 62, f(500, 38), C.verdeMuted);
    texto(valor, x + 40, y + 138, f(800, 64), C.verdeTexto);
  });
  texto("Anotado con Marcadorcito 🎾", W / 2, 1290, f(600, 40), C.verde, "center");
}

export default function PruebaTarjetaForm() {
  const router = useRouter();
  const [ejemploId, setEjemploId] = useState(EJEMPLOS[0].id);
  const [fuente, setFuente] = useState(null);
  const [aviso, setAviso] = useState("");
  const canvasRefs = useRef({});
  const ejemplo = EJEMPLOS.find((e) => e.id === ejemploId);

  // Usar la misma letra de la app (Archivo, cargada con next/font) también
  // dentro del canvas -- hay que esperar a que esté descargada.
  useEffect(() => {
    let vivo = true;
    document.fonts.ready.then(() => {
      if (vivo) setFuente(getComputedStyle(document.body).fontFamily || "sans-serif");
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!fuente) return;
    DISENOS.forEach(([id]) => {
      const cv = canvasRefs.current[id];
      if (cv) dibujar(cv.getContext("2d"), id, ejemplo, fuente);
    });
  }, [fuente, ejemplo]);

  async function compartir(id) {
    setAviso("");
    const cv = canvasRefs.current[id];
    if (!cv) return;
    const blob = await new Promise((ok) => cv.toBlob(ok, "image/png"));
    const archivo = new File([blob], `marcadorcito-${id}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: "Resultado del partido" });
      } catch {
        // la persona cerró el menú de compartir -- no es un error
      }
      return;
    }
    // Sin "compartir" (ej. compu): se descarga la imagen.
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo.name;
    a.click();
    URL.revokeObjectURL(url);
    setAviso("Este navegador no deja compartir directo: se descargó la imagen.");
  }

  return (
    <div className="w-full max-w-md bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">
          🖼️ Tarjeta para compartir <span className="text-xs text-muted font-normal">v1</span>
        </h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          Volver
        </button>
      </div>

      <p className="text-sm text-muted">
        4 diseños con datos inventados. Probá &quot;Compartir&quot; para ver cómo llega por WhatsApp o a una historia de
        Instagram.
      </p>

      <div className="flex flex-wrap gap-2">
        {EJEMPLOS.map((e) => (
          <button
            key={e.id}
            onClick={() => setEjemploId(e.id)}
            className={`text-sm font-semibold px-3 py-1.5 rounded-full cursor-pointer ${
              e.id === ejemploId ? "bg-accent text-accent-ink" : "bg-bg text-ink"
            }`}
          >
            {e.nombre}
          </button>
        ))}
      </div>

      {aviso && <p className="text-sm text-accent-3">{aviso}</p>}

      {DISENOS.map(([id, nombre]) => (
        <div key={id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-heading font-semibold">{nombre}</span>
            <button
              onClick={() => compartir(id)}
              className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-accent text-accent-ink cursor-pointer"
            >
              Compartir
            </button>
          </div>
          <canvas
            ref={(el) => {
              canvasRefs.current[id] = el;
            }}
            width={W}
            height={H}
            className="w-full h-auto rounded-2xl border border-black/10"
          />
        </div>
      ))}
    </div>
  );
}
