"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { construir, primeraRonda, paraGuardar, mensajeError } from "@/lib/torneosApp";

function Chips({ opciones, valor, onCambiar, etiqueta }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{etiqueta}</span>
      <div className="flex flex-wrap gap-1.5">
        {opciones.map(([v, texto]) => (
          <button
            key={v}
            type="button"
            onClick={() => onCambiar(v)}
            className={`text-sm font-semibold px-3 py-1.5 rounded-[6px] border cursor-pointer ${valor === v ? "bg-ink text-bg border-ink" : "border-ink/15"}`}
          >
            {texto}
          </button>
        ))}
      </div>
    </div>
  );
}

// Armar un torneo (2026-10-03): americano, mexicano o armable (liga o
// eliminación, con parejas fijas). Los jugadores pueden tener cuenta (se
// buscan o salen de tus frecuentes) o ser invitados (solo el nombre).
export default function NuevoTorneoForm() {
  const router = useRouter();
  const [yo, setYo] = useState(null); // { id, nombre }
  const [nombre, setNombre] = useState("");
  const [formato, setFormato] = useState("americano"); // americano | mexicano | armable
  const [sistema, setSistema] = useState("liga"); // liga | eliminacion
  const [cantidad, setCantidad] = useState(8); // jugadores
  const [canchas, setCanchas] = useState(2);
  const [puntos, setPuntos] = useState(24);
  const [totalRondas, setTotalRondas] = useState(7);
  const [pv, setPv] = useState(3);
  const [pe, setPe] = useState(1);
  const [slots, setSlots] = useState(Array.from({ length: 16 }, () => ({ nombre: "", jugadorId: null })));
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState(null);
  const [frecuentes, setFrecuentes] = useState([]);
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);

  const armable = formato === "armable";
  const formatoReal = armable ? sistema : formato;
  const maxCanchas = Math.min(4, armable ? cantidad / 4 : Math.floor(cantidad / 4));

  useEffect(() => {
    async function iniciar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }
      const [{ data: perfil }, { data: frec }] = await Promise.all([
        supabase.from("perfiles").select("nombre").eq("id", user.id).maybeSingle(),
        supabase.rpc("listar_mis_frecuentes"),
      ]);
      setYo({ id: user.id, nombre: perfil?.nombre ?? "Yo" });
      setFrecuentes(frec ?? []);
    }
    iniciar();
  }, [router]);

  const visibles = useMemo(() => slots.slice(0, cantidad), [slots, cantidad]);
  const yaEstan = new Set(visibles.map((s) => s.jugadorId).filter(Boolean));
  const completo = visibles.every((s) => s.nombre.trim().length > 0) && nombre.trim().length >= 2;

  function cambiarCantidad(n) {
    setCantidad(n);
    setCanchas((c) => Math.max(1, Math.min(c, Math.floor(n / 4))));
    setTotalRondas((t) => Math.min(t, Math.max(5, n - 1)));
  }

  // Pone una persona con cuenta en el primer lugar libre.
  function sumar(persona) {
    if (yaEstan.has(persona.id)) return;
    setSlots((prev) => {
      const i = prev.slice(0, cantidad).findIndex((s) => s.nombre.trim() === "");
      if (i === -1) return prev;
      return prev.map((s, k) => (k === i ? { nombre: persona.nombre, jugadorId: persona.id } : s));
    });
  }

  async function buscar(e) {
    e.preventDefault();
    const { data } = await supabase.rpc("buscar_jugadores", { p_termino: termino.trim() });
    setResultados(data ?? []);
  }

  async function crear() {
    setError("");
    setCreando(true);
    const { data, error: rpcError } = await supabase.rpc("crear_torneo", {
      p_nombre: nombre.trim(),
      p_formato: formatoReal,
      p_puntos: puntos,
      p_canchas: canchas,
      p_total_rondas: armable ? null : totalRondas,
      p_pv: pv,
      p_pe: pe,
      p_participantes: visibles.map((s) => ({ nombre: s.nombre.trim(), jugador_id: s.jugadorId })),
    });
    if (rpcError) {
      setCreando(false);
      setError(mensajeError(rpcError));
      return;
    }

    // Arma la primera ronda y la guarda. Si fallara, el torneo se abre igual y
    // la arma ahí (ver TorneoForm.js).
    const modelo = construir({
      torneo: { formato: formatoReal, canchas, puntos_partido: puntos, total_rondas: armable ? null : totalRondas, puntos_victoria: pv, puntos_empate: pe },
      participantes: data.participantes.map((p) => ({ ...p, jugador_id: null })),
      rondas: [],
    });
    await supabase.rpc("guardar_ronda", { p_torneo: data.id, ...paraGuardar(primeraRonda(modelo)) });
    router.replace(`/torneos/${data.id}`);
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-5 text-ink">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">Nuevo torneo</h1>
        <button onClick={() => router.push("/torneos")} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
          Cancelar
        </button>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Nombre del torneo
        <input
          id="nombre-torneo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={60}
          placeholder="Ej: Americano del sábado"
          className="rounded-[6px] border border-ink/20 bg-bg px-3 py-2.5 text-base font-normal"
        />
      </label>

      <Chips etiqueta="Formato" valor={formato} onCambiar={setFormato} opciones={[["americano", "Americano"], ["mexicano", "Mexicano"], ["armable", "Armable"]]} />
      <p className="text-xs text-muted -mt-2">
        {formato === "americano" && "Cada ronda cambian las parejas: se evita repetir compañeros y rivales. Suman puntos individuales."}
        {formato === "mexicano" && "La primera ronda es al azar; después juegan entre sí los que van parejos en la tabla."}
        {formato === "armable" && "Parejas fijas y las reglas las elegís vos: liga (todos contra todos) o eliminación directa."}
      </p>
      {armable && (
        <Chips etiqueta="Sistema" valor={sistema} onCambiar={setSistema} opciones={[["liga", "Liga (todos contra todos)"], ["eliminacion", "Eliminación directa"]]} />
      )}
      <Chips
        etiqueta={armable ? "Jugadores (de a 2 forman una pareja)" : "Jugadores"}
        valor={cantidad}
        onCambiar={cambiarCantidad}
        opciones={[[8, armable ? "8 (4 parejas)" : "8"], [12, armable ? "12 (6 parejas)" : "12"], [16, armable ? "16 (8 parejas)" : "16"]]}
      />
      {armable && sistema === "liga" && <Chips etiqueta="Puntos por victoria" valor={pv} onCambiar={setPv} opciones={[[3, "3"], [2, "2"], [1, "1"]]} />}
      {armable && sistema === "liga" && <Chips etiqueta="Puntos por empate" valor={pe} onCambiar={setPe} opciones={[[1, "1"], [0, "0"]]} />}
      <Chips etiqueta="Canchas" valor={canchas} onCambiar={setCanchas} opciones={[1, 2, 3, 4].filter((n) => n <= maxCanchas).map((n) => [n, String(n)])} />
      <Chips etiqueta="Cada partido a" valor={puntos} onCambiar={setPuntos} opciones={[[16, "16"], [24, "24"], [32, "32"]]} />
      {!armable && <Chips etiqueta="Rondas" valor={totalRondas} onCambiar={setTotalRondas} opciones={[5, 6, 7, 8].map((n) => [n, String(n)])} />}

      <div className="flex flex-col gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">Quiénes juegan</span>
        <div className="flex flex-wrap gap-1.5">
          {yo && !yaEstan.has(yo.id) && (
            <button type="button" onClick={() => sumar(yo)} className="text-xs font-semibold px-3 py-1.5 rounded-[6px] bg-accent text-accent-ink cursor-pointer">
              Sumarme
            </button>
          )}
          {frecuentes
            .filter((f) => !yaEstan.has(f.id))
            .slice(0, 8)
            .map((f) => (
              <button key={f.id} type="button" onClick={() => sumar(f)} className="text-xs font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
                + {f.nombre}
              </button>
            ))}
        </div>
        <form onSubmit={buscar} className="flex gap-2">
          <input
            id="buscar-jugador-torneo"
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            placeholder="Buscar un jugador de Padelito"
            className="flex-1 min-w-0 rounded-[6px] border border-ink/20 bg-bg px-3 py-2 text-sm"
          />
          <button type="submit" disabled={termino.trim().length < 2} className="text-sm font-semibold px-3 rounded-[6px] border border-ink/15 cursor-pointer disabled:opacity-50">
            Buscar
          </button>
        </form>
        {resultados?.map((j) => (
          <div key={j.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-ink/10">
            <span className="font-semibold text-sm">{j.nombre}</span>
            {yaEstan.has(j.id) ? (
              <span className="text-xs text-muted">Ya está</span>
            ) : (
              <button type="button" onClick={() => sumar(j)} className="text-xs font-bold px-3 py-1 rounded-[6px] bg-accent text-accent-ink cursor-pointer">
                Sumar
              </button>
            )}
          </div>
        ))}
        {resultados && resultados.length === 0 && <p className="text-xs text-muted">No encontramos jugadores con ese nombre.</p>}

        <p className="text-xs text-muted">
          Escribí el nombre de quien no tenga la app: juega como invitado. {armable && "Cada dos lugares seguidos forman una pareja."}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {visibles.map((s, i) => (
            <input
              key={i}
              id={`lugar-${i}`}
              value={s.nombre}
              onChange={(e) => setSlots((prev) => prev.map((x, k) => (k === i ? { nombre: e.target.value, jugadorId: null } : x)))}
              placeholder={`Jugador ${i + 1}`}
              maxLength={40}
              className={`rounded-[6px] border bg-bg px-3 py-2 text-sm ${s.jugadorId ? "border-accent-2" : "border-ink/20"} ${armable && i % 2 === 0 && i > 0 ? "mt-1.5" : ""}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#dc2626]">
          {error}
        </p>
      )}
      <button
        onClick={crear}
        disabled={!completo || creando}
        className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer disabled:opacity-50"
      >
        {creando ? "Armando…" : "Armar torneo"}
      </button>
    </div>
  );
}
