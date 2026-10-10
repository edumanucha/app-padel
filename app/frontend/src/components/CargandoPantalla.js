"use client";

import { useEffect, useState } from "react";
import PelotaLoader from "@/components/PelotaLoader";

// "Cargando..." de pantalla completa que recién aparece si la espera pasa
// de 250 ms (2026-10-10, fluidez a pedido del usuario: "lo veo poco
// fluido"). Casi siempre la pantalla ya tiene la copia de la última vez
// (cachePantalla.js) y se muestra en unos milisegundos; antes, en ese
// instante igual se veía la pelotita aparecer y desaparecer, un parpadeo
// que hacía sentir trabado el cambio de pantalla.
export default function CargandoPantalla({ texto }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
      {visible && (
        <>
          <PelotaLoader />
          <p>{texto}</p>
        </>
      )}
    </div>
  );
}
