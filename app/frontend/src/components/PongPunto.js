"use client";

import { useEffect, useRef } from "react";

// Franja tipo Pong debajo de los puntos del Marcadorcito (2026-10-04, pedido
// del usuario, versión A de la maqueta): una pelotita cuadrada rebota despacio
// entre A (izquierda) y B (derecha). Cuando alguien hace un punto acelera,
// rebota en la pala de quien lo hizo y le pasa por al lado a la del rival; ahí
// se ilumina la pala de quien ganó el punto. Después vuelve al rebote lento.
// `evento` = { lado: "A" | "B", n } y cambia con cada punto sumado.
export default function PongPunto({ evento }) {
  const franjaRef = useRef(null);
  const bolaRef = useRef(null);
  const palaARef = useRef(null);
  const palaBRef = useRef(null);
  const eventoRef = useRef(null);
  const estadoRef = useRef({ x: null, dir: 1, modo: "idle", ganador: null, fin: 0, t: 0 });

  // Un punto nuevo arranca la jugada (si ya hay una en curso, la reemplaza).
  useEffect(() => {
    if (!evento || evento === eventoRef.current) return;
    eventoRef.current = evento;
    const est = estadoRef.current;
    est.modo = "punto";
    est.ganador = evento.lado;
    // La pelota va hacia quien hizo el punto, rebota en su pala y sigue
    // hasta pasar la del rival.
    est.dir = evento.lado === "A" ? -1 : 1;
  }, [evento]);

  useEffect(() => {
    const franja = franjaRef.current;
    if (!franja) return;
    const reducido = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let ultimo = performance.now();

    function brillar(lado) {
      const pala = lado === "A" ? palaARef.current : palaBRef.current;
      if (!pala) return;
      pala.style.background = "#f2c53d";
      pala.style.transform = "scaleY(1.25)";
      setTimeout(() => {
        pala.style.background = "";
        pala.style.transform = "";
      }, 650);
    }

    function cuadro(ahora) {
      const dt = Math.min(0.05, (ahora - ultimo) / 1000);
      ultimo = ahora;
      const W = franja.clientWidth;
      const est = estadoRef.current;
      if (est.x === null) est.x = W / 2;
      est.t += dt;
      const izq = 10;
      const der = W - 20;
      const rapido = est.modo !== "idle";
      const v = rapido ? 320 : 80;

      if (est.modo === "idle") {
        est.x += est.dir * v * dt;
        if (est.x <= izq) { est.x = izq; est.dir = 1; }
        if (est.x >= der) { est.x = der; est.dir = -1; }
      } else if (est.modo === "punto") {
        est.x += est.dir * v * dt;
        if (est.ganador === "A") {
          if (est.dir === -1 && est.x <= izq) est.dir = 1;
          if (est.dir === 1 && est.x >= W + 10) { est.modo = "fin"; est.fin = ahora; brillar("A"); }
        } else {
          if (est.dir === 1 && est.x >= der) est.dir = -1;
          if (est.dir === -1 && est.x <= -20) { est.modo = "fin"; est.fin = ahora; brillar("B"); }
        }
      } else if (est.modo === "fin" && ahora - est.fin > 700) {
        est.modo = "idle";
        est.x = W / 2;
        est.dir = est.ganador === "A" ? 1 : -1;
      }

      const y = Math.sin(est.t * (rapido ? 9 : 4)) * (rapido ? 5 : 4);
      if (bolaRef.current) bolaRef.current.style.transform = `translate(${est.x}px, ${y}px)`;
      raf = requestAnimationFrame(cuadro);
    }

    // Con "reducir movimiento" la pelota queda quieta en el medio y solo
    // se ilumina la pala de quien hizo el punto.
    if (reducido) {
      if (bolaRef.current) bolaRef.current.style.transform = `translate(${franja.clientWidth / 2}px, 0)`;
      return;
    }
    raf = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div aria-hidden="true" className="w-full">
      <div ref={franjaRef} className="relative h-[22px] overflow-hidden" style={{ borderTop: "1px dashed rgba(234,244,240,0.22)", borderBottom: "1px dashed rgba(234,244,240,0.22)" }}>
        <div ref={palaARef} className="absolute left-1 top-[3px] w-1 h-4 rounded-sm transition-all duration-150" style={{ background: "rgba(234,244,240,0.55)" }} />
        <div ref={palaBRef} className="absolute right-1 top-[3px] w-1 h-4 rounded-sm transition-all duration-150" style={{ background: "rgba(234,244,240,0.55)" }} />
        <div className="absolute left-1/2 top-0 bottom-0" style={{ borderLeft: "1px dotted rgba(234,244,240,0.22)" }} />
        <div ref={bolaRef} className="absolute left-0 top-[6px] w-[10px] h-[10px]" style={{ background: "#f2c53d" }} />
      </div>
    </div>
  );
}
