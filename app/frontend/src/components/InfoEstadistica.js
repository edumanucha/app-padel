"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconoAyuda } from "@/components/Icons";

// Botoncito "(i)" para cada estadística de Marcadorcito (2026-09-13, a
// pedido del usuario: "quiero que todas las estadísticas tengan la opción
// de info si se clickea que te dé un detalle de qué se evalúa y para
// qué" -- "todas!!"). Toca para abrir/cerrar un textito explicativo corto,
// no tooltip por hover (en el celular no hay hover).
// 2026-10-08 (pedido del usuario: "se ven por la mitad, no se llega a leer
// ninguno"): el cartelito se dibujaba dentro de la caja de la estadística y
// quedaba cortado por los bordes. Ahora va encima de toda la pantalla
// (portal a <body>), al lado del (?), siempre dentro de la pantalla con 12 px
// de margen; se cierra tocando afuera o al hacer scroll.
const ANCHO = 240;
const MARGEN = 12;

// `color` (D-29): para usarlo sobre el cartel verde, donde el gris de
// siempre casi no se ve.
export default function InfoEstadistica({ texto, color = "text-muted" }) {
  const [pos, setPos] = useState(null);
  const botonRef = useRef(null);

  useEffect(() => {
    if (!pos) return;
    const cerrar = () => setPos(null);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    document.addEventListener("pointerdown", cerrar);
    return () => {
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
      document.removeEventListener("pointerdown", cerrar);
    };
  }, [pos]);

  if (!texto) return null;

  function alternar(e) {
    e.stopPropagation();
    e.preventDefault();
    if (pos) {
      setPos(null);
      return;
    }
    const r = botonRef.current.getBoundingClientRect();
    const ancho = Math.min(ANCHO, window.innerWidth - 2 * MARGEN);
    const izquierda = Math.min(Math.max(MARGEN, r.right - ancho), window.innerWidth - ancho - MARGEN);
    // Abajo del (?); si no entra (cerca del borde de abajo), arriba.
    const abajo = window.innerHeight - r.bottom > 160;
    setPos({ izquierda, ancho, top: abajo ? r.bottom + 6 : null, bottom: abajo ? null : window.innerHeight - r.top + 6 });
  }

  return (
    <span className="relative inline-flex flex-shrink-0">
      <button
        ref={botonRef}
        type="button"
        onClick={alternar}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="info"
        aria-expanded={!!pos}
        className={`${color} cursor-pointer flex items-center opacity-70`}
      >
        <IconoAyuda width={13} height={13} />
      </button>
      {pos &&
        createPortal(
          <span
            role="tooltip"
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: "fixed", left: pos.izquierda, width: pos.ancho, top: pos.top ?? undefined, bottom: pos.bottom ?? undefined, zIndex: 80 }}
            className="bg-surface text-ink text-[13px] font-normal normal-case tracking-normal leading-snug text-left rounded-[10px] p-3 border border-ink/10 shadow-[0_4px_16px_rgba(20,38,31,0.22)]"
          >
            {texto}
          </span>,
          document.body
        )}
    </span>
  );
}
