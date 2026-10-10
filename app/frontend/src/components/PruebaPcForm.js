"use client";

import { useState } from "react";

// Maquetas del inicio para compu (2026-09-30, pedido del usuario: "adaptá
// cada una de las cards a la versión web, pasame opciones tipo mock, versión
// desde PC y versión desde celular"). Todo es de ejemplo: no lee datos.

const tarjeta = "bg-surface text-ink rounded-[20px] shadow-[0_1px_3px_rgba(20,38,31,0.08)]";

const ACCESOS = [
  { icono: "🏆", titulo: "Jugadores", desc: "Ranking y perfiles", color: "bg-surface" },
  { icono: "💬", titulo: "Mensajes", desc: "Chat con tus rivales", color: "bg-surface" },
  { icono: "✉️", titulo: "Invitaciones", desc: "Partidos a los que te sumaron", color: "bg-surface" },
  { icono: "📡", titulo: "Disponibilidad", desc: "Cuándo podés jugar", color: "bg-accent-2/15" },
  { icono: "👥", titulo: "Compañero fijo", desc: "Tu pareja de siempre", color: "bg-accent-2/15" },
  { icono: "📍", titulo: "Canchas", desc: "Dónde jugar", color: "bg-accent-3/15" },
  { icono: "📋", titulo: "Mis partidos", desc: "Tu historial", color: "bg-accent-3/15" },
];

function Subtitulo({ children }) {
  return <span className="text-[11px] font-semibold tracking-wider text-muted uppercase pl-1">{children}</span>;
}

function Saludo({ grande }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`font-heading font-semibold ${grande ? "text-2xl" : "text-lg"}`}>Hola, Eduardo 👋</p>
        <p className="text-xs text-muted">Pádel · Mendoza</p>
      </div>
      <div className="flex gap-2 text-lg">
        <span className={`${tarjeta} w-9 h-9 flex items-center justify-center`}>🔔</span>
        <span className={`${tarjeta} w-9 h-9 flex items-center justify-center`}>⚙️</span>
      </div>
    </div>
  );
}

function Proximo() {
  return (
    <div className={`${tarjeta} p-4`}>
      <p className="font-heading font-semibold text-sm">Tu próximo partido</p>
      <p className="text-sm text-muted">Sáb 4/10 · 19:00 · Cancha Central · faltan 2 jugadores</p>
    </div>
  );
}

function Marcadorcito({ grande }) {
  return (
    <div className={`rounded-[20px] bg-accent text-accent-ink border-2 border-outline flex items-center gap-4 ${grande ? "p-6" : "p-4"}`}>
      <div className={`whitespace-nowrap shrink-0 bg-[#154139] text-[#f2c53d] font-mono rounded-xl ${grande ? "text-3xl px-5 py-3" : "text-xl px-3 py-2"}`}>6-4</div>
      <div>
        <p className={`font-heading font-bold ${grande ? "text-2xl" : "text-lg"}`}>🎾 Marcadorcito</p>
        <p className="text-xs">Llevá el tanteador por voz, gesto o botón.</p>
      </div>
    </div>
  );
}

function BotonesJugar() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <span className="rounded-full bg-accent text-accent-ink border-2 border-outline text-sm font-semibold py-2.5 text-center">📅 Crear partido</span>
      <span className="rounded-full bg-accent text-accent-ink border-2 border-outline text-sm font-semibold py-2.5 text-center">🔍 Partidos abiertos</span>
    </div>
  );
}

function Stats({ cuatro }) {
  const items = [
    ["3", "Racha ganada"],
    ["#6", "de 80 en el ranking"],
    ["59%", "17 jugados"],
    ...(cuatro ? [["7-5", "Último partido"]] : []),
  ];
  return (
    <div className={`grid gap-3 ${cuatro ? "grid-cols-4" : "grid-cols-3"}`}>
      {items.map(([n, l]) => (
        <div key={l} className={`${tarjeta} p-3 text-center`}>
          <p className="font-heading font-bold text-xl">{n}</p>
          <p className="text-[11px] text-muted">{l}</p>
        </div>
      ))}
    </div>
  );
}

function Ultimo() {
  return (
    <div className={`${tarjeta} p-4`}>
      <p className="font-heading font-semibold text-sm">Último partido jugado</p>
      <p className="text-sm text-muted">🏆 Ganaste vs. Rival 1 / Rival 2 (7-5, 7-5)</p>
    </div>
  );
}

