"use client";

import ConPelota from "@/components/ConPelota";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import MarcaPadelito from "@/components/MarcaPadelito";
import InstalarApp from "@/components/InstalarApp";
import { IconoChevron } from "@/components/Icons";

// Inicio para quien todavía no tiene cuenta (2026-10-04): se puede mirar y
// probar cosas, y se pide la cuenta recién al querer guardar algo.
const LINKS = [
  ["Probá el Marcadorcito", "El de verdad, con tu reloj y sin cuenta", "/probar"],
  ["Llevá el marcador desde tu reloj", "Cómo se conecta y hasta dónde llega", "/reloj"],
  ["Probá un torneo", "Americano, mexicano, liga o eliminación", "/torneos/probar"],
  ["Consejos de pádel", "Más de 160 para jugar mejor", "/consejos"],
  ["Cómo funciona", "Todo lo que hace Padelito", "/como-funciona"],
  ["Quiénes somos", "Quién arma la app y cómo apoyarla", "/quienes-somos"],
];

export default function HomeVisitante() {
  const router = useRouter();
  return (
    <div className="w-full max-w-md flex flex-col gap-6 text-ink">
      <InstalarApp variante="franja" />
      <div className="flex items-center gap-3">
        <Logo size={46} />
        <MarcaPadelito className="text-[38px]" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="font-titulo text-5xl font-black uppercase leading-[0.92]"><ConPelota>{"Armá partidos y llevá el marcador"}</ConPelota></h1>
        <p className="text-base text-muted">Organizá partidos de pádel con amigos, llevá el puntaje con tu voz o desde el reloj, y guardá tus estadísticas.</p>
      </div>
      <div className="flex flex-col gap-2">
        <button onClick={() => router.push("/login")} className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer">
          Crear mi cuenta
        </button>
        <button onClick={() => router.push("/login")} className="text-sm font-semibold px-3 py-2 rounded-[6px] border border-ink/15 cursor-pointer">
          Ya tengo cuenta
        </button>
      </div>
      <div className="flex flex-col">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">Mirá qué hay</span>
        {LINKS.map(([titulo, detalle, href]) => (
          <button key={href} onClick={() => router.push(href)} className="flex items-center gap-3 py-3 border-b border-ink/10 text-left cursor-pointer">
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="font-semibold text-base">{titulo}</span>
              <span className="text-xs text-muted">{detalle}</span>
            </span>
            <IconoChevron width={16} height={16} style={{ transform: "rotate(-90deg)" }} className="text-muted flex-shrink-0" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
