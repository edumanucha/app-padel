"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";

// Efecto de desplazamiento entre las 4 pestañas principales (2026-09-13,
// a pedido del usuario): al navegar Home -> Jugadores -> Marcadorcito ->
// Perfil, el contenido nuevo entra deslizándose desde la derecha; al
// volver hacia atrás en ese orden, entra desde la izquierda -- como en
// cualquier app con pestañas, en vez del salto seco de antes. El orden
// de esta lista tiene que ser el mismo que el de BottomNav.js.
const ORDEN_TABS = ["/", "/jugadores", "/marcador-libre", "/perfil"];

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const direccionRef = useRef("ninguna");

  // Se calcula durante el render (no en un efecto) para que la clase ya
  // esté bien puesta en el primer pintado del contenido nuevo -- si se
  // calculara en un useEffect, se vería un frame sin animar antes de
  // que se aplique.
  if (prevPathnameRef.current !== pathname) {
    const indiceAnterior = ORDEN_TABS.indexOf(prevPathnameRef.current);
    const indiceNuevo = ORDEN_TABS.indexOf(pathname);
    if (indiceAnterior !== -1 && indiceNuevo !== -1 && indiceAnterior !== indiceNuevo) {
      direccionRef.current = indiceNuevo > indiceAnterior ? "adelante" : "atras";
    } else if (indiceNuevo === -1) {
      // Entrando a una vista de detalle (partido, jugador, cancha...):
      // sube desde abajo, como una hoja, para que se sienta distinto de
      // cambiar de pestaña (2026-09-13, a pedido del usuario).
      direccionRef.current = "sube";
    } else if (indiceAnterior === -1) {
      // Volviendo de un detalle a una pestaña.
      direccionRef.current = "vuelve";
    } else {
      direccionRef.current = "ninguna";
    }
    prevPathnameRef.current = pathname;
  }

  return (
    <div key={pathname} className={`page-transition page-transition-${direccionRef.current}`}>
      {children}
    </div>
  );
}
