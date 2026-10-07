"use client";

import { useEffect, useRef, useState } from "react";

// Animación de entrada (2026-10-06, armada con el usuario en 8 versiones):
// sobre fondo claro y con la cámara cerca, la pelota del logo entra picando,
// se frena con "40-15" y la cámara se aleja hasta mostrar "padelito" con la
// pelota como punto de la i (igual al encabezado). ~3 s.
// Solo la primera vez del día, se saltea con un toque, sin sonido (el
// navegador no deja sonar antes de un toque) y no aparece si el celu pide
// reducir movimiento.
const CLAVE = "padelito_animacion_dia";
const DUR = 2.9;

const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (p) => 1 - Math.pow(1 - p, 3);
const eio = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

// Props para la página de prueba: `siempre` (sin el límite de una vez por día
// ni la exclusión de /pruebas) y `sonido` (piques, beep de punto y game).
export default function AnimacionInicio({ siempre = false, sonido = false, onFin } = {}) {
  const [ver, setVer] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const refs = { cam: useRef(null), pel: useRef(null), cost: useRef(null), num: useRef(null), nombre: useRef(null) };

  useEffect(() => {
    try {
      // ?animacion en la dirección (p. ej. /?animacion) la muestra aunque ya
      // se haya visto hoy: sirve para ver la app "desde cero".
      if (siempre || new URLSearchParams(window.location.search).has("animacion")) {
        setVer(true);
        return;
      }
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      if (window.location.pathname.startsWith("/pruebas")) return;
      const hoy = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(CLAVE) === hoy) return;
      localStorage.setItem(CLAVE, hoy);
      setVer(true);
    } catch {
      // sin almacenamiento: no se muestra
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ver) return;
    let ctx = null;
    if (sonido) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    const tono = (f, ini, largo, vol = 0.22) => {
      if (!ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square";
      o.frequency.value = f;
      const t0 = ctx.currentTime + ini;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + largo);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + largo + 0.02);
    };
    const sonidos = [[0.24, () => tono(180, 0, 0.06)], [0.6, () => tono(160, 0, 0.06)], [0.97, () => tono(140, 0, 0.06)], [1.1, () => tono(1400, 0, 0.2)], [2.45, () => { tono(660, 0, 0.1, 0.18); tono(880, 0.11, 0.1, 0.18); tono(1320, 0.22, 0.22, 0.18); }]];
    const sonado = new Set();
    let raf = 0;
    let cerrar = 0;
    const NS = "http://www.w3.org/2000/svg";
    const T = 80, CX = 150, BASE = 330, R = 0.135 * 80, ZOOM = 3.6;
    let iX = 0, dotY = 0;

    function armar() {
      const g = refs.nombre.current;
      if (!g) return;
      g.innerHTML = "";
      const partes = ["p", "a", "d", "e", "l", "I", "t", "o"];
      const tmp = [];
      let x = 0;
      for (const ch of partes) {
        if (ch === "I") {
          tmp.push({ ch, x, w: 0.3 * T });
          x += 0.3 * T;
          continue;
        }
        const e = document.createElementNS(NS, "text");
        e.textContent = ch;
        g.appendChild(e);
        const w = e.getComputedTextLength();
        tmp.push({ ch, x, w, e });
        x += w;
      }
      const x0 = CX - x / 2;
      for (const p of tmp) if (p.e) { p.e.setAttribute("x", x0 + p.x); p.e.setAttribute("y", BASE); }
      const i = tmp[5];
      iX = x0 + i.x + i.w / 2;
      const palo = document.createElementNS(NS, "rect");
      palo.setAttribute("x", iX - 0.085 * T);
      palo.setAttribute("y", BASE - 0.6 * T);
      palo.setAttribute("width", 0.17 * T);
      palo.setAttribute("height", 0.6 * T);
      g.appendChild(palo);
      dotY = BASE - 0.67 * T - R;
    }

    function pintar(t) {
      const { cam, pel, cost, num, nombre } = Object.fromEntries(Object.entries(refs).map(([k, r]) => [k, r.current]));
      if (!cam) return;
      const p = cl(t / 1.1);
      const x = iX - 50 + 50 * ease(p);
      const alto = 26 * Math.exp(-2.4 * p) * Math.abs(Math.sin(Math.PI * 3 * p));
      pel.setAttribute("transform", `translate(${x} ${dotY - alto})`);
      const n = cl((t - 1.1) / 0.12) * (1 - cl((t - 1.9) / 0.4));
      num.setAttribute("opacity", n);
      cost.setAttribute("opacity", 1 - 0.7 * n);
      cost.setAttribute("transform", `rotate(${ease(p) * 360})`);
      const z = eio(cl((t - 1.3) / 1.2));
      const s = ZOOM + (1 - ZOOM) * z;
      const fx = iX + (CX - iX) * z, fy = dotY + (BASE - 40 - dotY) * z;
      cam.setAttribute("transform", `translate(150 280) scale(${s}) translate(${-fx} ${-fy})`);
      cam.setAttribute("opacity", "1");
      nombre.setAttribute("opacity", ease(cl((t - 1.9) / 0.6)));
    }

    const empezar = () => {
      armar();
      let inicio = null;
      const cuadro = (ts) => {
        if (inicio === null) inicio = ts;
        const t = (ts - inicio) / 1000;
        pintar(t);
        sonidos.forEach(([ts2, f], k) => { if (t >= ts2 && !sonado.has(k)) { sonado.add(k); f(); } });
        if (t < DUR) raf = requestAnimationFrame(cuadro);
        else { setSaliendo(true); cerrar = setTimeout(() => { setVer(false); onFin?.(); }, 350); }
      };
      raf = requestAnimationFrame(cuadro);
    };
    // Espera las letras (si tardan más de 1,5 s, arranca igual).
    Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).then(empezar);
    return () => { cancelAnimationFrame(raf); clearTimeout(cerrar); ctx?.close?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ver]);

  if (!ver) return null;
  const saltear = () => { setSaliendo(true); setTimeout(() => { setVer(false); onFin?.(); }, 250); };
  return (
    <div
      onClick={saltear}
      role="presentation"
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "#eaf3ec", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity .3s", opacity: saliendo ? 0 : 1, cursor: "pointer" }}
    >
      <svg viewBox="0 0 300 560" style={{ width: "min(100vw, 56vh)", height: "auto", maxHeight: "100vh" }}>
        <g ref={refs.cam} opacity="0">
          <g ref={refs.nombre} fontFamily="var(--font-cartel), 'Big Shoulders Display', sans-serif" fontWeight="900" fontSize="80" fill="#154139" opacity="0" style={{ fontVariationSettings: "'opsz' 72" }} />
          <g ref={refs.pel}>
            <circle r="10.8" fill="#f2c53d" />
            <g ref={refs.cost}>
              <path d="M-6.2 -8c3.1 3.1 3.1 13 0 16M6.2 -8c-3.1 3.1-3.1 13 0 16" fill="none" stroke="#154139" strokeWidth="1.7" strokeLinecap="round" />
            </g>
            <text ref={refs.num} x="0" y="2.3" textAnchor="middle" fontFamily="var(--font-tablero), 'Chakra Petch', sans-serif" fontWeight="700" fontSize="6.4" fill="#154139" opacity="0">
              40-15
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
