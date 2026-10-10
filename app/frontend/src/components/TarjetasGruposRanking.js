"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Tarjetas de grupo arriba del ranking de Jugadores (D-32, 2026-10-09, a
// pedido del usuario: "lo que quiero es fomentar la competencia"; eligió la
// opción B de las maquetas). Una tarjeta "Global" y una por grupo con tu
// puesto en grande y cuánto te falta para el de arriba (o cuánto le sacás al
// segundo); tocar una cambia el ranking de abajo. La última, amarilla, lleva
// a crear un grupo. Sin grupos, un cartel invita a armar el primero (antes
// los grupos no se veían en esta pantalla si no estabas en ninguno).
// Las tarjetas usan el período que se está viendo (el semanal no existe en
// los grupos, así que cuenta como mensual), igual que ranking_grupo (069).

function resumenDe(filas, yo) {
  const i = filas.findIndex((f) => f.jugador_id === yo);
  if (i < 0) return null;
  const mios = filas[i].puntos;
  if (filas.length === 1) return { pos: 1, total: 1, tipo: "solo" };
  if (i === 0) {
    const segundo = filas[1];
    return segundo.puntos === mios
      ? { pos: 1, total: filas.length, tipo: "empate", quien: segundo.nombre }
      : { pos: 1, total: filas.length, tipo: "lider", n: mios - segundo.puntos, quien: segundo.nombre };
  }
  const arriba = filas[i - 1];
  return arriba.puntos === mios
    ? { pos: i + 1, total: filas.length, tipo: "empate", quien: arriba.nombre }
    : { pos: i + 1, total: filas.length, tipo: "abajo", n: arriba.puntos - mios, quien: arriba.nombre };
}

const primerNombre = (s) => String(s ?? "").trim().split(/\s+/)[0] || "";

export default function TarjetasGruposRanking({ grupos, grupoSel, onElegir, periodo, userId, t, router }) {
  const [resumenes, setResumenes] = useState({});
  const pPeriodo = periodo === "historico" ? "siempre" : "mes";

  useEffect(() => {
    if (!userId || grupos.length === 0) return;
    let vivo = true;
    Promise.all(
      grupos.map((g) =>
        supabase
          .rpc("ranking_grupo", { p_grupo: g.grupo_id, p_periodo: pPeriodo })
          .then(({ data }) => [g.grupo_id, data ? resumenDe(data, userId) : null])
      )
    ).then((pares) => {
      if (vivo) setResumenes(Object.fromEntries(pares));
    });
    return () => {
      vivo = false;
    };
  }, [grupos, userId, pPeriodo]);

  if (grupos.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-[8px] bg-[#154139] text-[#eaf4f0] px-4 py-3.5 flex flex-col gap-1.5">
          <span className="font-titulo font-black uppercase text-[1.6rem] leading-none">{t("grupos.competiTitulo")}</span>
          <span className="text-sm leading-snug text-[#c4dad3]">{t("grupos.competiTexto")}</span>
        </div>
        <button
          type="button"
          onClick={() => router.push("/grupos")}
          className="bg-accent text-accent-ink rounded-[8px] py-3 font-titulo font-black uppercase text-lg leading-none cursor-pointer"
        >
          {t("grupos.crearMiGrupo")}
        </button>
      </div>
    );
  }

  const linea = (r) => {
    if (!r) return "";
    if (r.tipo === "solo") return t("grupos.soloVos");
    if (r.tipo === "empate") return t("grupos.empatadoCon", { quien: primerNombre(r.quien) });
    if (r.tipo === "lider") return t("grupos.leSacas", { n: r.n, quien: primerNombre(r.quien) });
    return t("grupos.aNDe", { n: r.n, quien: primerNombre(r.quien) });
  };

  const base = "flex-shrink-0 snap-start rounded-[8px] text-left cursor-pointer px-3 py-2.5 flex flex-col gap-1 border-2";

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("grupos.tusGrupos")}</span>
      <div className="flex gap-2 overflow-x-auto snap-x pb-1 -mx-1 px-1" role="tablist" aria-label={t("grupos.tusGrupos")}>
        <button
          type="button"
          role="tab"
          aria-selected={grupoSel === "global"}
          onClick={() => onElegir("global")}
          className={`${base} w-[104px] ${grupoSel === "global" ? "bg-ink text-bg border-accent" : "bg-transparent text-ink border-ink/15"}`}
        >
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] opacity-70">{t("grupos.global")}</span>
          <span className="text-xs leading-snug">{t("grupos.todosLosJugadores")}</span>
        </button>

        {grupos.map((g) => {
          const r = resumenes[g.grupo_id];
          const activo = grupoSel === g.grupo_id;
          return (
            <button
              key={g.grupo_id}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => onElegir(g.grupo_id)}
              className={`${base} w-[136px] bg-[#154139] text-[#eaf4f0] ${activo ? "border-accent" : "border-transparent"}`}
            >
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#8fb6ae] truncate">{g.nombre}</span>
              <span className="flex items-end gap-1.5">
                <span className={`font-titulo font-black text-[2.1rem] leading-[0.85] tabular-nums ${activo ? "text-accent" : ""}`}>
                  {r ? `${r.pos}°` : "–"}
                </span>
                {r && r.total > 1 && <span className="text-[11px] text-[#c4dad3] pb-0.5">{t("grupos.deTotal", { n: r.total })}</span>}
              </span>
              <span className="text-[11px] leading-snug text-[#c4dad3] line-clamp-2">{linea(r)}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => router.push("/grupos")}
          aria-label={t("grupos.crear")}
          className="flex-shrink-0 snap-start w-[56px] rounded-[8px] bg-accent text-accent-ink font-titulo font-black text-3xl leading-none flex items-center justify-center cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
}
