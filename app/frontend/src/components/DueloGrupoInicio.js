"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { leerPantalla, guardarPantalla } from "@/lib/cachePantalla";

// Cartel VS de tu grupo en el Inicio (D-40, 2026-10-10, opción L de las
// maquetas, a pedido del usuario: "fomentar la competencia"). Vos contra el
// que tenés arriba en el grupo donde más cerca estás de pasarlo; si vas 1°
// en todos, contra el 2° del grupo donde menos le sacás. Mismo cartel verde
// con VS amarillo que el formulario del Marcadorcito (D-38). Si no estás en
// ningún grupo (o estás solo en los tuyos), no se muestra. Tocarlo abre
// Jugadores con ese grupo elegido. Ranking mensual, como las tarjetas de
// grupo de Jugadores (D-32).

const primerNombre = (s) => String(s ?? "").trim().split(/\s+/)[0] || "";

function dueloDe(grupo, filas, yo) {
  const i = filas.findIndex((f) => f.jugador_id === yo);
  if (i < 0 || filas.length < 2) return null;
  const rival = i === 0 ? filas[1] : filas[i - 1];
  return {
    grupoId: grupo.grupo_id,
    grupo: grupo.nombre,
    pos: i + 1,
    misPuntos: filas[i].puntos,
    rival: primerNombre(rival.nombre),
    puntosRival: rival.puntos,
    // Para elegir el grupo: primero los que no vas 1°, el más cercano.
    orden: i === 0 ? 1e9 + (filas[0].puntos - filas[1].puntos) : rival.puntos - filas[i].puntos,
  };
}

export default function DueloGrupoInicio({ userId, t, router }) {
  const [duelo, setDuelo] = useState(() => (userId ? leerPantalla("home_duelo", userId) : null));

  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    (async () => {
      const { data: grupos, error } = await supabase.rpc("mis_grupos");
      if (error) return;
      const duelos = await Promise.all(
        (grupos ?? []).map((g) =>
          supabase
            .rpc("ranking_grupo", { p_grupo: g.grupo_id, p_periodo: "mes" })
            .then(({ data }) => (data ? dueloDe(g, data, userId) : null))
        )
      );
      const elegido = duelos.filter(Boolean).sort((a, b) => a.orden - b.orden)[0] ?? null;
      if (!vivo) return;
      setDuelo(elegido);
      guardarPantalla("home_duelo", userId, elegido);
    })();
    return () => {
      vivo = false;
    };
  }, [userId]);

  if (!duelo) return null;

  return (
    <button
      type="button"
      onClick={() => router.push(`/jugadores?grupo=${duelo.grupoId}`)}
      className="flex flex-col gap-1.5 text-left cursor-pointer"
    >
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted truncate max-w-full">
        {duelo.grupo} · {t("grupos.vasPuesto", { pos: duelo.pos })}
      </span>
      <span className="flex items-stretch w-full">
        <span className="flex-1 min-w-0 flex flex-col bg-[#154139] text-[#eaf4f0] rounded-l-[6px] px-3 py-2.5">
          <span className="font-titulo font-black uppercase text-[1.4rem] leading-none truncate">{t("grupos.vos")}</span>
          <span className="font-numero font-bold text-[1.4rem] leading-none mt-1 tabular-nums">{duelo.misPuntos}</span>
        </span>
        <span className="flex items-center bg-accent text-accent-ink font-titulo font-black text-[1.4rem] px-2">VS</span>
        <span className="flex-1 min-w-0 flex flex-col items-end text-right border-2 border-l-0 border-[#154139] rounded-r-[6px] px-3 py-2">
          <span className="font-titulo font-black uppercase text-[1.4rem] leading-none truncate max-w-full">{duelo.rival}</span>
          <span className="font-numero font-bold text-[1.4rem] leading-none mt-1 tabular-nums">{duelo.puntosRival}</span>
        </span>
      </span>
    </button>
  );
}
