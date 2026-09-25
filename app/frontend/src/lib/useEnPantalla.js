"use client";

import { useEffect, useRef, useState } from "react";

// Detecta cuándo un elemento entra en pantalla al hacer scroll (2026-09-13,
// a pedido del usuario: las animaciones de "entrada" tienen que andar en
// celular, donde no existe el hover del mouse) -- una sola vez: apenas se
// ve por primera vez, se desconecta el observer (no vuelve a dispararse si
// se sale y entra de nuevo).
export function useEnPantalla(margen = "0px 0px -60px 0px") {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: margen, threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, visible];
}
