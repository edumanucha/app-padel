"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import CampoCancha from "@/components/CampoCancha";
import { SlotJugador } from "@/components/MarcadorLibreForm";

const inputClass = "rounded-[6px] bg-transparent border border-ink/15 px-3 py-2 text-ink text-sm";
const etiquetaClass = "text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted";
const vacio = { termino: "", jugadorId: null, nombre: "" };

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// "Cargar un partido jugado" (2026-10-04): para sumar a tu historial y a tus
// estadísticas un partido que jugaste SIN llevar el Marcadorcito -- solo el
// resultado por sets, con quién jugaste y contra quién. Usa el mismo armado
// que el marcador libre (partido "ad-hoc", con invitados sin cuenta) y deja
// el resultado ya cerrado. No tiene estadísticas de puntos (eso solo sale
// del Marcadorcito).
export default function CargarPartidoForm() {
  const router = useRouter();
  const [yo, setYo] = useState(null); // { id, nombre }
  const [fecha, setFecha] = useState(hoy());
  const [cancha, setCancha] = useState("");
  const [canchaId, setCanchaId] = useState(null);
  const [companero, setCompanero] = useState(vacio);
  const [rival1, setRival1] = useState(vacio);
  const [rival2, setRival2] = useState(vacio);
  const [sets, setSets] = useState([
    { a: "", b: "" },
    { a: "", b: "" },
    { a: "", b: "" },
  ]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function iniciar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", user.id).maybeSingle();
      setYo({ id: user.id, nombre: perfil?.nombre ?? "Yo" });
    }
    iniciar();
  }, [router]);

  function cambiarSet(i, lado, valor) {
    const limpio = valor.replace(/\D/g, "").slice(0, 2);
    setSets((prev) => prev.map((s, k) => (k === i ? { ...s, [lado]: limpio } : s)));
  }

  // Sets completos (los dos casilleros con número), en orden.
  const jugados = sets.filter((s) => s.a !== "" && s.b !== "").map((s) => ({ a: Number(s.a), b: Number(s.b) }));
  const setsGanA = jugados.filter((s) => s.a > s.b).length;
  const setsGanB = jugados.filter((s) => s.b > s.a).length;
  const hayEmpate = jugados.some((s) => s.a === s.b);
  const resultadoValido = jugados.length >= 2 && !hayEmpate && (setsGanA === 2 || setsGanB === 2) && setsGanA !== setsGanB;
  const ganador = setsGanA > setsGanB ? "A" : "B";

  async function guardar(e) {
    e.preventDefault();
    setError("");
    const ids = [companero.jugadorId, rival1.jugadorId, rival2.jugadorId].filter(Boolean);
    if (new Set(ids).size !== ids.length) {
      setError("Elegiste la misma cuenta en más de un lugar: cada jugador tiene que ser distinto.");
      return;
    }
    if (!companero.nombre.trim() || !rival1.nombre.trim() || !rival2.nombre.trim()) {
      setError("Completá con quién jugaste y contra quiénes (si no tienen cuenta, alcanza con el nombre).");
      return;
    }
    if (!resultadoValido) {
      setError("El resultado no cierra: cargá los sets (al mejor de 3) sin empates y con un ganador de 2 sets.");
      return;
    }
    if (!cancha.trim()) {
      setError("Poné en qué cancha jugaste.");
      return;
    }

    setGuardando(true);
    const { data: yaCargue } = await supabase.rpc("cargue_partido_hoy");
    if (yaCargue) {
      setError("Hoy ya cargaste un partido a mano: se puede uno por día. Mañana podés cargar el siguiente.");
      setGuardando(false);
      return;
    }
    const { data: partido, error: partidoError } = await supabase
      .from("partidos")
      .insert({
        organizador_id: yo.id,
        fecha_hora: new Date(`${fecha}T12:00:00`).toISOString(),
        cancha: cancha.trim(),
        cancha_id: canchaId,
        cantidad_jugadores: 4,
        es_adhoc: true,
      })
      .select()
      .single();
    if (partidoError) {
      setGuardando(false);
      setError(`No se pudo guardar el partido: ${partidoError.message}`);
      return;
    }

    // El organizador ya queda como jugador por un trigger; solo falta su equipo.
    await supabase.from("partido_jugadores").update({ equipo: "A" }).eq("partido_id", partido.id).eq("jugador_id", yo.id);
    const filas = [
      [companero, "A"],
      [rival1, "B"],
      [rival2, "B"],
    ].map(([j, equipo]) => ({
      partido_id: partido.id,
      jugador_id: j.jugadorId,
      invitado_nombre: j.jugadorId ? null : j.nombre.trim(),
      equipo,
      estado: "confirmado",
    }));
    const { error: jugadoresError } = await supabase.from("partido_jugadores").insert(filas);
    if (jugadoresError) {
      setGuardando(false);
      setError(`No se pudo armar el plantel: ${jugadoresError.message}`);
      return;
    }

    const { error: resultadoError } = await supabase.from("resultados_partido").insert({
      partido_id: partido.id,
      estado: {
        setsA: jugados.map((s) => s.a),
        setsB: jugados.map((s) => s.b),
        puntosA: 0,
        puntosB: 0,
        tiebreak: false,
        tiebreakHasta: 7,
        esSuperTiebreakFinal: false,
        saque: "A",
        historial: [],
        pausado: false,
        puntoDeOro: false,
        superTiebreak3erSet: false,
        cargadoAMano: true,
      },
      finalizado: true,
      ganador,
    });
    setGuardando(false);
    if (resultadoError) {
      setError(`No se pudo guardar el resultado: ${resultadoError.message}`);
      return;
    }
    // Avisa a los otros jugadores con cuenta (si falla, el partido igual queda cargado).
    await supabase.rpc("avisar_partido_cargado", { p_partido: partido.id });
    router.replace("/mis-partidos");
  }

  if (!yo) return <p className="text-muted p-6">Cargando…</p>;

  return (
    <div className="w-full max-w-md flex flex-col gap-5 text-ink">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">Cargar un partido jugado</h1>
        <button onClick={() => router.back()} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer flex-shrink-0">
          Volver
        </button>
      </div>
      <p className="text-sm text-muted">
        Jugaste sin llevar el Marcadorcito: cargá el resultado y suma a tu historial. No tiene estadísticas de puntos, eso solo sale del Marcadorcito.
      </p>

      <form onSubmit={guardar} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1">
          <span className={etiquetaClass}>Cuándo jugaste</span>
          <input type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value || hoy())} className={inputClass} />
        </label>

        <CampoCancha value={cancha} onChange={setCancha} onElegir={(c) => setCanchaId(c?.id ?? null)} />

        <div className="flex flex-col gap-3 border-t border-ink/10 pt-4">
          <span className={etiquetaClass}>Quiénes jugaron</span>
          <span className="font-titulo font-extrabold uppercase text-xl leading-none">Vos: {yo.nombre}</span>
          <SlotJugador etiqueta="Tu compañero/a (Equipo A)" valor={companero} onChange={setCompanero} excluirIds={[rival1.jugadorId, rival2.jugadorId].filter(Boolean)} />
          <SlotJugador etiqueta="Rival 1 (Equipo B)" valor={rival1} onChange={setRival1} excluirIds={[companero.jugadorId, rival2.jugadorId].filter(Boolean)} />
          <SlotJugador etiqueta="Rival 2 (Equipo B)" valor={rival2} onChange={setRival2} excluirIds={[companero.jugadorId, rival1.jugadorId].filter(Boolean)} />
        </div>

        <div className="flex flex-col gap-2 border-t border-ink/10 pt-4">
          <span className={etiquetaClass}>Resultado por sets (games)</span>
          <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-2 items-center">
            <span />
            <span className="text-xs font-bold uppercase text-muted text-center">Nosotros</span>
            <span className="text-xs font-bold uppercase text-muted text-center">Ellos</span>
            {sets.map((s, i) => (
              <div key={i} className="contents">
                <span className="text-sm font-semibold">Set {i + 1}</span>
                <input inputMode="numeric" value={s.a} onChange={(e) => cambiarSet(i, "a", e.target.value)} placeholder="6" className={`${inputClass} text-center font-numero text-lg min-w-0 w-full`} />
                <input inputMode="numeric" value={s.b} onChange={(e) => cambiarSet(i, "b", e.target.value)} placeholder="4" className={`${inputClass} text-center font-numero text-lg min-w-0 w-full`} />
              </div>
            ))}
          </div>
          {resultadoValido && (
            <p className="text-sm font-semibold">
              {ganador === "A" ? "Ganaron ustedes" : "Ganaron ellos"} · {setsGanA}-{setsGanB} en sets
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-[#dc2626]">
            {error}
          </p>
        )}
        <button type="submit" disabled={guardando} className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar partido"}
        </button>
      </form>
    </div>
  );
}
