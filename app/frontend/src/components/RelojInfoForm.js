"use client";

import { useRouter } from "next/navigation";

// Página pública /reloj (2026-10-05, para el MVP): cómo llevar el marcador
// desde el reloj. Los datos de alcance salen de la prueba real del usuario
// (casi 9 metros, Redmi Watch con Android y Chrome).
const PASOS = [
  ["Conectá el reloj al celu", "Por Bluetooth, con la app de tu reloj, como siempre."],
  ["Abrí Padelito en Chrome", "Armá el partido en el Marcadorcito y elegí Reloj."],
  ["Dejá el celu cerca", "Con la pantalla prendida, en el bolso, el banco o colgado de la reja."],
  ["Sumá puntos desde la muñeca", "Con los controles de música: siguiente es punto A, anterior es punto B y pausa deshace."],
];

export default function RelojInfoForm() {
  const router = useRouter();
  return (
    <div className="w-full max-w-md text-ink flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">El marcador en tu reloj</h1>
        <button onClick={() => router.push("/")} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
          Volver
        </button>
      </div>

      <p className="text-[15px] text-muted leading-relaxed -mt-1">
        Sumás los puntos sin sacar el celu del bolso. Es el modo del Marcadorcito que mejor funciona.
      </p>

      <div className="flex flex-col border-t-2 border-ink">
        {PASOS.map(([titulo, texto], i) => (
          <div key={titulo} className="flex gap-3 py-4 border-b border-ink/10">
            <span className="font-numero font-bold text-[1.6rem] leading-none text-muted w-8 flex-shrink-0 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-titulo font-extrabold uppercase text-xl leading-none">{titulo}</span>
              <p className="text-sm text-muted leading-relaxed">{texto}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 border-b border-ink/10 pb-4">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Hasta dónde llega</span>
        <p className="text-sm leading-relaxed">
          En una prueba real, los botones del reloj llegaron a <b>casi 9 metros</b> del celu, y el reloj muestra el marcador al día mientras jugás.
        </p>
      </div>

      <div className="flex flex-col gap-1.5 border-b border-ink/10 pb-4">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Qué necesitás</span>
        <p className="text-sm leading-relaxed">
          Un celu Android con Chrome y un reloj que pueda controlar la música del celu. Lo probamos con un Redmi Watch. En iPhone y con otros relojes todavía no lo probamos.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => router.push("/marcador-libre/demo")}
          className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer"
        >
          Probar el Marcadorcito
        </button>
        <button onClick={() => router.push("/login")} className="text-sm font-semibold px-3 py-2 rounded-[6px] border border-ink/15 cursor-pointer">
          Crear mi cuenta
        </button>
      </div>
    </div>
  );
}
