"use client";

import { useState } from "react";

// Maquetas del Marcadorcito (2026-09-30, pedido del usuario: "cuando
// seleccionamos de qué manera vamos a llevar los puntos me parece que es
// medio fea esa opción, dame maquetas" y "la parte de configuración en
// Marcadorcito dame opciones distintas, no me convence el actual"). Todo de
// ejemplo, sin lógica real.

const VERDE = "#154139";
const VERDE_OSCURO = "#0f2e29";
const AMARILLO = "#f2c53d";
const TEXTO_TABLERO = "#eaf4f0";
const MUTED_TABLERO = "#8fb6ae";

const MODOS = [
  { id: "reloj", icono: "⌚", nombre: "Reloj", corto: "Desde la muñeca", detalle: "⏭️ punto A · ⏮️ punto B · ⏸️ deshacer. Y el reloj te muestra el resultado." },
  { id: "botones", icono: "👆", nombre: "Manual", corto: "Tocás la pantalla", detalle: "Dos botones grandes, uno por pareja." },
  { id: "voz", icono: "🗣️", nombre: "Voz", corto: "Decís el punto", detalle: "“Marcador punto A” o “punto B”." },
  { id: "camara", icono: "✋", nombre: "Gestos", corto: "Con la cámara", detalle: "✋ Mano abierta del lado de cada pareja · 👍 deshacer." },
];

