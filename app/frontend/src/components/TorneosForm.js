"use client";

import ConPelota from "@/components/ConPelota";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { FORMATOS } from "@/lib/torneosApp";
import PelotaLoader from "@/components/PelotaLoader";
import { IconoChevron } from "@/components/Icons";

// "Torneos" (2026-10-03): la lista de los torneos que organizás o en los que
// jugás, con el botón para armar uno nuevo. Ver 071_torneos.sql.
export default function TorneosForm() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [torneos, setTorneos] = useState([]);

  useEffect(() => {
    async function iniciar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase.rpc("mis_torneos");
      setTorneos(data ?? []);
      setCargando(false);
    }
    iniciar();
  }, [router]);

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>Cargando…</p>
      </div>
    );
  }

  const enJuego = torneos.filter((t) => t.estado === "en_juego");
  const terminados = torneos.filter((t) => t.estado === "terminado");

  const fila = (t) => (
    <button
      key={t.id}
      onClick={() => router.push(`/torneos/${t.id}`)}
      className="flex items-center gap-3 py-3 border-b border-ink/10 text-left cursor-pointer"
    >
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="font-semibold text-base truncate">{t.nombre}</span>
        <span className="text-xs text-muted">
          {FORMATOS[t.formato]} · {t.participantes} jugadores · {new Date(t.creado_en).toLocaleDateString("es-AR")}
          {!t.soy_organizador && " · jugás vos"}
        </span>
      </span>
      <IconoChevron width={16} height={16} style={{ transform: "rotate(-90deg)" }} className="text-muted flex-shrink-0" aria-hidden />
    </button>
  );

  return (
    <div className="w-full max-w-md flex flex-col gap-5 text-ink">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{"Torneos"}</ConPelota></h1>
        <button onClick={() => router.push("/")} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
          Volver
        </button>
      </div>

      <button
        onClick={() => router.push("/torneos/nuevo")}
        className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer"
      >
        Nuevo torneo
      </button>

      {torneos.length === 0 && (
        <p className="text-sm text-muted border-y border-ink/10 py-4">
          Todavía no hay torneos. Armá un americano, un mexicano o un torneo con las reglas que quieras.
        </p>
      )}

      {enJuego.length > 0 && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">En juego</span>
          {enJuego.map(fila)}
        </div>
      )}
      {terminados.length > 0 && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">Terminados</span>
          {terminados.map(fila)}
        </div>
      )}
    </div>
  );
}
