"use client";

import { useState } from "react";

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

export default function PruebaRelojFinalForm() {
  const [resultado, setResultado] = useState("gano");
  const r = PARTIDO[resultado];
  return (
    <div className="w-full flex flex-col gap-6" style={{ maxWidth: "92rem" }}>
      <div className="flex flex-col gap-2" style={{ maxWidth: "60rem" }}>
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">Aviso final en el reloj</h1>
        <p className="text-muted text-sm">
          Lo que vibra en la muñeca al terminar el partido. Cada opción en un reloj cuadrado (como el Redmi Watch) y uno redondo (como
          el Garmin). Probá también cómo se ve si perdés.
        </p>
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
            </section>
          );
        })}
      </div>
    </div>
  );
}
