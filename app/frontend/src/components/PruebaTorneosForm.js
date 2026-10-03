"use client";

import { useMemo, useState } from "react";
import { armarRonda, tabla, armarLiga, tablaLiga, armarEliminacion, siguienteEliminacion, ganadoresEliminacion } from "@/lib/torneos";

// Vista previa de torneos entre amigos (2026-10-03, maqueta aprobada por el
// usuario). Tres formas de armar un torneo:
//  - Americano: las parejas cambian en cada ronda.
//  - Mexicano: las parejas se arman según la tabla.
//  - Armable: parejas fijas y las reglas las elegís vos (liga o eliminación).
// Funciona de verdad con datos de ejemplo, pero NO guarda nada. Después se
// conecta a la base de datos y a los grupos.

const NOMBRES = ["Eduardo", "Franco", "Nacho", "Enzo", "Matías", "Juanfer", "Lucas", "Pity", "Gonzalo", "Paulo", "Marcos", "Maxi", "Claudio", "Facundo", "Miguel", "Manuel"];

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

export default function PruebaTorneosForm() {
  const [fase, setFase] = useState("crear"); // crear | jugando | final
  const [formato, setFormato] = useState("americano"); // americano | mexicano | armable
  const [cantidad, setCantidad] = useState(8); // jugadores (americano/mexicano)
  const [parejasN, setParejasN] = useState(6); // parejas (armable)
  const [sistema, setSistema] = useState("liga"); // liga | eliminacion (armable)
  const [pv, setPv] = useState(3); // puntos por victoria (liga)
  const [pe, setPe] = useState(1); // puntos por empate (liga)
  const [canchas, setCanchas] = useState(2);
  const [puntos, setPuntos] = useState(24);
  const [totalRondas, setTotalRondas] = useState(7);
  const [nombres, setNombres] = useState(NOMBRES);
  const [rondas, setRondas] = useState([]);
  const [plan, setPlan] = useState([]); // liga: todas las rondas armadas de entrada

  const armable = formato === "armable";
  const eliminacion = armable && sistema === "eliminacion";
  const liga = armable && sistema === "liga";
  const cupo = armable ? parejasN * 2 : cantidad;

  const jugadores = useMemo(
    () => nombres.slice(0, cupo).map((nombre, i) => ({ id: `j${i}`, nombre: nombre.trim() || `Jugador ${i + 1}` })),
    [nombres, cupo]
  );
  const equipos = useMemo(
    () =>
      Array.from({ length: parejasN }, (_, i) => ({
        id: `e${i}`,
        nombre: `${jugadores[2 * i]?.nombre ?? "?"} / ${jugadores[2 * i + 1]?.nombre ?? "?"}`,
      })),
    [jugadores, parejasN]
  );
  const nombrePar = (ids) =>
    armable ? ids.map((id) => equipos.find((e) => e.id === id)?.nombre ?? "?").join(" / ") : ids.map((id) => jugadores.find((j) => j.id === id)?.nombre ?? "?").join(" / ");

  const filas = useMemo(() => (armable ? (liga ? tablaLiga(equipos, rondas, { pv, pe }) : []) : tabla(jugadores, rondas)), [armable, liga, equipos, jugadores, rondas, pv, pe]);

  const maxCanchas = Math.min(4, armable ? Math.floor(parejasN / 2) : Math.floor(cantidad / 4));
  const rondaActual = rondas[rondas.length - 1];
  const todosCargados = rondaActual?.partidos.every(
    (p) => p.ptsA != null && p.ptsB != null && (!eliminacion || p.ptsA !== p.ptsB)
  );
  const rondasTotales = liga ? plan.length : totalRondas;

  function cambiarFormato(f) {
    setFormato(f);
    setCanchas((c) => Math.max(1, Math.min(c, f === "armable" ? Math.floor(parejasN / 2) : Math.floor(cantidad / 4))));
  }
  function cambiarCantidad(n) {
    setCantidad(n);
    setCanchas((c) => Math.min(c, Math.floor(n / 4)));
    setTotalRondas((t) => Math.min(t, Math.max(5, n - 1)));
  }
  function cambiarParejas(n) {
    setParejasN(n);
    setCanchas((c) => Math.max(1, Math.min(c, Math.floor(n / 2))));
  }

  function armar() {
    if (armable) {
      if (eliminacion) {
        setRondas([armarEliminacion(equipos)]);
      } else {
        const todas = armarLiga(equipos, canchas);
        setPlan(todas);
        setRondas([todas[0]]);
      }
    } else {
      setRondas([armarRonda({ jugadores, canchas, rondas: [], formato })]);
    }
    setFase("jugando");
  }

  function cargarPuntos(idx, valor) {
    const n = valor === "" ? null : Math.max(0, Math.min(puntos, Number(valor)));
    setRondas((prev) =>
      prev.map((r, i) =>
        i !== prev.length - 1 ? r : { ...r, partidos: r.partidos.map((p, k) => (k !== idx ? p : { ...p, ptsA: n, ptsB: n == null ? null : puntos - n })) }
      )
    );
  }

  function alAzar() {
    setRondas((prev) =>
      prev.map((r, i) =>
        i !== prev.length - 1
          ? r
          : {
              ...r,
              partidos: r.partidos.map((p) => {
                let a = Math.floor(puntos * (0.3 + Math.random() * 0.4));
                if (eliminacion && a === puntos - a) a += 1;
                return { ...p, ptsA: a, ptsB: puntos - a };
              }),
            }
      )
    );
  }

  function cerrarRonda() {
    if (eliminacion) {
      const sig = siguienteEliminacion(rondaActual);
      if (!sig) return setFase("final");
      return setRondas((prev) => [...prev, sig]);
    }
    if (rondas.length >= rondasTotales) return setFase("final");
    if (liga) return setRondas((prev) => [...prev, plan[prev.length]]);
    setRondas((prev) => [...prev, armarRonda({ jugadores, canchas, rondas: prev, formato })]);
  }

  function nuevo() {
    setRondas([]);
    setPlan([]);
    setFase("crear");
  }

  const encabezado = (
    <div className="flex flex-col gap-2">
      <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">Torneos</h1>
      <p className="text-xs text-muted border border-ink/15 rounded-[6px] px-3 py-2">
        Vista previa con datos de ejemplo: funciona de verdad pero no guarda nada. Después se conecta a tus grupos.
      </p>
    </div>
  );

  if (fase === "crear") {
    const explicacion = {
      americano: "Cada ronda cambian las parejas: se evita repetir compañeros y rivales. Suman puntos individuales.",
      mexicano: "La primera ronda es al azar; después juegan entre sí los que van parejos en la tabla (1° y 4° contra 2° y 3°).",
      armable: "Parejas fijas y las reglas las elegís vos: liga (todos contra todos) o eliminación directa.",
    }[formato];
    return (
      <div className="w-full max-w-md flex flex-col gap-5 text-ink">
        {encabezado}
        <Chips etiqueta="Formato" valor={formato} onCambiar={cambiarFormato} opciones={[["americano", "Americano"], ["mexicano", "Mexicano"], ["armable", "Armable"]]} />
        <p className="text-xs text-muted -mt-2">{explicacion}</p>

        {!armable && <Chips etiqueta="Jugadores" valor={cantidad} onCambiar={cambiarCantidad} opciones={[[8, "8"], [12, "12"], [16, "16"]]} />}
        {armable && <Chips etiqueta="Parejas" valor={parejasN} onCambiar={cambiarParejas} opciones={[[4, "4"], [6, "6"], [8, "8"]]} />}
        {armable && (
          <Chips etiqueta="Sistema" valor={sistema} onCambiar={setSistema} opciones={[["liga", "Liga (todos contra todos)"], ["eliminacion", "Eliminación directa"]]} />
        )}
        {liga && <Chips etiqueta="Puntos por victoria" valor={pv} onCambiar={setPv} opciones={[[3, "3"], [2, "2"], [1, "1"]]} />}
        {liga && <Chips etiqueta="Puntos por empate" valor={pe} onCambiar={setPe} opciones={[[1, "1"], [0, "0"]]} />}
        <Chips etiqueta="Canchas" valor={canchas} onCambiar={setCanchas} opciones={[1, 2, 3, 4].filter((n) => n <= maxCanchas).map((n) => [n, String(n)])} />
        <Chips etiqueta="Cada partido a" valor={puntos} onCambiar={setPuntos} opciones={[[16, "16"], [24, "24"], [32, "32"]]} />
        {!armable && <Chips etiqueta="Rondas" valor={totalRondas} onCambiar={setTotalRondas} opciones={[5, 6, 7, 8].map((n) => [n, String(n)])} />}

        <div className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
            {armable ? "Las parejas (tocá para cambiar los nombres)" : "Quiénes juegan (tocá para cambiar el nombre)"}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {nombres.slice(0, cupo).map((n, i) => (
              <input
                key={i}
                id={`jugador-${i}`}
                value={n}
                onChange={(e) => setNombres((prev) => prev.map((x, k) => (k === i ? e.target.value : x)))}
                className={`rounded-[6px] border bg-bg px-3 py-2 text-sm ${armable && i % 2 === 0 && i > 0 ? "mt-1.5" : ""} border-ink/20`}
              />
            ))}
          </div>
        </div>
        <button onClick={armar} className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer">
          Armar torneo
        </button>
      </div>
    );
  }

  // Quiénes suben al podio al terminar.
  let podio = [];
  if (fase === "final") {
    if (eliminacion) {
      const final = rondas[rondas.length - 1];
      const campeonId = ganadoresEliminacion(final)[0];
      const p = final.partidos[0];
      const subId = p.a[0] === campeonId ? p.b[0] : p.a[0];
      const ptsEquipo = (id) => rondas.reduce((s, r) => s + r.partidos.reduce((t, m) => t + (m.a[0] === id ? m.ptsA : m.b[0] === id ? m.ptsB : 0), 0), 0);
      podio = [campeonId, subId].map((id) => ({ id, nombre: equipos.find((e) => e.id === id)?.nombre, pf: ptsEquipo(id) }));
    } else if (liga) {
      podio = filas.slice(0, 3).map((f) => ({ id: f.id, nombre: f.nombre, pf: f.pts }));
    } else {
      podio = filas.slice(0, 3);
    }
  }
  const formatoTexto = { americano: "Americano", mexicano: "Mexicano", armable: eliminacion ? "Eliminación directa" : "Liga" }[formato];

  return (
    <div className="w-full max-w-md flex flex-col gap-5 text-ink">
      {encabezado}

      {fase === "jugando" && rondaActual && (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-titulo text-3xl font-black uppercase leading-none">
              {eliminacion ? rondaActual.titulo : `Ronda ${rondaActual.numero} de ${rondasTotales}`}
            </h2>
            <button onClick={nuevo} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
              Salir
            </button>
          </div>

          {rondaActual.partidos.map((p, idx) => (
            <div key={idx} className="rounded-[8px] border border-ink/15 p-3 flex flex-col gap-2">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Cancha {p.cancha}</span>
              {[
                { ids: p.a, valor: p.ptsA, editable: true },
                { ids: p.b, valor: p.ptsB, editable: false },
              ].map((par, k) => (
                <div key={k} className="grid grid-cols-[1fr_4rem] items-center gap-3">
                  <span className="font-semibold">{nombrePar(par.ids)}</span>
                  {par.editable ? (
                    <input
                      id={`puntos-${idx}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={puntos}
                      value={par.valor ?? ""}
                      onChange={(e) => cargarPuntos(idx, e.target.value)}
                      aria-label={`Puntos de ${nombrePar(par.ids)}`}
                      className="font-numero font-bold text-2xl text-center rounded-[6px] border border-ink py-1 bg-bg w-full"
                    />
                  ) : (
                    <span className="font-numero font-bold text-2xl text-center rounded-[6px] border border-ink/30 py-1 text-muted">{par.valor ?? "—"}</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {eliminacion && rondaActual.pasan.length > 0 && (
            <p className="text-xs text-muted">Pasan directo: {nombrePar(rondaActual.pasan)}</p>
          )}
          {!eliminacion && rondaActual.descansan.length > 0 && <p className="text-xs text-muted">Descansan: {nombrePar(rondaActual.descansan)}</p>}
          {eliminacion && <p className="text-xs text-muted">En eliminación no hay empates: alguien tiene que ganar.</p>}

          <div className="flex gap-2">
            <button onClick={alAzar} className="text-sm font-semibold px-3 rounded-[6px] border border-ink/15 cursor-pointer">
              Cargar al azar (prueba)
            </button>
            <button
              onClick={cerrarRonda}
              disabled={!todosCargados}
              className="flex-1 rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer disabled:opacity-50"
            >
              {eliminacion
                ? rondaActual.titulo === "Final"
                  ? "Terminar torneo"
                  : "Cerrar ronda"
                : rondas.length >= rondasTotales
                  ? "Terminar torneo"
                  : "Cerrar ronda"}
            </button>
          </div>
        </>
      )}

      {fase === "final" && (
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
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em]">
              {formatoTexto} · {canchas} {canchas === 1 ? "cancha" : "canchas"}
            </span>
            <span className="font-titulo font-black uppercase text-[2.6rem] leading-[0.9]">Ganó {podio[0]?.nombre}</span>
            <span className="text-xs opacity-75">Así saldría la tarjeta para compartir (maqueta).</span>
          </div>
          <button onClick={nuevo} className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer">
            Nuevo torneo
          </button>
        </>
      )}

      {!eliminacion && (
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
          {liga && <p className="text-xs text-muted pt-2">Puntos: victoria {pv}, empate {pe}. Desempata la diferencia de puntos.</p>}
        </div>
      )}

      {eliminacion && rondas.length > (fase === "final" ? 0 : 1) && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">Resultados</span>
          {rondas
            .slice(0, fase === "final" ? undefined : -1)
            .map((r) =>
              r.partidos.map((p, k) => (
                <div key={`${r.numero}-${k}`} className="flex items-center justify-between gap-3 py-2.5 border-b border-ink/10 text-sm">
                  <span className="min-w-0">
                    <span className="text-xs text-muted block">{r.titulo}</span>
                    <span className="font-semibold">
                      {nombrePar(p.a)} vs. {nombrePar(p.b)}
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
    </div>
  );
}