function Celu({ titulo, children, oscuro }) {
  return (
    <div className="flex flex-col gap-2 items-center shrink-0" style={{ width: 260 }}>
      <span className="text-[11px] font-semibold tracking-wider text-muted uppercase text-center">{titulo}</span>
      <div
        style={{ width: 260, background: oscuro ? VERDE_OSCURO : undefined }}
        className={`shrink-0 rounded-[34px] border-[6px] border-[#14261f] overflow-hidden relative ${oscuro ? "" : "bg-bg"}`}
      >
        <div style={{ height: 520 }} className="p-3 flex flex-col gap-3 text-ink relative overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

// Tablero de ejemplo (fondo de las maquetas de Opciones).
function Tablero({ apagado }) {
  return (
    <div
      className={`rounded-[18px] p-3 flex flex-col gap-2 ${apagado ? "opacity-40" : ""}`}
      style={{ background: VERDE, color: TEXTO_TABLERO }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading font-bold text-sm">Cancha 3</p>
          <p className="text-[10px]" style={{ color: MUTED_TABLERO }}>Set 2 · Sacan A</p>
        </div>
        <div className="flex gap-1 text-[10px]">
          <span className="rounded-full px-2 py-0.5" style={{ background: "#ffffff22" }}>⌚</span>
          <span className="rounded-full px-2 py-0.5" style={{ background: "#ffffff22" }}>⚙️</span>
        </div>
      </div>
      {[
        ["A", "Gallardo / Ortega", "1", "4", "30"],
        ["B", "Francescoli / Alonso", "0", "3", "15"],
      ].map(([l, n, s, g, p]) => (
        <div key={l} className="flex items-center gap-2 rounded-[12px] px-2 py-2" style={{ background: "#ffffff10" }}>
          <span className="text-[10px] font-bold w-3">{l === "A" ? "●" : ""}</span>
          <span className="text-[11px] flex-1 truncate">{n}</span>
          <span className="font-heading font-bold text-sm w-4 text-center">{s}</span>
          <span className="font-heading font-bold text-sm w-4 text-center">{g}</span>
          <span className="font-heading font-black text-xl w-8 text-center" style={{ color: AMARILLO }}>{p}</span>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <span className="rounded-[14px] py-5 text-center font-heading font-bold text-sm" style={{ background: AMARILLO, color: "#14261f" }}>+ A</span>
        <span className="rounded-[14px] py-5 text-center font-heading font-bold text-sm" style={{ background: AMARILLO, color: "#14261f" }}>+ B</span>
      </div>
    </div>
  );
}

function BarraArriba() {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="rounded-full bg-surface px-2 py-1 font-semibold shadow">← Volver</span>
      <span className="rounded-full bg-surface px-2 py-1 font-semibold shadow">Tema verde ▾</span>
    </div>
  );
}

// ======================= ¿CÓMO LLEVAR LOS PUNTOS? =======================

// Hoy: grilla 2x2 de tarjetas iguales.
function ModoActual() {
  return (
    <>
      <BarraArriba />
      <div className="bg-surface rounded-[20px] p-3 flex flex-col gap-2 shadow">
        <p className="font-heading font-semibold text-sm">¿Cómo querés llevar los puntos?</p>
        <p className="text-[10px] text-muted">Podés cambiarlo en cualquier momento desde &quot;⚙️ Opciones&quot;.</p>
        <div className="grid grid-cols-2 gap-2">
          {MODOS.map((m) => (
            <div key={m.id} className="rounded-[14px] border-2 border-outline bg-bg p-2 flex flex-col items-center text-center gap-0.5">
              <span className="text-2xl">{m.icono}</span>
              <span className="font-heading font-semibold text-xs">{m.nombre}</span>
              <span className="text-[9px] text-muted leading-tight">{m.detalle}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// A: lista grande, una fila por modo, el reloj recomendado arriba.
function ModoA() {
  return (
    <>
      <BarraArriba />
      <div className="flex flex-col gap-1 px-1">
        <p className="font-heading font-black text-lg leading-tight">¿Cómo llevamos los puntos?</p>
        <p className="text-[11px] text-muted">Elegí uno. Lo cambiás cuando quieras.</p>
      </div>
      {MODOS.map((m, i) => (
        <div
          key={m.id}
          className={`rounded-[18px] p-3 flex items-center gap-3 shadow ${i === 0 ? "border-2" : "bg-surface"}`}
          style={i === 0 ? { background: VERDE, color: TEXTO_TABLERO, borderColor: AMARILLO } : undefined}
        >
          <span
            className="w-11 h-11 rounded-full flex items-center justify-center text-2xl shrink-0"
            style={{ background: i === 0 ? AMARILLO : "var(--color-bg, #eef4f0)" }}
          >
            {m.icono}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-sm flex items-center gap-1.5">
              {m.nombre}
              {i === 0 && (
                <span className="text-[9px] font-bold rounded-full px-1.5 py-0.5" style={{ background: AMARILLO, color: "#14261f" }}>
                  RECOMENDADO
                </span>
              )}
            </p>
            <p className="text-[10px] leading-snug" style={{ color: i === 0 ? MUTED_TABLERO : undefined }}>
              {m.detalle}
            </p>
          </div>
          <span className="text-lg opacity-60">›</span>
        </div>
      ))}
      <p className="text-[10px] text-muted text-center mt-auto">🔋 Batería 82% · la pantalla queda prendida</p>
    </>
  );
}

// B: el tablero ya se ve atrás y abajo sube una hoja con 4 íconos redondos.
function ModoB() {
  const [elegido, setElegido] = useState("reloj");
  const m = MODOS.find((x) => x.id === elegido);
  return (
    <>
      <BarraArriba />
      <Tablero apagado />
      <div className="absolute inset-x-0 bottom-0 bg-surface rounded-t-[26px] p-4 flex flex-col gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.18)]">
        <span className="mx-auto w-10 h-1 rounded-full bg-black/15" />
        <p className="font-heading font-bold text-base text-center">¿Cómo llevamos los puntos?</p>
        <div className="flex justify-between">
          {MODOS.map((x) => (
            <button
              key={x.id}
              onClick={() => setElegido(x.id)}
              className="flex flex-col items-center gap-1 cursor-pointer"
            >
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2"
                style={
                  x.id === elegido
                    ? { background: AMARILLO, borderColor: "#14261f" }
                    : { background: "transparent", borderColor: "#d9e4de" }
                }
              >
                {x.icono}
              </span>
              <span className={`text-[10px] ${x.id === elegido ? "font-bold" : "text-muted"}`}>{x.nombre}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-center text-muted min-h-[2.5em]">{m.detalle}</p>
        <span className="rounded-full text-center font-heading font-bold text-sm py-2.5 border-2 border-outline" style={{ background: AMARILLO, color: "#14261f" }}>
          Empezar con {m.nombre} →
        </span>
      </div>
    </>
  );
}

// C: pantalla oscura del tablero, un modo grande por vez con su "cómo se usa".
function ModoC() {
  const [i, setI] = useState(0);
  const m = MODOS[i];
  const ejemplo = {
    reloj: (
      <div className="w-24 h-24 rounded-[28px] border-4 border-black/40 bg-black flex flex-col items-center justify-center gap-1 mx-auto">
        <span className="text-[11px] font-bold" style={{ color: AMARILLO }}>●30-15</span>
        <span className="text-[9px] text-white/70">G 4-3 · S 1-0</span>
        <span className="text-xs">⏮️ ⏸️ ⏭️</span>
      </div>
    ),
    botones: (
      <div className="grid grid-cols-2 gap-2 w-40 mx-auto">
        <span className="rounded-[12px] py-5 text-center font-bold text-xs" style={{ background: AMARILLO, color: "#14261f" }}>+ A</span>
        <span className="rounded-[12px] py-5 text-center font-bold text-xs" style={{ background: AMARILLO, color: "#14261f" }}>+ B</span>
      </div>
    ),
    voz: <p className="text-center text-sm italic" style={{ color: AMARILLO }}>“Marcador, punto A”</p>,
    camara: <p className="text-center text-5xl">✋ · 👍</p>,
  }[m.id];
  return (
    <div className="flex flex-col gap-3 h-full" style={{ color: TEXTO_TABLERO }}>
      <div className="flex items-center justify-between text-[10px]">
        <span className="rounded-full px-2 py-1 font-semibold" style={{ background: "#ffffff1a" }}>← Volver</span>
        <span style={{ color: MUTED_TABLERO }}>Cancha 3 · 19:00</span>
      </div>
      <p className="font-heading font-black text-xl leading-tight">
        ¿Cómo llevamos
        <br />
        los puntos?
      </p>
      <div className="flex gap-1.5">
        {MODOS.map((x, j) => (
          <button
            key={x.id}
            onClick={() => setI(j)}
            className="flex-1 rounded-full py-1.5 text-[11px] font-semibold cursor-pointer"
            style={j === i ? { background: AMARILLO, color: "#14261f" } : { background: "#ffffff14", color: TEXTO_TABLERO }}
          >
            {x.icono} {x.nombre}
          </button>
        ))}
      </div>
      <div className="rounded-[22px] p-4 flex flex-col gap-3 flex-1" style={{ background: VERDE }}>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED_TABLERO }}>Así se usa</span>
        <div className="flex-1 flex items-center justify-center">{ejemplo}</div>
        <p className="font-heading font-bold text-base">{m.nombre} · {m.corto}</p>
        <p className="text-[11px]" style={{ color: MUTED_TABLERO }}>{m.detalle}</p>
      </div>
      <span className="rounded-full text-center font-heading font-bold text-sm py-3" style={{ background: AMARILLO, color: "#14261f" }}>
        Usar {m.nombre} →
      </span>
    </div>
  );
}

// ============================ ⚙️ OPCIONES ============================

function Switch({ on }) {
  return (
    <span className="w-8 h-[18px] rounded-full relative shrink-0" style={{ background: on ? "#2f8f5b" : "#cfd8d3" }}>
      <span className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow" style={{ left: on ? 16 : 2 }} />
    </span>
  );
}

// Hoy: tarjetas apiladas debajo del encabezado del tablero.
function OpcionesActual() {
  const fila = (t, on) => (
    <div key={t} className="flex items-center justify-between text-[11px]">
      <span>{t}</span>
      <Switch on={on} />
    </div>
  );
  return (
    <>
      <BarraArriba />
      <div className="rounded-[18px] p-2 flex flex-col gap-2 overflow-hidden" style={{ background: VERDE }}>
        <p className="text-[10px] px-1" style={{ color: TEXTO_TABLERO }}>Cancha 3 · Set 2 &nbsp;&nbsp; ⚙️</p>
        <div className="bg-surface rounded-[12px] border-2 border-outline p-2 flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-muted uppercase">Cómo cantar los puntos</span>
          {fila("📷 Cámara (gestos)", false)}
          {fila("⌚ Reloj / auriculares", true)}
          <span className="text-[9px] text-muted">⏭️ Punto A · ⏮️ Punto B · ⏸️ Deshacer · ⏸️⏸️ cambiar saque…</span>
          {["●30-15 / G 2-0", "●30-15 / 2-0 · S 0-0", "Games 2-0 / ●30-15"].map((x, j) => (
            <span key={x} className={`text-[10px] rounded-[8px] border-2 px-2 py-1 ${j === 0 ? "border-accent" : "border-outline"}`}>{x}</span>
          ))}
          {fila("🎙️ Voz", false)}
          {fila("🔊 Anuncios", true)}
          {fila("🔊 Sonidos", true)}
        </div>
        <div className="bg-surface rounded-[12px] border-2 border-outline p-2 flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-muted uppercase">Reglas del set</span>
          {fila("🏅 Punto de oro", true)}
          {fila("🎯 Súper tie-break", false)}
        </div>
        <p className="text-[10px] text-center" style={{ color: MUTED_TABLERO }}>… y el tablero sigue más abajo ↓</p>
      </div>
    </>
  );
}

// A: hoja de abajo con pestañas, una sección por vez.
function OpcionesA() {
  const [tab, setTab] = useState("puntos");
  const fila = (icono, t, sub, on) => (
    <div key={t} className="flex items-center gap-3 py-2 border-b border-black/5 last:border-0">
      <span className="text-lg w-6 text-center">{icono}</span>
      <div className="flex-1">
        <p className="text-xs font-semibold">{t}</p>
        {sub && <p className="text-[10px] text-muted">{sub}</p>}
      </div>
      <Switch on={on} />
    </div>
  );
  return (
    <>
      <BarraArriba />
      <Tablero apagado />
      <div className="absolute inset-x-0 bottom-0 bg-surface rounded-t-[26px] px-4 pt-3 pb-4 flex flex-col gap-2 shadow-[0_-8px_24px_rgba(0,0,0,0.18)]" style={{ height: 330 }}>
        <span className="mx-auto w-10 h-1 rounded-full bg-black/15" />
        <div className="flex items-center justify-between">
          <p className="font-heading font-bold">Opciones</p>
          <span className="text-xs text-muted">Listo ✕</span>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-bg p-1">
          {[
            ["puntos", "Puntos"],
            ["reglas", "Reglas"],
            ["partido", "Partido"],
          ].map(([id, t]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-full text-[11px] py-1.5 font-semibold cursor-pointer ${tab === id ? "bg-surface shadow" : "text-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-col">
          {tab === "puntos" && (
            <>
              {fila("⌚", "Reloj", "Ver en el reloj: ●30-15 · G 2-0 ›", true)}
              {fila("🗣️", "Voz", null, false)}
              {fila("✋", "Gestos (cámara)", null, false)}
              {fila("📢", "Anunciar el tanteador", null, true)}
              {fila("🔔", "Sonidos", null, true)}
            </>
          )}
          {tab === "reglas" && (
            <>
              {fila("🏅", "Punto de oro", "En 40-40 se juega un solo punto", true)}
              {fila("🎯", "Súper tie-break", "El 3er set se juega a 10", false)}
            </>
          )}
          {tab === "partido" && (
            <div className="flex flex-col gap-2 pt-1">
              <span className="rounded-[12px] bg-bg text-center text-xs font-semibold py-2.5">⏸ Pausar partido</span>
              <span className="rounded-[12px] bg-bg text-center text-xs font-semibold py-2.5">🎾 Cambiar saque</span>
              <span className="rounded-[12px] text-center text-xs font-semibold py-2.5 bg-red-600/10 text-red-600">🏁 Terminar partido</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// B: mosaico de botones grandes que se prenden (tipo "centro de control").
function OpcionesB() {
  const [on, setOn] = useState({ reloj: true, voz: false, camara: false, anuncios: true, sonidos: true, oro: true, super: false });
  const baldosa = (id, icono, t) => (
    <button
      key={id}
      onClick={() => setOn((o) => ({ ...o, [id]: !o[id] }))}
      className="rounded-[18px] p-2.5 flex flex-col items-start gap-1 cursor-pointer text-left"
      style={on[id] ? { background: AMARILLO, color: "#14261f" } : { background: "#ffffff14", color: TEXTO_TABLERO }}
    >
      <span className="text-xl">{icono}</span>
      <span className="text-[11px] font-bold leading-tight">{t}</span>
      <span className="text-[9px] opacity-70">{on[id] ? "Prendido" : "Apagado"}</span>
    </button>
  );
  return (
    <div className="flex flex-col gap-3 h-full" style={{ color: TEXTO_TABLERO }}>
      <div className="flex items-center justify-between">
        <p className="font-heading font-black text-lg">⚙️ Opciones</p>
        <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: "#ffffff1a" }}>Volver al partido</span>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED_TABLERO }}>Cómo cantar los puntos</span>
      <div className="grid grid-cols-3 gap-2">
        {baldosa("reloj", "⌚", "Reloj")}
        {baldosa("voz", "🗣️", "Voz")}
        {baldosa("camara", "✋", "Gestos")}
        {baldosa("anuncios", "📢", "Anuncios")}
        {baldosa("sonidos", "🔔", "Sonidos")}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED_TABLERO }}>Reglas</span>
      <div className="grid grid-cols-3 gap-2">
        {baldosa("oro", "🏅", "Punto de oro")}
        {baldosa("super", "🎯", "Súper tie-break")}
      </div>
      <div className="mt-auto flex gap-2">
        <span className="flex-1 rounded-full text-center text-[11px] font-semibold py-2" style={{ background: "#ffffff14" }}>⏸ Pausar</span>
        <span className="flex-1 rounded-full text-center text-[11px] font-semibold py-2" style={{ background: "#dc262633", color: "#fca5a5" }}>🏁 Terminar</span>
      </div>
    </div>
  );
}

// C: pantalla de ajustes tipo lista, con "›" para entrar al detalle.
function OpcionesC() {
  const [detalle, setDetalle] = useState(false);
  const grupo = (titulo, filas) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2">{titulo}</span>
      <div className="bg-surface rounded-[16px] shadow divide-y divide-black/5">{filas}</div>
    </div>
  );
  const fila = (icono, color, t, derecha, onClick) => (
    <div key={t} onClick={onClick} className={`flex items-center gap-2.5 px-3 py-2 ${onClick ? "cursor-pointer" : ""}`}>
      <span className="w-7 h-7 rounded-[9px] flex items-center justify-center text-sm" style={{ background: color }}>{icono}</span>
      <span className="text-xs font-semibold flex-1">{t}</span>
      {derecha}
    </div>
  );
  if (detalle) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button onClick={() => setDetalle(false)} className="text-xs font-semibold cursor-pointer">‹ Opciones</button>
        </div>
        <p className="font-heading font-black text-lg">⌚ Reloj</p>
        {grupo("Botones", [
          fila("⏭️", "#e8f1ec", "Punto pareja A", <span className="text-[10px] text-muted">Siguiente</span>),
          fila("⏮️", "#e8f1ec", "Punto pareja B", <span className="text-[10px] text-muted">Anterior</span>),
          fila("⏸️", "#e8f1ec", "Deshacer", <span className="text-[10px] text-muted">Pausa</span>),
          fila("⏸️⏸️", "#e8f1ec", "Cambiar saque", <span className="text-[10px] text-muted">Pausa x2</span>),
        ])}
        {grupo("Qué se ve en el reloj", [
          fila("✓", AMARILLO, "●30-15  ·  G 2-0 · S 0-0", null),
          fila("", "#e8f1ec", "●30-15  ·  2-0 · S 0-0 · 1'", null),
          fila("", "#e8f1ec", "Games 2-0 · Sets 0-0  ·  ●30-15", null),
        ])}
      </>
    );
  }
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-heading font-black text-lg">Opciones</p>
        <span className="rounded-full bg-accent text-accent-ink border-2 border-outline px-3 py-1 text-[11px] font-semibold">Listo</span>
      </div>
      {grupo("Cantar los puntos", [
        fila("⌚", AMARILLO, "Reloj", <span className="text-[10px] text-muted flex items-center gap-1">Prendido <b className="text-sm">›</b></span>, () => setDetalle(true)),
        fila("🗣️", "#dbeafe", "Voz", <Switch on={false} />),
        fila("✋", "#fde2e2", "Gestos (cámara)", <Switch on={false} />),
      ])}
      {grupo("Sonido", [
        fila("📢", "#e9e2fb", "Anunciar el tanteador", <Switch on />),
        fila("🔔", "#e9e2fb", "Sonidos", <Switch on />),
      ])}
      {grupo("Reglas", [
        fila("🏅", "#fff1c2", "Punto de oro", <Switch on />),
        fila("🎯", "#fff1c2", "Súper tie-break (3er set)", <Switch on={false} />),
      ])}
      {grupo("Partido", [
        fila("⏸", "#e8f1ec", "Pausar", <b className="text-sm text-muted">›</b>),
        fila("🏁", "#fde2e2", <span className="text-red-600">Terminar partido</span>, null),
      ])}
    </>
  );
}

const SECCIONES = {
  modo: {
    titulo: "¿Cómo querés llevar los puntos?",
    opciones: [
      { id: "hoy", nombre: "Hoy", texto: "Grilla de 4 tarjetas iguales con el texto chiquito.", Comp: ModoActual },
      {
        id: "A",
        nombre: "A · Lista grande",
        texto: "Una fila por modo, ícono grande, el Reloj arriba como recomendado. Un toque y arranca.",
        Comp: ModoA,
      },
      {
        id: "B",
        nombre: "B · Hoja de abajo",
        texto: "Ya ves el tablero atrás; abajo sube una hoja con 4 íconos redondos, elegís y tocás Empezar. Tocá los íconos.",
        Comp: ModoB,
      },
      {
        id: "C",
        nombre: "C · Pantalla del tablero",
        texto: "Oscura como el tablero, un modo por vez con un dibujito de cómo se usa (el reloj muestra el resultado). Tocá las pestañas.",
        Comp: ModoC,
        oscuro: true,
      },
    ],
  },
  opciones: {
    titulo: "⚙️ Opciones",
    opciones: [
      { id: "hoy", nombre: "Hoy", texto: "Tarjetas apiladas que empujan el tablero hacia abajo.", Comp: OpcionesActual },
      {
        id: "A",
        nombre: "A · Hoja con pestañas",
        texto: "Sube desde abajo, encima del tablero (no lo empuja). Tres pestañas: Puntos, Reglas, Partido. Tocá las pestañas.",
        Comp: OpcionesA,
      },
      {
        id: "B",
        nombre: "B · Botones grandes",
        texto: "Tipo centro de control: baldosas que se prenden en amarillo al tocarlas, en el color del tablero. Tocalas.",
        Comp: OpcionesB,
        oscuro: true,
      },
      {
        id: "C",
        nombre: "C · Lista de ajustes",
        texto: "Como los ajustes del celular: grupos con íconos de colores; el Reloj tiene su propia pantalla ›. Tocá «Reloj».",
        Comp: OpcionesC,
      },
    ],
  },
};

export default function PruebaMarcadorcitoForm() {
  const [seccion, setSeccion] = useState("modo");
  const s = SECCIONES[seccion];
  return (
    <div className="w-full max-w-[90rem] flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold">Maquetas del Marcadorcito</h1>
        <p className="text-sm text-muted">Todo es de ejemplo. Elegí una opción de cada pantalla (o mezclá).</p>
        <div className="flex gap-2 flex-wrap">
          {[
            ["modo", "1 · Cómo llevar los puntos"],
            ["opciones", "2 · ⚙️ Opciones"],
          ].map(([id, t]) => (
            <button
              key={id}
              onClick={() => setSeccion(id)}
              className={`font-heading font-semibold text-sm px-4 py-2 rounded-full border-2 border-outline cursor-pointer ${
                seccion === id ? "bg-accent text-accent-ink" : "bg-surface text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <h2 className="font-heading text-xl font-semibold">{s.titulo}</h2>
      <div className="flex flex-wrap gap-8 justify-center">
        {s.opciones.map(({ id, nombre, texto, Comp, oscuro }) => (
          <div key={id} className="flex flex-col gap-3 items-center" style={{ width: 260 }}>
            <Celu titulo={nombre} oscuro={oscuro}>
              <Comp />
            </Celu>
            <p className="text-xs text-muted text-center">{texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
