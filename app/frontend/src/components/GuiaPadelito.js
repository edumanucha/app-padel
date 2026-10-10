"use client";

import { useEffect, useRef, useState } from "react";

// Guía de la app con Padelito (2026-09-30, opción 3 elegida por el usuario
// en /pruebas-guia): la primera vez que alguien entra al inicio, la pelotita
// le pregunta si quiere que le muestre la app. Si dice "Después", queda un
// botoncito "?" en el inicio para pedirla cuando quiera. Si la hace (o la
// saltea), el "?" desaparece y se puede volver a ver desde el menú ("Ver la
// guía", que abre /?guia=1).
//
// Cada paso remarca un elemento real de la pantalla, marcado con el
// atributo data-guia="..." en HomeForm/BottomNav. Si un elemento no está
// (por ejemplo, la barra cambia entre celu y compu), se usa el primero
// visible y, si no hay ninguno, se saltea el paso.

const CLAVE_ESTADO = "padelito_guia"; // "pendiente" | "hecha"

const PASOS = [
  {
    guia: "saludo",
    texto: "¡Hola! Soy Padelito. Acá estás vos: tu nombre y tus puntos de ranking. A la derecha tenés el menú, la configuración y las notificaciones.",
  },
  { guia: "proximo", texto: "Tu próximo partido aparece acá. Tocalo para ver quién juega, dónde y a qué hora." },
  {
    guia: "marcador",
    texto: "Este es el Marcadorcito: te lleva el tanteador solo, por voz, con señas o desde el reloj. ¡Y anda sin señal!",
  },
  {
    guia: "jugar",
    texto: "Con 'Crear partido' armás uno e invitás gente. En 'Abiertos' te sumás a partidos a los que les falta alguien.",
  },
  { guia: "numeros", texto: "Tus números: racha de victorias, tu puesto en el ranking y el % de partidos ganados." },
  { guia: "comunidad", texto: "Acá encontrás a otros jugadores, tus mensajes y las invitaciones a partidos." },
  {
    guia: "navegacion",
    texto: "Y con esta barra te movés por la app: Inicio, Jugadores, Marcadorcito y Perfil. ¡Listo, a jugar!",
  },
];

function leerEstado() {
  try {
    return localStorage.getItem(CLAVE_ESTADO);
  } catch {
    return "hecha"; // sin almacenamiento, no molestamos cada vez
  }
}
function guardarEstado(valor) {
  try {
    localStorage.setItem(CLAVE_ESTADO, valor);
  } catch {
    // nada
  }
}

