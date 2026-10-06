"use client";

import { useState } from "react";
import AnimacionInicio from "@/components/AnimacionInicio";

// Página de prueba de la animación de entrada: se repite con un botón y suena
// (el sonido arranca porque el botón es un toque real).
export default function PruebaAnimacionForm() {
  const [vuelta, setVuelta] = useState(0);
  const [sonido, setSonido] = useState(true);
  return (
    <div className="w-full max-w-md flex flex-col gap-4 text-ink">
      <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">Animación de entrada</h1>
      <p className="text-sm text-muted leading-relaxed">
        Así se ve al abrir la app la primera vez del día (ahí sale sin sonido y se saltea tocando la pantalla). Acá la podés repetir las veces que quieras.
      </p>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={sonido} onChange={(e) => setSonido(e.target.checked)} /> Con sonido
      </label>
      <button onClick={() => setVuelta((n) => n + 1)} className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer">
        Ver la animación
      </button>
      {vuelta > 0 && <AnimacionInicio key={vuelta} siempre sonido={sonido} />}
    </div>
  );
}