function Tip() {
  return (
    <div className={`${tarjeta} p-4`}>
      <p className="font-heading font-semibold text-sm">Tip de pádel</p>
      <p className="text-sm text-muted">Reseña: paleta liviana y cómoda para aprender.</p>
      <p className="text-xs underline mt-1">Leer más ↗</p>
    </div>
  );
}

function Sponsor() {
  return (
    <div className="rounded-[20px] bg-[#efedd8] p-4 text-ink">
      <p className="text-[10px] text-muted text-right">AUSPICIADO · EJEMPLO</p>
      <p className="font-heading font-semibold text-sm">🛒 Pro Shop</p>
      <p className="text-sm">20% OFF en paletas esta semana</p>
    </div>
  );
}

function Acceso({ a, compacto }) {
  return (
    <div className={`${tarjeta} ${a.color} ${compacto ? "p-3" : "p-4"} flex items-center gap-3`}>
      <span className="w-9 h-9 rounded-full bg-bg flex items-center justify-center">{a.icono}</span>
      <div className="min-w-0">
        <p className="font-heading font-semibold text-sm">{a.titulo}</p>
        {!compacto && <p className="text-xs text-muted truncate">{a.desc}</p>}
      </div>
    </div>
  );
}

// ---------- Celular (igual en las 3: es como se ve hoy) ----------
function Celu() {
  return (
    <div className="w-[300px] shrink-0 rounded-[36px] border-[6px] border-[#14261f] bg-bg overflow-hidden">
      <div className="h-[600px] overflow-y-auto p-3 flex flex-col gap-3 text-ink">
        <Saludo />
        <Proximo />
        <Subtitulo>Jugar</Subtitulo>
        <Marcadorcito />
        <BotonesJugar />
        <Ultimo />
        <Stats />
        <Sponsor />
        <Tip />
        <Subtitulo>Comunidad y más</Subtitulo>
        <div className="grid grid-cols-2 gap-2">
          {ACCESOS.map((a) => (
            <Acceso key={a.titulo} a={a} compacto />
          ))}
        </div>
      </div>
      <div className="bg-[var(--nav-bg)] flex justify-around py-2 text-[10px] text-muted">
        <span>🏠 Home</span>
        <span>🏆 Jugadores</span>
        <span>🎾 Marcador</span>
        <span>👤 Perfil</span>
      </div>
    </div>
  );
}

// ---------- Compu ----------
function Navegador({ children }) {
  return (
    <div className="w-[1000px] shrink-0 rounded-xl border border-black/15 overflow-hidden shadow-lg">
      <div className="bg-[#dfe3e0] px-3 py-2 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-[#f2814f]" />
        <span className="w-3 h-3 rounded-full bg-[#f2c53d]" />
        <span className="w-3 h-3 rounded-full bg-[#2fb5ad]" />
        <span className="ml-3 flex-1 bg-white rounded-full text-xs text-muted px-3 py-1">padelitoapp.com.ar</span>
      </div>
      <div className="bg-bg text-ink h-[600px] overflow-y-auto">{children}</div>
    </div>
  );
}

// A) Barra lateral fija + contenido + columna derecha
function PcLateral() {
  return (
    <div className="flex h-full">
      <aside className="w-52 shrink-0 bg-surface border-r border-black/5 p-4 flex flex-col gap-1 text-sm">
        <p className="font-heading font-bold text-lg mb-3">🎾 Padelito</p>
        {["🏠 Inicio", "🏆 Jugadores", "🎾 Marcadorcito", "💬 Mensajes", "✉️ Invitaciones", "📍 Canchas", "📋 Mis partidos", "👤 Perfil"].map((x, i) => (
          <span key={x} className={`px-3 py-2 rounded-full ${i === 0 ? "bg-accent text-accent-ink font-semibold" : ""}`}>{x}</span>
        ))}
      </aside>
      <div className="flex-1 p-6 grid grid-cols-[1fr_280px] gap-5 content-start">
        <div className="col-span-2"><Saludo grande /></div>
        <div className="flex flex-col gap-4">
          <Marcadorcito grande />
          <BotonesJugar />
          <Stats cuatro />
          <Proximo />
        </div>
        <div className="flex flex-col gap-4">
          <Ultimo />
          <Tip />
          <Sponsor />
        </div>
      </div>
    </div>
  );
}

