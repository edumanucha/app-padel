"use client";

import { useEffect, useRef, useState } from "react";

// Cuenta desde 0 hasta `valor` al aparecer en pantalla, en vez de mostrar
// el número final de una (2026-09-13, a pedido del usuario: se siente más
// "vivo"). `sufijo`/`prefijo` van pegados al número ya animado (ej. "#",
// "%"). Si `valor` cambia después (ej. cambia el filtro), vuelve a contar
// desde el valor anterior, no desde 0 -- así no "parpadea" en cada render.
export default function ContadorNumero({ valor, prefijo = "", sufijo = "", duracionMs = 600 }) {
  const [mostrado, setMostrado] = useState(0);
  const desdeRef = useRef(0);

  useEffect(() => {
    const desde = desdeRef.current;
    const hasta = Number(valor) || 0;
    if (desde === hasta) return;

    const inicio = performance.now();
    let raf;
    function tick(ahora) {
      const progreso = Math.min(1, (ahora - inicio) / duracionMs);
      const actual = Math.round(desde + (hasta - desde) * progreso);
      setMostrado(actual);
      if (progreso < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        desdeRef.current = hasta;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <>
      {prefijo}
      {mostrado}
      {sufijo}
    </>
  );
}
