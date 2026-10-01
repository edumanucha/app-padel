"use client";

import { IconoCalendario, IconoLupa, IconoCampana, IconoMenu, IconoChevron, IconoSobre } from "@/components/Icons";

// Comparación de fuentes para el estilo "Cartel de estadio" (2026-10-01,
// pedido del usuario: "¿mezclando fuentes de manera intencional?"). Mismo
// Inicio en las 4: los títulos siempre en Big Shoulders (el cartel); cambia
// la fuente del texto y la de los números. Todo de ejemplo.

const TITULO = '"Big Shoulders", "Arial Narrow", sans-serif';
const COMBOS = [
  {
    id: "A",
    nombre: "A · Archivo (actual)",
    texto: '"Archivo", system-ui, sans-serif',
    numeros: TITULO,
    nota: "Texto neutro y muy legible. Los números van con la letra del cartel.",
  },
  {
    id: "B",
    nombre: "B · Barlow",
    texto: '"Barlow", system-ui, sans-serif',
    numeros: TITULO,
    nota: "Estilo técnico, de señalética de ruta: es pariente de la condensada y combina muy natural.",
  },
  {
    id: "C",
    nombre: "C · Schibsted + números de tablero",
    texto: '"Schibsted Grotesk", system-ui, sans-serif',
    numeros: '"Chakra Petch", ui-monospace, monospace',
    nota: "Texto de diario deportivo. Números con letra de tablero electrónico: tres fuentes, cada una con su rol.",
  },
  {
    id: "D",
    nombre: "D · Bricolage + números de tablero",
    texto: '"Bricolage Grotesque", system-ui, sans-serif',
    numeros: '"Chakra Petch", ui-monospace, monospace',
    nota: "La más distinta y moderna. Tiene más carácter, pero también más riesgo de cansar.",
  },
];

const etiqueta = { fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5f7d70" };

function Inicio({ c }) {
  const num = { fontFamily: c.numeros, fontWeight: c.numeros === TITULO ? 900 : 700, lineHeight: 1 };
  return (
    <div style={{ fontFamily: c.texto, color: "#10201a", background: "#f4f7f3", height: "100%", overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14, fontSize: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <span style={etiqueta}>Puesto 6 de 13 · 188 pts</span>
          <div style={{ fontFamily: TITULO, fontWeight: 900, fontSize: 40, lineHeight: 0.9, textTransform: "uppercase", marginTop: 4 }}>
            Hola,
            <br />
            Eduardo
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
          <IconoCampana width={20} height={20} />
          <IconoMenu width={20} height={20} />
        </div>
      </div>

      <div style={{ display: "flex", background: "#154139", color: "#eaf4f0", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ background: "#f2c53d", color: "#1a1305", padding: "10px 12px", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: TITULO, fontWeight: 800, textTransform: "uppercase" }}>
          <span>sáb</span>
          <span style={{ ...num, fontSize: 44 }}>03</span>
          <span>oct</span>
        </div>
        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ ...etiqueta, color: "#8fb6ae" }}>
            Próximo partido · <span style={{ fontFamily: c.numeros }}>19:00</span>
          </span>
          <span style={{ fontFamily: TITULO, fontWeight: 800, fontSize: 24, lineHeight: 1, textTransform: "uppercase" }}>Complejo La Red</span>
          <span style={{ fontSize: 12, color: "#c4dad3" }}>con Marcos Acuña · vs. Armani y Fernández</span>
        </div>
      </div>

      <div style={{ background: "#f2c53d", color: "#1a1305", borderRadius: 6, padding: "13px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: TITULO, fontWeight: 900, fontSize: 24, lineHeight: 1, textTransform: "uppercase" }}>Abrir Marcadorcito</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>Llevá el tanteador por voz, reloj o botones</div>
        </div>
        <IconoChevron width={22} height={22} style={{ transform: "rotate(-90deg)" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "2px solid #10201a", borderBottom: "2px solid #10201a" }}>
        <span style={{ display: "flex", gap: 6, justifyContent: "center", padding: "10px 0", fontWeight: 600 }}>
          <IconoCalendario width={17} height={17} /> Crear partido
        </span>
        <span style={{ display: "flex", gap: 6, justifyContent: "center", padding: "10px 0", fontWeight: 600, borderLeft: "2px solid #10201a" }}>
          <IconoLupa width={17} height={17} /> Abiertos
        </span>
      </div>

      <span style={{ display: "flex", gap: 7, alignItems: "center", fontWeight: 600, color: "#154139" }}>
        <IconoSobre width={16} height={16} /> Tenés 1 invitación pendiente
      </span>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
        {[
          ["2", "Racha"],
          ["#6", "Ranking"],
          ["58%", "Ganados"],
        ].map(([n, t], i) => (
          <div key={t} style={{ paddingLeft: i ? 10 : 0, borderLeft: i ? "1px solid #cfdcd4" : "none" }}>
            <div style={{ ...num, fontSize: 36 }}>{n}</div>
            <span style={{ ...etiqueta, fontSize: 10 }}>{t}</span>
          </div>
        ))}
      </div>

      <div>
        <span style={etiqueta}>Último partido</span>
        <p style={{ marginTop: 3 }}>
          <b>Ganaste</b> <span style={{ fontFamily: c.numeros, fontWeight: 700 }}>6-4 6-3</span> contra Marcos Acuña y Miguel Borja. El
          próximo rival viene con dos victorias seguidas en el ranking mensual.
        </p>
      </div>
    </div>
  );
}

export default function PruebaFuentesForm() {
  return (
    <div style={{ width: "100%", maxWidth: "92rem", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: "60rem" }}>
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">Fuentes del cartel</h1>
        <p className="text-muted text-sm">
          Los títulos son siempre la condensada del cartel. Cambia la fuente del <b>texto</b> y la de los <b>números</b> (puntos, horas,
          resultados). Mismo Inicio en las cuatro.
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 28, justifyContent: "center" }}>
        {COMBOS.map((c) => (
          <figure key={c.id} style={{ margin: 0, width: 320, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <figcaption style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>
              {c.nombre}
            </figcaption>
            <div style={{ width: 320, height: 640, border: "7px solid #14261f", borderRadius: 36, overflow: "hidden" }}>
              <Inicio c={c} />
            </div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", lineHeight: 1.45 }}>{c.nota}</p>
          </figure>
        ))}
      </div>
    </div>
  );
}