// B) Banda principal arriba + fila de números + grilla de accesos
function PcBanda() {
  return (
    <div className="p-6 flex flex-col gap-5">
      <Saludo grande />
      <div className="grid grid-cols-[1.4fr_1fr] gap-5">
        <div className="flex flex-col gap-3">
          <Marcadorcito grande />
          <BotonesJugar />
        </div>
        <div className="flex flex-col gap-3">
          <Proximo />
          <Ultimo />
        </div>
      </div>
      <Stats cuatro />
      <Subtitulo>Accesos</Subtitulo>
      <div className="grid grid-cols-4 gap-3">
        {ACCESOS.map((a) => (
          <Acceso key={a.titulo} a={a} />
        ))}
        <Acceso a={{ icono: "👤", titulo: "Mi perfil", desc: "Tus datos", color: "bg-surface" }} />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Tip />
        <Sponsor />
      </div>
    </div>
  );
}

// C) Barra de arriba (sin nav de abajo) + tablero 2/3 - 1/3
function PcTablero() {
  return (
    <div>
      <header className="bg-surface border-b border-black/5 px-6 py-3 flex items-center gap-6 text-sm">
        <span className="font-heading font-bold text-lg">🎾 Padelito</span>
        {["Inicio", "Jugadores", "Marcadorcito", "Mis partidos", "Canchas"].map((x, i) => (
          <span key={x} className={i === 0 ? "font-semibold border-b-2 border-accent pb-0.5" : "text-muted"}>{x}</span>
        ))}
        <span className="ml-auto flex gap-3 text-lg">🔔 💬 <span className="w-8 h-8 rounded-full bg-accent text-sm flex items-center justify-center">E</span></span>
      </header>
      <div className="p-6 grid grid-cols-3 gap-5 content-start">
        <div className="col-span-2 flex flex-col gap-4">
          <p className="font-heading font-semibold text-2xl">Hola, Eduardo 👋</p>
          <Marcadorcito grande />
          <BotonesJugar />
          <Stats />
          <div className="grid grid-cols-2 gap-4">
            <Proximo />
            <Ultimo />
          </div>
          <Tip />
        </div>
        <div className="flex flex-col gap-3">
          <Subtitulo>Accesos rápidos</Subtitulo>
          {ACCESOS.map((a) => (
            <Acceso key={a.titulo} a={a} compacto />
          ))}
          <Sponsor />
        </div>
      </div>
    </div>
  );
}

const OPCIONES = [
  {
    id: "A",
    titulo: "A) Menú al costado",
    desc: "Como Gmail o Spotify: el menú queda fijo a la izquierda (reemplaza la barra de abajo). En el medio, lo de jugar en grande; a la derecha, último partido, tip y publicidad.",
    Pc: PcLateral,
  },
  {
    id: "B",
    titulo: "B) Banda arriba + accesos en grilla",
    desc: "Arriba, el Marcadorcito grande con tu próximo y último partido al lado. Abajo, los números en una fila y todos los accesos como tarjetas iguales de a 4.",
    Pc: PcBanda,
  },
  {
    id: "C",
    titulo: "C) Barra arriba + tablero",
    desc: "Como una web clásica: menú arriba (sin barra abajo). Dos tercios para lo principal y un tercio a la derecha con los accesos rápidos en lista.",
    Pc: PcTablero,
  },
];

export default function PruebaPcForm() {
  const [elegida, setElegida] = useState("A");
  const op = OPCIONES.find((o) => o.id === elegida);
  return (
    <div className="w-full max-w-[1400px] flex flex-col gap-5 text-ink">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Inicio en la compu: 3 opciones</h1>
        <p className="text-sm text-muted">
          Datos de ejemplo. El celu queda como hoy en las tres; lo que cambia es la compu. La que elijas la aplico al
          inicio y la misma idea al resto de las pantallas.
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
      <div className="flex flex-wrap gap-6 items-start overflow-x-auto pb-4">
        <div className="flex flex-col gap-2">
          <Subtitulo>💻 Compu</Subtitulo>
          <Navegador>
            <op.Pc />
          </Navegador>
        </div>
        <div className="flex flex-col gap-2">
          <Subtitulo>📱 Celu</Subtitulo>
          <Celu />
        </div>
      </div>
    </div>
  );
}
