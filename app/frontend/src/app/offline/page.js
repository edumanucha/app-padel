"use client";

import { IconoSinConexion } from "@/components/Icons";

// Pantalla de respaldo sin conexión (2026-09-13, PWA -- "modo sin
// conexión", alcance chico: solo evitar el error feo del navegador). El
// service worker (public/sw.js) muestra esta pantalla en vez de esa
// cuando falla una navegación por falta de señal. No guarda datos ni
// funciona de verdad sin conexión -- solo un aviso propio de la app en
// vez de "No hay conexión a Internet" del navegador.
export default function OfflinePage() {
  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center gap-4 py-12">
      <span className="w-16 h-16 rounded-full bg-bg flex items-center justify-center text-muted">
        <IconoSinConexion width={32} height={32} />
      </span>
      <h1 className="font-heading text-2xl font-semibold">Sin conexión</h1>
      <p className="text-muted text-sm">
        Padelito necesita internet para cargar tus partidos y tu perfil. Revisá tu conexión y volvé a intentar.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
      >
        Reintentar
      </button>
    </div>
  );
}
