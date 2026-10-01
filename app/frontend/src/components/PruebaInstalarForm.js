"use client";

import { useState } from "react";

// Maquetas de "Instalar la app" (2026-09-30, pedido del usuario: "si no
// está instalada, que aparezca el botón en la home al inicio y en el
// perfil; mostrame un mock con opciones"). Todo de ejemplo, no instala nada.

const tarjeta = "bg-surface text-ink rounded-[20px] shadow-[0_1px_3px_rgba(20,38,31,0.08)]";

function Celu({ titulo, children }) {
  return (
    <div className="flex flex-col gap-2 items-center">
      <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">{titulo}</span>
      <div className="w-[300px] rounded-[36px] border-[6px] border-[#14261f] bg-bg overflow-hidden">
        <div className="h-[560px] overflow-y-auto p-3 flex flex-col gap-3 text-ink">{children}</div>
        <div className="bg-[var(--nav-bg)] flex justify-around py-2 text-[10px] text-muted">
          <span>🏠 Home</span>
          <span>🏆 Jugadores</span>
          <span>🎾 Marcador</span>
          <span>👤 Perfil</span>
        </div>
      </div>
    </div>
  );
}

// Relleno de ejemplo para que se vea dónde cae el botón.
function SaludoHome() {
  return (
    <div className={`${tarjeta} p-3 flex items-center gap-3`}>
      <span className="w-10 h-10 rounded-full bg-bg flex items-center justify-center">🎾</span>
      <div>
        <p className="font-heading font-semibold">Hola, Eduardo</p>
        <p className="text-xs text-muted">412 puntos de ranking</p>
      </div>
    </div>
  );
}
function RestoHome() {
  return (
    <>
      <div className={`${tarjeta} p-3`}>
        <p className="font-heading font-semibold text-sm">Tu próximo partido</p>
        <p className="text-xs text-muted">Sáb 4/10 · 19:00 · Cancha Central</p>
      </div>
      <div className="rounded-[20px] bg-accent text-accent-ink border-2 border-outline p-4 font-heading font-bold">
        🎾 Marcadorcito
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["3", "#6", "59%"].map((n) => (
          <div key={n} className={`${tarjeta} p-2 text-center font-heading font-bold`}>{n}</div>
        ))}
      </div>
    </>
  );
}
function CabeceraPerfil() {
  return (
    <div className={`${tarjeta} p-4 flex flex-col items-center gap-1`}>
      <span className="w-14 h-14 rounded-full bg-bg flex items-center justify-center text-2xl">🎾</span>
      <p className="font-heading font-semibold">Eduardo</p>
      <p className="text-xs text-muted">Nivel 4 · #6 en el ranking</p>
    </div>
  );
}
function RestoPerfil() {
  return (
    <>
      <div className={`${tarjeta} p-3 text-sm font-heading font-semibold`}>Estadísticas ⌄</div>
      <div className={`${tarjeta} p-3 text-xs text-muted`}>Datos · Teléfono, zona, mano hábil…</div>
    </>
  );
}

