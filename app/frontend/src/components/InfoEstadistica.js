"use client";

import { useState } from "react";
import { IconoAyuda } from "@/components/Icons";

// Botoncito "(i)" para cada estadística de Marcadorcito (2026-09-13, a
// pedido del usuario: "quiero que todas las estadísticas tengan la opción
// de info si se clickea que te dé un detalle de qué se evalúa y para
// qué" -- "todas!!"). Toca para abrir/cerrar un textito explicativo corto,
// no tooltip por hover (en el celular no hay hover).
export default function InfoEstadistica({ texto }) {
  const [abierto, setAbierto] = useState(false);
  if (!texto) return null;
  return (
    <span className="relative inline-flex flex-shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setAbierto((v) => !v);
        }}
        aria-label="info"
        className="text-muted cursor-pointer flex items-center opacity-70"
      >
        <IconoAyuda width={13} height={13} />
      </button>
      {abierto && (
        <span className="absolute z-20 top-full right-0 mt-1 w-52 bg-surface text-ink text-xs font-normal normal-case tracking-normal leading-snug rounded-[10px] p-2.5 shadow-[0_2px_8px_rgba(20,38,31,0.18)]">
          {texto}
        </span>
      )}
    </span>
  );
}
