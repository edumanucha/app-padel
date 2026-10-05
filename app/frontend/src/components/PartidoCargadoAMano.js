"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClass = "rounded-[6px] bg-transparent border border-ink/15 px-3 py-2 text-ink text-center font-numero text-lg w-full min-w-0";

// Bloque del detalle de un partido que alguien cargó a mano (2026-10-04):
// muestra el resultado cargado y deja corregirlo o avisar que no jugaste. No
// hace falta aceptar nada: si nadie hace nada, queda guardado. Ver
// 073_partidos_cargados_a_mano.sql. No aparece en partidos del Marcadorcito.
export default function PartidoCargadoAMano({ partidoId, usuarioId }) {
  const router = useRouter();
  const [res, setRes] = useState(null); // { estado, ganador, created_at }
  const [miEquipo, setMiEquipo] = useState(null);
  const [editando, setEditando] = useState(false);
  const [sets, setSets] = useState([]); // [{ n: "", e: "" }] nosotros / ellos
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [confirmaSalir, setConfirmaSalir] = useState(false);

  async function cargar() {
    const [{ data: r }, { data: pj }] = await Promise.all([
      supabase.from("resultados_partido").select("estado, ganador, created_at").eq("partido_id", partidoId).maybeSingle(),
      supabase.from("partido_jugadores").select("equipo").eq("partido_id", partidoId).eq("jugador_id", usuarioId).maybeSingle(),
    ]);
    setRes(r ?? null);
    setMiEquipo(pj?.equipo ?? null);
  }

  useEffect(() => {
    if (!usuarioId) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partidoId, usuarioId]);

  if (!res?.estado?.cargadoAMano || !miEquipo) return null;

  const setsA = res.estado.setsA ?? [];
  const setsB = res.estado.setsB ?? [];
  const nuestros = miEquipo === "A" ? setsA : setsB;
  const ellos = miEquipo === "A" ? setsB : setsA;
  const gane = res.ganador === miEquipo;
  const vencido = new Date(res.created_at).getTime() < Date.now() - 7 * 24 * 3600 * 1000;

  function abrirEdicion() {
    const filas = nuestros.map((n, i) => ({ n: String(n), e: String(ellos[i]) }));
    while (filas.length < 3) filas.push({ n: "", e: "" });
    setSets(filas);
    setError("");
    setEditando(true);
  }

  function cambiar(i, lado, valor) {
    const limpio = valor.replace(/\D/g, "").slice(0, 2);
    setSets((prev) => prev.map((s, k) => (k === i ? { ...s, [lado]: limpio } : s)));
  }

  async function guardarCorreccion() {
    const jugados = sets.filter((s) => s.n !== "" && s.e !== "").map((s) => ({ n: Number(s.n), e: Number(s.e) }));
    const gN = jugados.filter((s) => s.n > s.e).length;
    const gE = jugados.filter((s) => s.e > s.n).length;
    if (jugados.length < 2 || jugados.some((s) => s.n === s.e) || (gN !== 2 && gE !== 2)) {
      setError("El resultado no cierra: sets sin empates y un ganador de 2 sets.");
      return;
    }
    setTrabajando(true);
    const { error: rpcError } = await supabase.rpc("corregir_resultado_partido", {
      p_partido: partidoId,
      p_sets_a: jugados.map((s) => (miEquipo === "A" ? s.n : s.e)),
      p_sets_b: jugados.map((s) => (miEquipo === "A" ? s.e : s.n)),
    });
    setTrabajando(false);
    if (rpcError) {
      setError(rpcError.message.includes("plazo_vencido") ? "Ya pasaron más de 7 días: no se puede corregir." : "No se pudo guardar la corrección. Probá de nuevo.");
      return;
    }
    setEditando(false);
    cargar();
  }

  async function noJugue() {
    setTrabajando(true);
    const { error: rpcError } = await supabase.rpc("no_jugue_partido", { p_partido: partidoId });
    setTrabajando(false);
    if (rpcError) {
      setError(rpcError.message.includes("es_quien_cargo") ? "Quien cargó el partido no puede salir: si está mal, corregilo." : "No se pudo completar. Probá de nuevo.");
      return;
    }
    router.replace("/mis-partidos");
  }

  return (
    <div className="flex flex-col gap-3 border-y border-ink/10 py-4 text-ink">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Partido cargado a mano</span>
      <p className="text-base font-semibold">
        {gane ? "Ganaron ustedes" : "Ganaron ellos"} · {nuestros.map((n, i) => `${n}-${ellos[i]}`).join("  ")}
      </p>
      <p className="text-xs text-muted">
        Si el resultado está bien, no hace falta hacer nada: queda guardado. Si algo no es así, podés corregirlo o avisar que no jugaste.
      </p>

      {editando ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-2 items-center">
            <span />
            <span className="text-xs font-bold uppercase text-muted text-center">Nosotros</span>
            <span className="text-xs font-bold uppercase text-muted text-center">Ellos</span>
            {sets.map((s, i) => (
              <div key={i} className="contents">
                <span className="text-sm font-semibold">Set {i + 1}</span>
                <input inputMode="numeric" value={s.n} onChange={(e) => cambiar(i, "n", e.target.value)} className={inputClass} />
                <input inputMode="numeric" value={s.e} onChange={(e) => cambiar(i, "e", e.target.value)} className={inputClass} />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={guardarCorreccion} disabled={trabajando} className="flex-1 rounded-[6px] bg-accent text-accent-ink font-bold py-2 cursor-pointer disabled:opacity-50">
              {trabajando ? "Guardando…" : "Guardar corrección"}
            </button>
            <button onClick={() => setEditando(false)} className="px-4 rounded-[6px] border border-ink/15 font-semibold cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!vencido && (
            <button onClick={abrirEdicion} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
              Corregir resultado
            </button>
          )}
          {confirmaSalir ? (
            <>
              <button onClick={noJugue} disabled={trabajando} className="text-sm font-bold px-3 py-1.5 rounded-[6px] bg-accent-3/15 text-accent-3-ink border border-accent-3 cursor-pointer">
                Sí, no jugué
              </button>
              <button onClick={() => setConfirmaSalir(false)} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmaSalir(true)} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
              No jugué este partido
            </button>
          )}
        </div>
      )}
      {vencido && <p className="text-xs text-muted">Pasaron más de 7 días: ya no se puede corregir.</p>}
      {error && (
        <p role="alert" className="text-sm text-[#dc2626]">
          {error}
        </p>
      )}
    </div>
  );
}