// ---------- Opción 1: tarjeta destacada ----------
function TarjetaGrande() {
  return (
    <div className="rounded-[20px] bg-[#154139] text-[#eaf4f0] p-4 flex flex-col gap-3 relative">
      <span className="absolute top-3 right-3 text-xs opacity-70">✕</span>
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-[14px] bg-[#f2c53d] flex items-center justify-center text-2xl">📲</span>
        <div>
          <p className="font-heading font-bold">Instalá Padelito</p>
          <p className="text-xs opacity-80">Gratis · no ocupa casi nada</p>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-xs">
        <span>✅ Anda sin señal en la cancha</span>
        <span>✅ Manejás el marcador desde el reloj</span>
        <span>✅ Se abre de un toque, como una app más</span>
      </div>
      <span className="rounded-full bg-[#f2c53d] text-[#1a1305] text-sm font-semibold py-2 text-center">Instalar app</span>
    </div>
  );
}
function FilaPerfil1() {
  return (
    <div className={`${tarjeta} p-3 flex items-center gap-3`}>
      <span className="w-10 h-10 rounded-full bg-accent/25 flex items-center justify-center">📲</span>
      <div className="flex-1">
        <p className="font-heading font-semibold text-sm">Instalar la app</p>
        <p className="text-xs text-muted">Todavía la usás desde el navegador</p>
      </div>
      <span className="rounded-full bg-accent text-accent-ink border-2 border-outline text-xs font-semibold px-3 py-1">Instalar</span>
    </div>
  );
}

// ---------- Opción 2: franja finita arriba ----------
function Franja() {
  return (
    <div className="rounded-full bg-accent text-accent-ink border-2 border-outline px-3 py-2 flex items-center gap-2 text-xs font-semibold">
      <span>📲</span>
      <span className="flex-1">Instalá la app: más rápida y anda sin señal</span>
      <span className="rounded-full bg-[#14261f] text-[#f2c53d] px-2.5 py-1">Instalar</span>
      <span className="opacity-60">✕</span>
    </div>
  );
}
function BotonPerfil2() {
  return (
    <span className="rounded-full bg-surface text-ink border-2 border-dashed border-accent py-2.5 text-center text-sm font-heading font-semibold">
      📲 Instalar la app en este celu
    </span>
  );
}

// ---------- Opción 3: botón fijo flotante ----------
function Flotante() {
  return (
    <div className="sticky bottom-0 self-end">
      <span className="rounded-full bg-[#154139] text-[#f2c53d] shadow-lg px-4 py-2.5 text-sm font-heading font-semibold flex items-center gap-2">
        📲 Instalar app
      </span>
    </div>
  );
}
function EstadoPerfil3() {
  return (
    <div className={`${tarjeta} p-3 flex flex-col gap-2`}>
      <p className="font-heading font-semibold text-sm">La app</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Estado</span>
        <span className="bg-accent-3/20 rounded-full px-2 py-0.5">🌐 Desde el navegador</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Sin señal y reloj</span>
        <span>Solo con la app instalada</span>
      </div>
      <span className="rounded-full bg-accent text-accent-ink border-2 border-outline text-sm font-semibold py-2 text-center">Instalar</span>
    </div>
  );
}

const OPCIONES = [
  {
    id: "1",
    titulo: "1) Tarjeta destacada",
    desc: "En el inicio, primera tarjeta en verde oscuro con los beneficios (sin señal, reloj, un toque). Se puede cerrar con ✕ y vuelve a aparecer otro día. En el perfil, una fila con botón 'Instalar'.",
    home: (
      <>
        <TarjetaGrande />
        <SaludoHome />
        <RestoHome />
      </>
    ),
    perfil: (
      <>
        <CabeceraPerfil />
        <FilaPerfil1 />
        <RestoPerfil />
      </>
    ),
  },
  {
    id: "2",
    titulo: "2) Franja finita",
    desc: "En el inicio, una franja amarilla chiquita arriba de todo: no tapa nada y se cierra con ✕. En el perfil, un botón punteado debajo de tus datos.",
    home: (
      <>
        <Franja />
        <SaludoHome />
        <RestoHome />
      </>
    ),
    perfil: (
      <>
        <CabeceraPerfil />
        <BotonPerfil2 />
        <RestoPerfil />
      </>
    ),
  },
  {
    id: "3",
    titulo: "3) Botón flotante",
    desc: "En el inicio, un botón redondo flotando abajo a la derecha, siempre a mano mientras bajás. En el perfil, una tarjeta 'La app' que dice si la estás usando desde el navegador y qué te perdés.",
    home: (
      <>
        <SaludoHome />
        <RestoHome />
        <RestoHome />
        <Flotante />
      </>
    ),
    perfil: (
      <>
        <CabeceraPerfil />
        <EstadoPerfil3 />
        <RestoPerfil />
      </>
    ),
  },
];

export default function PruebaInstalarForm() {
  const [elegida, setElegida] = useState("1");
  const op = OPCIONES.find((o) => o.id === elegida);
  return (
    <div className="w-full max-w-[760px] flex flex-col gap-5 text-ink">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Botón &quot;Instalar app&quot;: 3 opciones</h1>
        <p className="text-sm text-muted">
          Solo aparece si la app no está instalada. Si el navegador no deja instalar con un toque, el botón abre el paso
          a paso (Android: menú ⋮ → &quot;Instalar app&quot;; iPhone: Compartir → &quot;Agregar a inicio&quot;).
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
      <div className="flex flex-wrap gap-6 justify-center">
        <Celu titulo="🏠 Inicio">{op.home}</Celu>
        <Celu titulo="👤 Perfil">{op.perfil}</Celu>
      </div>
    </div>
  );
}