function elementoVisible(guia) {
  const candidatos = document.querySelectorAll(`[data-guia="${guia}"]`);
  for (const el of candidatos) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

// Primer paso desde `desde` cuyo elemento está en pantalla (-1 si ninguno).
function pasoDisponible(desde) {
  for (let i = desde; i < PASOS.length; i++) {
    if (elementoVisible(PASOS[i].guia)) return i;
  }
  return -1;
}

function Pelotita() {
  return (
    <span
      className="w-12 h-12 rounded-full bg-[#f2c53d] border-2 border-[#14261f] flex items-center justify-center text-2xl flex-shrink-0 shadow-lg"
      aria-hidden
    >
      🎾
    </span>
  );
}

export default function GuiaPadelito() {
  // "nada" | "pregunta" | "boton" | "guia"
  const [fase, setFase] = useState("nada");
  const [paso, setPaso] = useState(0);
  const [rect, setRect] = useState(null);
  // Arriba o abajo para el globito: se decide cuando la pantalla terminó de
  // moverse, así no salta de lado a mitad del desplazamiento.
  const [globoArriba, setGloboArriba] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get("guia") === "1";
    if (pedida) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    const estado = leerEstado();
    // Un toque de demora para que el inicio termine de acomodarse.
    const t = setTimeout(() => {
      if (pedida) empezar();
      else if (estado === "pendiente") setFase("boton");
      else if (estado !== "hecha") setFase("pregunta");
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // Paso a paso fluido (2026-10-09, el usuario: "el traslado de la guía se
  // ve trabado"). Antes el recuadro desaparecía en cada paso, la pantalla se
  // movía y 400 ms después el recuadro reaparecía de golpe. Ahora el
  // recuadro sigue al elemento cuadro por cuadro mientras la pantalla se
  // desplaza (y su transición CSS lo desliza desde el paso anterior), hasta
  // que la posición se queda quieta.
  useEffect(() => {
    if (fase !== "guia") return;
    const el = elementoVisible(PASOS[paso].guia);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });

    let quietos = 0;
    let ultimo = null;
    const inicio = performance.now();
    const seguir = () => {
      const r = el.getBoundingClientRect();
      setRect(r);
      const igual = ultimo && Math.abs(ultimo.top - r.top) < 0.5 && Math.abs(ultimo.left - r.left) < 0.5;
      quietos = igual ? quietos + 1 : 0;
      ultimo = r;
      if (quietos >= 6 || performance.now() - inicio > 1500) {
        setGloboArriba(r.top + r.height / 2 > window.innerHeight / 2);
        return;
      }
      rafRef.current = requestAnimationFrame(seguir);
    };
    rafRef.current = requestAnimationFrame(seguir);

    // Si la persona mueve la pantalla o gira el celu, el recuadro la sigue.
    const medir = () => setRect(el.getBoundingClientRect());
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir);
    };
  }, [fase, paso]);

  function empezar() {
    const primero = pasoDisponible(0);
    if (primero === -1) return;
    setPaso(primero);
    setRect(null);
    setFase("guia");
  }
  function despues() {
    guardarEstado("pendiente");
    setFase("boton");
  }
  function terminar() {
    guardarEstado("hecha");
    setFase("nada");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function siguiente() {
    const proximo = pasoDisponible(paso + 1);
    if (proximo === -1) terminar();
    else setPaso(proximo);
  }

  if (fase === "nada") return null;

  if (fase === "boton") {
    return (
      // Rediseño Cartel (2026-10-01): globos y botones sin píldoras ni sombras,
      // esquinas de 6-8px y botón principal amarillo en font-titulo.
      <button
        onClick={empezar}
        className="fixed right-4 bottom-28 lg:bottom-6 z-40 flex items-center gap-2 cursor-pointer"
        aria-label="Ver la guía de la app"
      >
        <span className="bg-surface text-ink text-xs font-semibold rounded-[6px] border border-ink/15 px-3 py-1.5">
          Ver la guía
        </span>
        <span className="w-12 h-12 rounded-full bg-[#154139] text-[#f2c53d] font-titulo font-black text-2xl flex items-center justify-center">
          ?
        </span>
      </button>
    );
  }

  if (fase === "pregunta") {
    return (
      <div className="fixed inset-0 z-[70] bg-black/55 flex items-end justify-center p-4 pb-8">
        <div className="w-full max-w-md flex items-end gap-2">
          <Pelotita />
          <div className="bg-surface text-ink rounded-[8px] rounded-bl-none p-4 flex flex-col gap-3 flex-1">
            <p className="text-sm">
              ¡Hola! Soy <b>Padelito</b>. ¿Querés que te muestre la app en un ratito? Es menos de un minuto.
            </p>
            <div className="flex gap-2">
              <button
                onClick={empezar}
                className="font-titulo font-black uppercase text-xl leading-none px-4 py-2.5 rounded-[6px] bg-accent text-accent-ink cursor-pointer"
              >
                ¡Dale!
              </button>
              <button
                onClick={despues}
                className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
              >
                Después
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // fase === "guia": foco sobre el elemento + globito de Padelito.
  const margen = 8;
  return (
    <div className="fixed inset-0 z-[70]" onClick={(e) => e.stopPropagation()}>
      {rect ? (
        <div
          className="fixed rounded-[8px] pointer-events-none guia-foco"
          style={{
            top: rect.top - margen,
            left: rect.left - margen,
            width: rect.width + margen * 2,
            height: rect.height + margen * 2,
            boxShadow: "0 0 0 4px #f2c53d, 0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}
      <div
        key={`${paso}-${globoArriba}`}
        className={`fixed inset-x-0 flex justify-center px-4 guia-globo-entra ${globoArriba ? "top-6" : "bottom-8"}`}
      >
        <div className="w-full max-w-md flex items-end gap-2">
          <Pelotita />
          <div className="bg-surface text-ink rounded-[8px] rounded-bl-none p-4 flex flex-col gap-3 flex-1">
            <p className="text-sm">{PASOS[paso].texto}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">
                {paso + 1} de {PASOS.length} ·{" "}
                <button onClick={terminar} className="underline cursor-pointer">
                  Saltar
                </button>
              </span>
              <button
                onClick={siguiente}
                className="font-titulo font-black uppercase text-xl leading-none px-4 py-2.5 rounded-[6px] bg-accent text-accent-ink cursor-pointer"
              >
                {paso >= PASOS.length - 1 ? "¡Listo!" : "Siguiente →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
