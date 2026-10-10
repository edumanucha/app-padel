"use client";

import ConPelota from "@/components/ConPelota";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { construir, nombrePar, totalRondas, primeraRonda, siguienteRonda, paraGuardar, tablaDe, podioDe, FORMATOS, mensajeError } from "@/lib/torneosApp";
import PelotaLoader from "@/components/PelotaLoader";
import HojaAbajo from "@/components/HojaAbajo";

// Un torneo (2026-10-03): ronda en curso con carga de resultados (solo el
// organizador), tabla en vivo y podio final. Quienes juegan con cuenta lo ven
// y se actualiza solo cada 20 segundos. Los cruces los arma lib/torneos.js y
// se guardan ronda por ronda (071_torneos.sql).
export default function TorneoForm({ torneoId }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [data, setData] = useState(null); // respuesta de torneo_completo
  const [borradores, setBorradores] = useState({}); // partidoId -> texto del input
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const cargar = useCallback(async () => {
    const { data: d } = await supabase.rpc("torneo_completo", { p_torneo: torneoId });
    setData(d ?? null);
    setCargando(false);
  }, [torneoId]);

  useEffect(() => {
    async function iniciar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }
      cargar();
    }
    iniciar();
  }, [router, cargar]);

  // Cada 20 segundos, si el torneo sigue en juego (para quienes miran).
  useEffect(() => {
    if (!data || data.torneo.estado !== "en_juego") return;
    const id = setInterval(cargar, 20000);
    return () => clearInterval(id);
  }, [data, cargar]);

  const m = useMemo(() => (data ? construir(data) : null), [data]);

  // Si el torneo se creó pero la primera ronda no llegó a guardarse, el
  // organizador la arma acá.
  useEffect(() => {
    if (!m || !m.torneo.soy_organizador || m.torneo.estado !== "en_juego" || m.rondas.length > 0) return;
    supabase.rpc("guardar_ronda", { p_torneo: torneoId, ...paraGuardar(primeraRonda(m)) }).then(cargar);
  }, [m, torneoId, cargar]);

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>Cargando…</p>
      </div>
    );
  }

  if (!m) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{"Torneo"}</ConPelota></h1>
        <p className="text-sm text-muted border-y border-ink/10 py-3">No encontramos este torneo, o no sos parte de él.</p>
        <button onClick={() => router.push("/torneos")} className="rounded-[6px] border border-ink/15 font-semibold py-2.5 cursor-pointer">
          Volver
        </button>
      </div>
    );
  }

  const t = m.torneo;
  const organizador = t.soy_organizador;
  const terminado = t.estado === "terminado";
  const eliminacion = m.formato === "eliminacion";
  const liga = m.formato === "liga";
  const actual = m.rondas[m.rondas.length - 1];
  const todosCargados = actual?.partidos.every((p) => p.ptsA != null && p.ptsB != null && (!eliminacion || p.ptsA !== p.ptsB));
  const total = totalRondas(m);
  const filas = tablaDe(m);
  const podio = terminado ? podioDe(m) : [];

  async function guardarResultado(partido, valor) {
    setError("");
    if (valor === "" || valor == null) return;
    const a = Math.max(0, Math.min(t.puntos_partido, Number(valor)));
    const b = t.puntos_partido - a;
    if (eliminacion && a === b) {
      setError("En eliminación no hay empates: alguien tiene que ganar.");
      return;
    }
    const { error: rpcError } = await supabase.rpc("cargar_resultado_torneo", { p_partido: partido.id, p_pts_a: a, p_pts_b: b });
    if (rpcError) {
      setError(mensajeError(rpcError));
      return;
    }
    setBorradores((prev) => {
      const { [partido.id]: _quitado, ...resto } = prev;
      return resto;
    });
    cargar();
  }

  async function cerrarRonda() {
    setError("");
    setTrabajando(true);
    const sig = siguienteRonda(m);
    const { error: rpcError } = sig
      ? await supabase.rpc("guardar_ronda", { p_torneo: torneoId, ...paraGuardar(sig) })
      : await supabase.rpc("terminar_torneo", { p_torneo: torneoId });
    setTrabajando(false);
    if (rpcError) {
      setError(mensajeError(rpcError));
      return;
    }
    cargar();
  }

  async function borrar() {
    const { error: rpcError } = await supabase.rpc("eliminar_torneo", { p_torneo: torneoId });
    if (rpcError) {
      setError(mensajeError(rpcError));
      setConfirmarBorrar(false);
      return;
    }
    router.replace("/torneos");
  }

  const textoCerrar = (sig) => (sig ? "Cerrar ronda" : "Terminar torneo");

  return (
    <div className="w-full max-w-md flex flex-col gap-5 text-ink">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95] break-words">{t.nombre}</h1>
          <span className="text-xs text-muted">
            {FORMATOS[t.formato]} · {m.jugadores.length} jugadores · {t.canchas} {t.canchas === 1 ? "cancha" : "canchas"} · a {t.puntos_partido}
          </span>
        </div>
        <button onClick={() => router.push("/torneos")} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer flex-shrink-0">
          Volver
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#dc2626]">
          {error}
        </p>
      )}

      {!terminado && actual && (
        <>
          <h2 className="font-titulo text-3xl font-black uppercase leading-none">
            {eliminacion ? actual.titulo : `Ronda ${actual.numero} de ${total}`}
          </h2>

          {actual.partidos.map((p) => (
            <div key={p.id} className="rounded-[8px] border border-ink/15 p-3 flex flex-col gap-2">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Cancha {p.cancha}</span>
              {[
                { ids: p.a, valor: p.ptsA, editable: true },
                { ids: p.b, valor: p.ptsB, editable: false },
              ].map((par, k) => (
                <div key={k} className="grid grid-cols-[1fr_4rem] items-center gap-3">
                  <span className="font-semibold">{nombrePar(m, par.ids)}</span>
                  {par.editable && organizador ? (
                    <input
                      id={`puntos-${p.id}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={t.puntos_partido}
                      value={borradores[p.id] ?? par.valor ?? ""}
                      onChange={(e) => setBorradores((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onBlur={(e) => guardarResultado(p, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      aria-label={`Puntos de ${nombrePar(m, par.ids)}`}
                      className="font-numero font-bold text-2xl text-center rounded-[6px] border border-ink py-1 bg-bg w-full"
                    />
                  ) : (
                    <span className="font-numero font-bold text-2xl text-center rounded-[6px] border border-ink/30 py-1 text-muted">{par.valor ?? "—"}</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {eliminacion && actual.pasan.length > 0 && <p className="text-xs text-muted">Pasan directo: {nombrePar(m, actual.pasan)}</p>}
          {!eliminacion && actual.descansan.length > 0 && <p className="text-xs text-muted">Descansan: {nombrePar(m, actual.descansan)}</p>}

          {organizador ? (
            <>
              <p className="text-xs text-muted">Escribí los puntos de la primera pareja y tocá afuera: la otra se completa sola.</p>
              <button
                onClick={cerrarRonda}
                disabled={!todosCargados || trabajando}
                className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer disabled:opacity-50"
              >
                {trabajando ? "Guardando…" : textoCerrar(siguienteRonda(m))}
              </button>
            </>
          ) : (
            <p className="text-xs text-muted">Los resultados los carga quien organiza el torneo. Esta pantalla se actualiza sola.</p>
          )}
        </>
      )}

      {terminado && (
        <>
          <h2 className="font-titulo text-3xl font-black uppercase leading-none">Terminó</h2>
          <div className="grid grid-cols-[1fr_1.2fr_1fr] items-end gap-1.5 rounded-[8px] bg-[#154139] text-[#eaf4f0] px-3 pt-4">
            {[podio[1], podio[0], podio[2]].map((f, i) => {
              const puesto = [2, 1, 3][i];
              return (
                <div key={i} className="flex flex-col items-center text-center min-w-0">
                  <span className="text-xs font-semibold text-[#c4dad3] truncate max-w-full">{f?.nombre ?? ""}</span>
                  <span className={`font-numero font-bold leading-none ${puesto === 1 ? "text-[2.4rem]" : "text-[2rem]"}`}>{f?.pf ?? ""}</span>
                  <div
                    className={`mt-1.5 w-full rounded-t-[6px] grid place-items-center font-numero font-bold text-2xl ${puesto === 1 ? "bg-accent text-accent-ink" : "bg-[#0f2e29]"}`}
                    style={{ height: puesto === 1 ? 104 : puesto === 2 ? 72 : 54 }}
                  >
                    {f ? puesto : ""}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-[8px] bg-accent text-accent-ink p-4 flex flex-col gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em]">{FORMATOS[t.formato]}</span>
            <span className="font-titulo font-black uppercase text-[2.6rem] leading-[0.9]">Ganó {podio[0]?.nombre}</span>
          </div>
        </>
      )}

      {!eliminacion && filas.length > 0 && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">Tabla</span>
          {filas.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1.6rem_1fr_auto_auto] items-center gap-3 py-2.5 border-b border-ink/10">
              <span className="font-numero font-bold text-sm text-muted">{i + 1}</span>
              <span className="font-semibold truncate">{f.nombre}</span>
              <span className="text-xs text-muted">
                {f.pg}-{f.pp}
              </span>
              <span className="font-numero font-bold min-w-[2.6rem] text-right">{liga ? f.pts : f.pf}</span>
            </div>
          ))}
          {liga && (
            <p className="text-xs text-muted pt-2">
              Puntos: victoria {t.puntos_victoria}, empate {t.puntos_empate}. Desempata la diferencia de puntos.
            </p>
          )}
        </div>
      )}

      {eliminacion && m.rondas.some((r) => r.partidos.some((p) => p.ptsA != null)) && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">Resultados</span>
          {m.rondas.map((r) =>
            r.partidos
              .filter((p) => p.ptsA != null)
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-ink/10 text-sm">
                  <span className="min-w-0">
                    <span className="text-xs text-muted block">{r.titulo}</span>
                    <span className="font-semibold">
                      {nombrePar(m, p.a)} vs. {nombrePar(m, p.b)}
                    </span>
                  </span>
                  <span className="font-numero font-bold flex-shrink-0">
                    {p.ptsA}-{p.ptsB}
                  </span>
                </div>
              ))
          )}
        </div>
      )}

      {organizador && (
        <button onClick={() => setConfirmarBorrar(true)} className="text-sm font-semibold text-[#dc2626] py-2 cursor-pointer">
          Eliminar torneo
        </button>
      )}

      {confirmarBorrar && (
        <HojaAbajo titulo="¿Eliminar el torneo?" onCerrar={() => setConfirmarBorrar(false)} textoCerrar="Cancelar ✕">
          <p className="text-sm text-muted">Se borra para todos, con sus resultados. No se puede deshacer.</p>
          <button onClick={borrar} className="rounded-[6px] bg-[#dc2626] text-white font-titulo font-black uppercase text-xl py-2.5 cursor-pointer">
            Sí, eliminar
          </button>
        </HojaAbajo>
      )}
    </div>
  );
}
