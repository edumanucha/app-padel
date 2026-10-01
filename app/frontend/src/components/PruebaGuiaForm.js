"use client";

import { useState } from "react";

// Maquetas de la guía de la app (2026-09-30, pedido del usuario: "un modo
// explicativo de toda la app, como la demo del Marcadorcito"; "la primera
// vez que te pregunte si querés hacer la guía y si no, que quede en algún
// lugar"). Tres pantallas por opción: la pregunta, un paso de la guía y
// dónde queda para después. Todo de ejemplo.

const tarjeta = "bg-surface text-ink rounded-[20px] shadow-[0_1px_3px_rgba(20,38,31,0.08)]";

function Celu({ titulo, children }) {
  return (
    <div className="flex flex-col gap-2 items-center shrink-0" style={{ width: 260 }}>
      <span className="text-[11px] font-semibold tracking-wider text-muted uppercase text-center">{titulo}</span>
      <div style={{ width: 260 }} className="shrink-0 rounded-[34px] border-[6px] border-[#14261f] bg-bg overflow-hidden relative">
        <div style={{ height: 500 }} className="p-3 flex flex-col gap-3 text-ink relative overflow-hidden">{children}</div>
        <div className="bg-[var(--nav-bg)] flex justify-around py-2 text-[9px] text-muted">
          <span>🏠 Home</span>
          <span>🏆 Jugadores</span>
          <span>🎾 Marcador</span>
          <span>👤 Perfil</span>
        </div>
      </div>
    </div>
  );
}

// Inicio de ejemplo (fondo de las maquetas).
function Inicio({ resaltar, extra }) {
  const brilla = (id) => (resaltar === id ? "relative z-20 ring-4 ring-[#f2c53d] ring-offset-2 ring-offset-transparent" : "");
  return (
    <>
      {extra}
      <div className={`${tarjeta} p-3 flex items-center gap-2`}>
        <span className="w-9 h-9 rounded-full bg-bg flex items-center justify-center">🎾</span>
        <div>
          <p className="font-heading font-semibold text-sm">Hola, Eduardo</p>
          <p className="text-[11px] text-muted">412 puntos de ranking</p>
        </div>
      </div>
      <div className={`${tarjeta} p-3 text-xs`}>
        <p className="font-heading font-semibold">Tu próximo partido</p>
        <p className="text-muted">Sáb 4/10 · 19:00</p>
      </div>
      <div className={`rounded-[20px] bg-accent text-accent-ink border-2 border-outline p-3 font-heading font-bold text-sm ${brilla("marcador")}`}>
        🎾 Marcadorcito
      </div>
      <div className={`grid grid-cols-2 gap-2 ${brilla("crear")}`}>
        <span className="rounded-full bg-accent text-accent-ink border-2 border-outline text-[11px] font-semibold py-2 text-center">📅 Crear partido</span>
        <span className="rounded-full bg-accent text-accent-ink border-2 border-outline text-[11px] font-semibold py-2 text-center">🔍 Abiertos</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["3", "#6", "59%"].map((n) => (
          <div key={n} className={`${tarjeta} p-2 text-center font-heading font-bold text-sm`}>{n}</div>
        ))}
      </div>
    </>
  );
}

function Oscuro() {
  return <div className="absolute inset-0 bg-black/55 z-10" />;
}

