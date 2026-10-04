"use client";

import { useEffect, useRef } from "react";

// Franja tipo Pong debajo de los puntos del Marcadorcito (2026-10-04, pedido
// del usuario): una cancha de pádel vista desde arriba (laterales, líneas de
// saque, línea central y red), con dos jugadores por pareja quietos en los
// fondos (A a la izquierda, B a la derecha). Una pelotita rebota entre las
// dos parejas y cada jugador que la devuelve hace un destello. Cuando alguien
// hace un punto, la pelota acelera, rebota en la pareja que ganó y se cuela
// por el pasillo del medio entre los dos rivales; ahí se iluminan los dos
// jugadores de quien ganó. Después vuelve al rebote lento.
// `evento` = { lado: "A" | "B", n } y cambia con cada punto sumado.
// `compacto` = versión más finita para el modo apaisado (va detrás de los puntos).
const COLOR_PALA = "rgba(234,244,240,0.85)";

export default function PongPunto({ evento, compacto = false }) {
  const franjaRef = useRef(null);
  const bolaRef = useRef(null);
  const palasRef = useRef({ A: [], B: [] });
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
    // hasta colarse entre los rivales.
    est.dir = evento.lado === "A" ? -1 : 1;
  }, [evento]);

  useEffect(() => {
    const franja = franjaRef.current;
    if (!franja) return;
    const reducido = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const H = compacto ? 16 : 30;
    const S = compacto ? 5 : 6; // lado de la pelota
    const centro = (H - S) / 2;
    const amplitud = centro - 2;
    let raf = 0;
    let ultimo = performance.now();

    function destello(lado, ms) {
      const palas = palasRef.current[lado];
      palas.forEach((p) => p && (p.style.background = "#f2c53d"));
      setTimeout(() => palas.forEach((p) => p && (p.style.background = COLOR_PALA)), ms);
    }

    function cuadro(ahora) {
      const dt = Math.min(0.05, (ahora - ultimo) / 1000);
      ultimo = ahora;
      const W = franja.clientWidth;
      const est = estadoRef.current;
      if (est.x === null) est.x = W / 2;
      est.t += dt;
      const izq = 12;
      const der = W - 18;
      const rapido = est.modo !== "idle";
      const v = rapido ? 620 : 190;
      const onda = centro + Math.sin(est.t * (rapido ? 13 : 7)) * amplitud;
      let y = onda;

      if (est.modo === "idle") {
        est.x += est.dir * v * dt;
        if (est.x <= izq) { est.x = izq; est.dir = 1; destello("A", 120); }
        if (est.x >= der) { est.x = der; est.dir = -1; destello("B", 120); }
      } else if (est.modo === "punto") {
        est.x += est.dir * v * dt;
        if (est.ganador === "A") {
          if (est.dir === -1 && est.x <= izq) { est.x = izq; est.dir = 1; destello("A", 120); }
          if (est.dir === 1) {
            const k = Math.min(1, Math.max(0, (est.x - W * 0.5) / (W * 0.4)));
            y = onda * (1 - k) + centro * k;
            if (est.x >= W + 10) { est.modo = "fin"; est.fin = ahora; destello("A", 650); }
          }
        } else {
          if (est.dir === 1 && est.x >= der) { est.x = der; est.dir = -1; destello("B", 120); }
          if (est.dir === -1) {
            const k = Math.min(1, Math.max(0, (W * 0.5 - est.x) / (W * 0.4)));
            y = onda * (1 - k) + centro * k;
            if (est.x <= -20) { est.modo = "fin"; est.fin = ahora; destello("B", 650); }
          }
        }
      } else if (est.modo === "fin" && ahora - est.fin > 700) {
        est.modo = "idle";
        est.x = W / 2;
        est.dir = est.ganador === "A" ? 1 : -1;
      }

      if (bolaRef.current) bolaRef.current.style.transform = `translate(${est.x}px, ${y}px)`;
      raf = requestAnimationFrame(cuadro);
    }

    // Con "reducir movimiento" la pelota queda quieta en el medio y solo
    // se iluminan los jugadores de quien hizo el punto.
    if (reducido) {
      if (bolaRef.current) bolaRef.current.style.transform = `translate(${franja.clientWidth / 2}px, ${centro}px)`;
      return;
    }
    raf = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(raf);
  }, [compacto]);

  const linea = compacto ? "rgba(234,244,240,0.28)" : "rgba(234,244,240,0.5)";
  const alto = compacto ? 16 : 30;
  const palaAlto = compacto ? 5 : 8;
  const palaEstilo = (lado, abajo) => ({
    position: "absolute",
    [lado]: 4,
    top: abajo ? alto - palaAlto - 3 : 3,
    width: 4,
    height: palaAlto,
    borderRadius: 2,
    background: COLOR_PALA,
    transition: "background 0.12s",
  });
  const asignar = (lado, i) => (el) => {
    palasRef.current[lado][i] = el;
  };

  return (
    <div aria-hidden="true" className="w-full relative" style={{ padding: compacto ? "2px 0" : "4px 0" }}>
      <div
        ref={franjaRef}
        className="relative overflow-hidden"
        style={{
          height: alto,
          borderTop: `2px solid ${linea}`,
          borderBottom: `2px solid ${linea}`,
          background: compacto ? "rgba(53,92,128,0.12)" : "rgba(53,92,128,0.28)",
        }}
      >
        <div style={{ position: "absolute", left: "24%", top: 0, bottom: 0, borderLeft: `2px solid ${linea}` }} />
        <div style={{ position: "absolute", left: "76%", top: 0, bottom: 0, borderLeft: `2px solid ${linea}` }} />
        <div style={{ position: "absolute", left: "24%", right: "24%", top: "50%", marginTop: -1, borderTop: `2px solid ${linea}` }} />
        <div ref={asignar("A", 0)} style={palaEstilo("left", false)} />
        <div ref={asignar("A", 1)} style={palaEstilo("left", true)} />
        <div ref={asignar("B", 0)} style={palaEstilo("right", false)} />
        <div ref={asignar("B", 1)} style={palaEstilo("right", true)} />
        <div ref={bolaRef} style={{ position: "absolute", left: 0, top: 0, width: compacto ? 5 : 6, height: compacto ? 5 : 6, background: "#f2c53d" }} />
      </div>
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, marginLeft: -1, borderLeft: `3px solid ${compacto ? "rgba(234,244,240,0.5)" : "#eaf4f0"}` }} />
    </div>
  );
}
