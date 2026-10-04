"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import GuiaCelular from "@/components/GuiaCelular";
import PelotaLoader from "@/components/PelotaLoader";
import CampoCancha from "@/components/CampoCancha";
import { IconoPlay, IconoPelota } from "@/components/Icons";
import { crearEstadoInicial } from "@/lib/marcadorEngine";
import {
  usuarioActual,
  sinConexion,
  esErrorDeRed,
  guardarNombrePropio,
  leerNombrePropio,
  crearPartidoSinSenal,
} from "@/lib/marcadorOffline";

// Rediseño Cartel (2026-10-01): sin tarjetas -- los bloques se separan con
// líneas finas, los campos llevan contorno fino y las etiquetas van chicas
// en mayúscula. El único botón amarillo es "Empezar a jugar".
const inputClass = "rounded-[6px] bg-transparent border border-ink/15 px-3 py-2 text-ink text-sm";
const tarjeta = "text-ink border-b border-ink/10 pb-4";
const etiquetaClass = "text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted";

function Subtitulo({ children }) {
  return <span className={etiquetaClass}>{children}</span>;
}

// Un slot de jugador del plantel ad-hoc: busca por nombre contra cuentas
// reales (buscar_jugadores); si el usuario elige una coincidencia, queda
// vinculado (jugador_id); si sigue escribiendo texto libre sin elegir
// ninguna, al enviar el formulario queda como invitado libre
// (invitado_nombre), sin cuenta ni perfil asociado (US-2.8).
export function SlotJugador({ etiqueta, valor, onChange, excluirIds = [] }) {
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  async function buscar(termino) {
    onChange({ termino, jugadorId: null, nombre: termino });
    if (termino.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const { data } = await supabase.rpc("buscar_jugadores", { p_termino: termino.trim() });
    setBuscando(false);
    // Saca de las sugerencias a quien ya se eligió en otro casillero -- así
    // no se puede repetir la misma cuenta dos veces (antes solo se
    // avisaba recién al enviar el formulario).
    setResultados((data ?? []).filter((r) => !excluirIds.includes(r.id)));
  }

  function elegir(jugador) {
    onChange({ termino: jugador.nombre, jugadorId: jugador.id, nombre: jugador.nombre });
    setResultados([]);
  }

  return (
    <label className="flex flex-col gap-1 relative">
      <span className={etiquetaClass}>{etiqueta}</span>
      <input
        type="text"
        value={valor.termino}
        onChange={(e) => buscar(e.target.value)}
        placeholder="Nombre..."
        className={inputClass}
      />
      {valor.jugadorId && (
        <span className="text-xs text-muted">✓ Vinculado a una cuenta real</span>
      )}
      {!valor.jugadorId && valor.termino.trim() !== "" && resultados.length === 0 && !buscando && (
        <span className="text-xs text-muted">Se va a cargar como invitado libre (sin cuenta)</span>
      )}
      {resultados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface rounded-[6px] border border-ink/15 z-10 overflow-hidden">
          {resultados.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => elegir(r)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-bg cursor-pointer border-b border-ink/10 last:border-b-0"
            >
              {r.nombre}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

// "Marcador libre" (US-2.8): registra un partido jugado por fuera de la
// app (sin pasar por "Crear partido"), con hasta 3 jugadores más además de
// quien lo carga -- cada uno como cuenta real vinculada o como invitado
// libre. El partido queda marcado `es_adhoc = true` (se juega ahora, no se
// agenda a futuro) y arranca directo en el marcador en vivo (US-2.7), que
// es el mismo componente/motor para los dos modos.
export default function MarcadorLibreForm() {
  const router = useRouter();
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [nombrePropio, setNombrePropio] = useState("");

  const [cancha, setCancha] = useState("");
  const [canchaId, setCanchaId] = useState(null);
  const [puntoDeOro, setPuntoDeOro] = useState(false);
  const [companero, setCompanero] = useState({ termino: "", jugadorId: null, nombre: "" });
  const [rival1, setRival1] = useState({ termino: "", jugadorId: null, nombre: "" });
  const [rival2, setRival2] = useState({ termino: "", jugadorId: null, nombre: "" });

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verificarSesion() {
      // Sin señal (2026-09-30): se usa la sesión y el nombre guardados en el
      // celu -- ver marcadorOffline.js.
      const user = await usuarioActual();
      if (!user) {
        if (sinConexion()) window.location.replace("/offline");
        else router.replace("/login");
        return;
      }
      const { data: perfil } = sinConexion()
        ? { data: null }
        : await supabase.from("perfiles").select("nombre").eq("id", user.id).maybeSingle();
      if (perfil?.nombre) guardarNombrePropio(perfil.nombre);
      setNombrePropio(perfil?.nombre ?? leerNombrePropio() ?? "Vos");
      setVerificandoSesion(false);
    }
    verificarSesion();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const user = await usuarioActual();
    if (!user) {
      if (sinConexion()) window.location.replace("/offline");
      else router.replace("/login");
      return;
    }

    // Completa lo que haya quedado vacío con datos rápidos (2026-09-13, a
    // pedido del usuario: "si no completás nada y tocás empezar a jugar,
    // que complete con datos al azar pero que igual genere el
    // marcadorcito" -- antes esto vivía solo en el botón separado
    // "Generar partido rápido"; ahora "Empezar a jugar" hace lo mismo por
    // su cuenta si hace falta, en el mismo toque). No usa el `cancha`/
    // `companero`/etc. de React directo para el insert porque `setCancha`
    // etc. son async -- calcula acá mismo los valores "efectivos" y
    // también actualiza el estado, para que la pantalla quede consistente
    // con lo que se guardó.
    let canchaEfectiva = cancha;
    let canchaIdEfectivo = canchaId;
    if (canchaEfectiva.trim() === "" && !sinConexion()) {
      const { data } = await supabase
        .from("canchas")
        .select("id, nombre")
        .order("nombre", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) {
        canchaEfectiva = data.nombre;
        canchaIdEfectivo = data.id;
        setCancha(canchaEfectiva);
        setCanchaId(canchaIdEfectivo);
      }
    }
    let companeroEfectivo = companero;
    if (companeroEfectivo.termino.trim() === "") {
      companeroEfectivo = { termino: "Compañero QA", jugadorId: null, nombre: "Compañero QA" };
      setCompanero(companeroEfectivo);
    }
    let rival1Efectivo = rival1;
    if (rival1Efectivo.termino.trim() === "") {
      rival1Efectivo = { termino: "Rival QA 1", jugadorId: null, nombre: "Rival QA 1" };
      setRival1(rival1Efectivo);
    }
    let rival2Efectivo = rival2;
    if (rival2Efectivo.termino.trim() === "") {
      rival2Efectivo = { termino: "Rival QA 2", jugadorId: null, nombre: "Rival QA 2" };
      setRival2(rival2Efectivo);
    }

    // Valida que no se haya linkeado la misma cuenta real en dos
    // casilleros distintos (el error de la base sin esto es correcto pero
    // ilegible -- "duplicate key value violates unique constraint").
    const idsVinculados = [companeroEfectivo.jugadorId, rival1Efectivo.jugadorId, rival2Efectivo.jugadorId].filter(
      Boolean
    );
    const idsUnicos = new Set(idsVinculados);
    if (idsUnicos.size !== idsVinculados.length) {
      setError("Elegiste la misma cuenta en más de un casillero -- cada jugador tiene que ser distinto.");
      return;
    }

    setCargando(true);

    // Sin señal: el partido se arma solo en el celu y se sube cuando vuelve
    // la conexión (marcadorOffline.js). También si el insert falla por red.
    const { finalizado: _f, ganador: _g, ...estadoBase } = crearEstadoInicial();
    const armarSinSenal = () => {
      const id = crearPartidoSinSenal({
        usuario: user,
        nombrePropio,
        cancha: canchaEfectiva,
        puntoDeOro,
        // Misma forma que ESTADO_INICIAL de MarcadorForm.js.
        estadoInicial: { ...estadoBase, historial: [], pausado: false, superTiebreak3erSet: false },
        jugadores: [
          { equipo: "A", jugadorId: companeroEfectivo.jugadorId, nombre: companeroEfectivo.nombre },
          { equipo: "B", jugadorId: rival1Efectivo.jugadorId, nombre: rival1Efectivo.nombre },
          { equipo: "B", jugadorId: rival2Efectivo.jugadorId, nombre: rival2Efectivo.nombre },
        ],
      });
      setCargando(false);
      if (!id) {
        setError("No hay señal y no se pudo guardar el partido en el celu.");
        return;
      }
      router.replace(`/partido/${id}/marcador`);
    };
    if (sinConexion()) {
      armarSinSenal();
      return;
    }

    const { data: partido, error: partidoError } = await supabase
      .from("partidos")
      .insert({
        organizador_id: user.id,
        fecha_hora: new Date().toISOString(),
        cancha: canchaEfectiva,
        cancha_id: canchaIdEfectivo,
        cantidad_jugadores: 4,
        punto_de_oro: puntoDeOro,
        es_adhoc: true,
      })
      .select()
      .single();

    if (partidoError && esErrorDeRed(partidoError)) {
      armarSinSenal();
      return;
    }
    if (partidoError) {
      setCargando(false);
      setError(`No se pudo crear el partido: ${partidoError.message}`);
      return;
    }

    // El organizador ya quedó insertado solo (trigger
    // agregar_organizador_como_confirmado, 002_partidos.sql) apenas se creó
    // el partido -- ese trigger no sabe de equipos, así que acá solo hace
    // falta actualizarle el equipo, no insertarlo de nuevo (insertarlo de
    // nuevo chocaba con la fila que ya puso el trigger).
    const { error: equipoError } = await supabase
      .from("partido_jugadores")
      .update({ equipo: "A" })
      .eq("partido_id", partido.id)
      .eq("jugador_id", user.id);

    if (equipoError) {
      setCargando(false);
      setError(`No se pudo asignar tu equipo: ${equipoError.message}`);
      return;
    }

    const filas = [
      {
        equipo: "A",
        jugadorId: companeroEfectivo.jugadorId,
        nombre: companeroEfectivo.nombre,
        esInvitado: !companeroEfectivo.jugadorId,
      },
      {
        equipo: "B",
        jugadorId: rival1Efectivo.jugadorId,
        nombre: rival1Efectivo.nombre,
        esInvitado: !rival1Efectivo.jugadorId,
      },
      {
        equipo: "B",
        jugadorId: rival2Efectivo.jugadorId,
        nombre: rival2Efectivo.nombre,
        esInvitado: !rival2Efectivo.jugadorId,
      },
    ].map((f) => ({
      partido_id: partido.id,
      jugador_id: f.jugadorId,
      invitado_nombre: f.esInvitado ? f.nombre : null,
      equipo: f.equipo,
      estado: "confirmado",
    }));

    const { error: jugadoresError } = await supabase.from("partido_jugadores").insert(filas);

    setCargando(false);

    if (jugadoresError) {
      setError(`No se pudo armar el plantel: ${jugadoresError.message}`);
      return;
    }

    // replace (no push): así el "atrás" desde el marcador no vuelve a este
    // formulario ya usado (2026-09-30, pedido del usuario).
    router.replace(`/partido/${partido.id}/marcador`);
  }

  if (verificandoSesion) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">Marcadorcito</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer flex-shrink-0"
        >
          Volver
        </button>
      </div>

      <button
        type="button"
        onClick={() => router.push("/cargar-partido")}
        className="self-start font-semibold text-xs px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
      >
        Cargar un partido ya jugado (sin Marcadorcito)
      </button>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className={tarjeta}>
          <p className="text-muted text-sm mb-3">
            Registrá un partido que jugás ahora por tu cuenta, sin pasar por &quot;Crear partido&quot;. Vos quedás
            como organizador y jugás en el equipo A junto a tu compañero/a.
          </p>

          {/* Acceso a la demo SIN pasar por el formulario -- a pedido del
              usuario (2026-09-10): "ahí no me debería obligar a completar
              primero, mirá la demo y después si querés pasa a usarla". */}
          <button
            type="button"
            onClick={() => router.push("/marcador-libre/demo")}
            className="w-full font-semibold text-sm px-4 py-3 rounded-[6px] border border-ink/15 text-ink cursor-pointer flex items-center justify-center gap-2"
          >
            <IconoPlay width={16} height={16} /> Ver cómo funciona (demo)
          </button>
          <p className="text-xs text-muted text-center mt-2">
            Abre el marcador con datos de ejemplo, sin guardar nada.
          </p>
        </div>

        {/* Sin subtítulo propio: CampoCancha ya trae su etiqueta "Cancha". */}
        <div className="flex flex-col gap-2">
          <div className={tarjeta}>
            <CampoCancha value={cancha} onChange={setCancha} onElegir={(c) => setCanchaId(c?.id ?? null)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Subtitulo>Plantel</Subtitulo>
          <div className={`${tarjeta} flex flex-col gap-3`}>
            <div className="flex flex-col gap-1">
              <span className={etiquetaClass}>Equipo A</span>
              <span className="font-titulo font-extrabold uppercase text-xl leading-none">Vos: {nombrePropio}</span>
            </div>

            <SlotJugador
              etiqueta="Tu compañero/a (Equipo A)"
              valor={companero}
              onChange={setCompanero}
              excluirIds={[rival1.jugadorId, rival2.jugadorId].filter(Boolean)}
            />
            <SlotJugador
              etiqueta="Rival 1 (Equipo B)"
              valor={rival1}
              onChange={setRival1}
              excluirIds={[companero.jugadorId, rival2.jugadorId].filter(Boolean)}
            />
            <SlotJugador
              etiqueta="Rival 2 (Equipo B)"
              valor={rival2}
              onChange={setRival2}
              excluirIds={[companero.jugadorId, rival1.jugadorId].filter(Boolean)}
            />
          </div>
        </div>

        <div className={tarjeta}>
          <label className="flex items-start gap-2">
            <input className="mt-0.5" type="checkbox" checked={puntoDeOro} onChange={(e) => setPuntoDeOro(e.target.checked)} />
            <span className="text-sm">
              Jugar con &quot;punto de oro&quot; (en 40-40 gana el próximo punto, sin ventaja)
            </span>
          </label>
        </div>

        <GuiaCelular />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full font-titulo font-black uppercase text-[1.75rem] leading-none px-4 py-4 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {cargando && <PelotaLoader />}
          {cargando ? "Creando..." : (
            <>
              <IconoPelota width={22} height={22} /> Empezar a jugar
            </>
          )}
        </button>
      </form>
    </div>
  );
}