// ---------- Opción 1: cartel + foco ----------
function Op1Pregunta() {
  return (
    <>
      <Inicio />
      <Oscuro />
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-20 bg-surface rounded-[22px] p-4 flex flex-col gap-2 text-center shadow-xl">
        <span className="text-3xl">👋</span>
        <p className="font-heading font-bold">¡Bienvenido a Padelito!</p>
        <p className="text-xs text-muted">¿Te mostramos cómo funciona? Es menos de un minuto.</p>
        <span className="rounded-full bg-accent text-accent-ink border-2 border-outline text-sm font-semibold py-2">Sí, mostrame</span>
        <span className="text-xs text-muted underline">Ahora no</span>
      </div>
    </>
  );
}
function Op1Paso() {
  return (
    <>
      <Inicio resaltar="crear" />
      <Oscuro />
      <div className="absolute inset-x-4 bottom-20 z-20 bg-surface rounded-[18px] p-3 shadow-xl flex flex-col gap-2">
        <span className="text-[10px] text-muted font-semibold">PASO 3 DE 7</span>
        <p className="text-sm"><b>Crear partido:</b> armás un partido, elegís cancha y horario, e invitás a tus amigos.</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Saltar</span>
          <span className="rounded-full bg-accent text-accent-ink border-2 border-outline text-xs font-semibold px-3 py-1">Siguiente →</span>
        </div>
      </div>
    </>
  );
}
function Op1Despues() {
  return (
    <Inicio
      extra={
        <div className="rounded-[18px] bg-[#154139] text-[#eaf4f0] p-3 flex items-center gap-2 relative">
          <span className="text-xl">🧭</span>
          <div className="flex-1">
            <p className="font-heading font-semibold text-sm">¿Primera vez por acá?</p>
            <p className="text-[11px] opacity-80">Hacé la guía, es un minuto</p>
          </div>
          <span className="rounded-full bg-[#f2c53d] text-[#1a1305] text-[11px] font-semibold px-2.5 py-1">Ver guía</span>
          <span className="absolute top-1 right-2 text-[10px] opacity-60">✕</span>
        </div>
      }
    />
  );
}

// ---------- Opción 2: hoja + diapositivas ----------
function Op2Pregunta() {
  return (
    <>
      <Inicio />
      <Oscuro />
      <div className="absolute inset-x-0 bottom-0 z-20 bg-surface rounded-t-[26px] p-4 flex flex-col gap-2 shadow-xl">
        <span className="mx-auto w-10 h-1 rounded-full bg-black/15" />
        <p className="font-heading font-bold">¿Hacemos un recorrido rápido?</p>
        <p className="text-xs text-muted">5 pantallas con lo más importante de la app.</p>
        <div className="grid grid-cols-2 gap-2">
          <span className="rounded-full bg-bg text-sm font-semibold py-2 text-center">Ahora no</span>
          <span className="rounded-full bg-accent text-accent-ink border-2 border-outline text-sm font-semibold py-2 text-center">Dale</span>
        </div>
      </div>
    </>
  );
}
function Op2Paso() {
  return (
    <div className="absolute inset-0 bg-[#154139] text-[#eaf4f0] p-5 flex flex-col items-center justify-center gap-4 text-center">
      <span className="text-[11px] opacity-70 self-end">Saltar</span>
      <div className="w-36 h-36 rounded-[28px] bg-[#f2c53d] text-[#1a1305] flex items-center justify-center text-6xl">⌚</div>
      <p className="font-heading font-bold text-lg">Marcadorcito</p>
      <p className="text-sm opacity-85">Llevá el tanteador por voz, con señas o desde el reloj, sin soltar la paleta.</p>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-2 rounded-full ${i === 2 ? "w-5 bg-[#f2c53d]" : "w-2 bg-white/40"}`} />
        ))}
      </div>
      <span className="rounded-full bg-[#f2c53d] text-[#1a1305] text-sm font-semibold px-6 py-2">Siguiente</span>
    </div>
  );
}
function Op2Despues() {
  return (
    <>
      <div className={`${tarjeta} p-4 flex flex-col items-center gap-1`}>
        <span className="w-12 h-12 rounded-full bg-bg flex items-center justify-center text-xl">🎾</span>
        <p className="font-heading font-semibold text-sm">Eduardo</p>
        <p className="text-[11px] text-muted">Nivel 4 · #6</p>
      </div>
      <p className="text-[10px] font-semibold text-muted uppercase pl-1">Ayuda</p>
      <div className={`${tarjeta} p-3 flex items-center gap-3`}>
        <span className="w-9 h-9 rounded-full bg-accent/25 flex items-center justify-center">📖</span>
        <div className="flex-1">
          <p className="font-heading font-semibold text-sm">Guía de la app</p>
          <p className="text-[11px] text-muted">Volvé a ver cómo funciona todo</p>
        </div>
        <span className="text-muted">›</span>
      </div>
      <div className={`${tarjeta} p-3 text-xs text-muted`}>Cómo funciona el ranking ›</div>
      <div className={`${tarjeta} p-3 text-xs text-muted`}>Datos · Teléfono, zona…</div>
    </>
  );
}

// ---------- Opción 3: Padelito te guía ----------
function Mascota({ texto, children }) {
  return (
    <div className="absolute bottom-3 inset-x-3 z-20 flex items-end gap-2">
      <span className="w-12 h-12 rounded-full bg-[#f2c53d] border-2 border-[#14261f] flex items-center justify-center text-2xl flex-shrink-0">🎾</span>
      <div className="bg-surface rounded-[16px] rounded-bl-none p-3 shadow-xl flex flex-col gap-2 flex-1">
        <p className="text-xs">{texto}</p>
        {children}
      </div>
    </div>
  );
}
function Op3Pregunta() {
  return (
    <>
      <Inicio />
      <Oscuro />
      <Mascota texto="¡Hola! Soy Padelito 🎾 ¿Querés que te muestre la app en un ratito?">
        <div className="flex gap-2">
          <span className="rounded-full bg-accent text-accent-ink border-2 border-outline text-[11px] font-semibold px-3 py-1">¡Dale!</span>
          <span className="rounded-full bg-bg text-[11px] font-semibold px-3 py-1">Después</span>
        </div>
      </Mascota>
    </>
  );
}
function Op3Paso() {
  return (
    <>
      <Inicio resaltar="marcador" />
      <Oscuro />
      <Mascota texto="👆 Este es el Marcadorcito: tocalo antes de jugar y te lleva el tanteador solo.">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted">2 de 7 · Saltar</span>
          <span className="font-semibold">Siguiente →</span>
        </div>
      </Mascota>
    </>
  );
}
function Op3Despues() {
  return (
    <>
      <Inicio />
      <span className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-[#154139] text-[#f2c53d] font-heading font-bold text-lg flex items-center justify-center shadow-lg z-20">
        ?
      </span>
      <span className="absolute bottom-16 right-3 bg-surface rounded-full text-[10px] px-2 py-1 shadow z-20">Ver la guía</span>
    </>
  );
}

const OPCIONES = [
  {
    id: "1",
    titulo: "1) Cartel + foco en la pantalla",
    desc: "Te pregunta con un cartel en el medio. La guía oscurece la pantalla y remarca en amarillo cada parte real de la app, con un globito que explica. Si decís 'Ahora no', queda una tarjeta en el inicio (se puede cerrar).",
    pantallas: [Op1Pregunta, Op1Paso, Op1Despues],
  },
  {
    id: "2",
    titulo: "2) Diapositivas",
    desc: "Te pregunta con una hoja que sube desde abajo. La guía son 5 pantallas a todo color, una por tema (partidos, Marcadorcito, ranking...), que pasás deslizando. Si decís 'Ahora no', queda en el perfil, en una sección 'Ayuda'.",
    pantallas: [Op2Pregunta, Op2Paso, Op2Despues],
  },
  {
    id: "3",
    titulo: "3) Padelito te guía",
    desc: "La pelotita de Padelito te habla con globitos de diálogo y te va señalando cada cosa en la pantalla real. Si decís 'Después', queda un botoncito '?' en la esquina para pedírsela cuando quieras.",
    pantallas: [Op3Pregunta, Op3Paso, Op3Despues],
  },
];

const TITULOS = ["1. La pregunta (primera vez)", "2. Un paso de la guía", "3. Si dijiste 'Ahora no'"];

export default function PruebaGuiaForm() {
  const [elegida, setElegida] = useState("1");
  const op = OPCIONES.find((o) => o.id === elegida);
  return (
    <div className="w-full max-w-[900px] flex flex-col gap-5 text-ink">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Guía de la app: 3 opciones</h1>
        <p className="text-sm text-muted">
          En cada opción: cómo te pregunta la primera vez, cómo se ve un paso de la guía y dónde queda si la dejás
          para después. Se pueden mezclar (por ejemplo, la pregunta de una con la guía de otra).
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {OPCIONES.map((o) => (
          <button
            key={o.id}
            onClick={() => setElegida(o.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold border-2 border-outline cursor-pointer ${elegida === o.id ? "bg-accent text-accent-ink" : "bg-surface"}`}
          >
            {o.titulo}
          </button>
        ))}
      </div>
      <p className="text-sm">{op.desc}</p>
      <div className="flex flex-wrap gap-5 justify-center">
        {op.pantallas.map((Pantalla, i) => (
          <Celu key={i} titulo={TITULOS[i]}>
            <Pantalla />
          </Celu>
        ))}
      </div>
    </div>
  );
}
