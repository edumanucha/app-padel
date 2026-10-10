"use client";

import ConPelota from "@/components/ConPelota";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import Toggle from "@/components/Toggle";
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
const etiquetaClass = "text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted";

// Un slot de jugador del plantel ad-hoc: busca por nombre contra cuentas
// reales (buscar_jugadores); si el usuario elige una coincidencia, queda
// vinculado (jugador_id); si sigue escribiendo texto libre sin elegir
// ninguna, al enviar el formulario queda como invitado libre
// (invitado_nombre), sin cuenta ni perfil asociado (US-2.8).
// `oscuro` (D-38): versión para ir adentro del cartel verde VS -- sin
// etiqueta arriba (va como placeholder), contorno punteado verde claro y
// textos claros, colores fijos como el resto de los carteles.
export function SlotJugador({ etiqueta, valor, onChange, excluirIds = [], oscuro = false }) {
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
      {!oscuro && <span className={etiquetaClass}>{etiqueta}</span>}
      <input
        type="text"
        value={valor.termino}
        onChange={(e) => buscar(e.target.value)}
        placeholder={oscuro ? `+ ${etiqueta}` : "Nombre..."}
        aria-label={etiqueta}
        className={
          oscuro
            ? `rounded-[6px] px-3 py-2.5 text-sm font-semibold text-[#eaf4f0] placeholder:text-[#c4dad3] placeholder:font-normal bg-transparent ${
                valor.termino ? "border border-[#8fb6ae]" : "border-[1.5px] border-dashed border-[#8fb6ae]"
              }`
            : inputClass
        }
      />
      {valor.jugadorId && (
        <span className={`text-xs ${oscuro ? "text-[#c4dad3]" : "text-muted"}`}>✓ Vinculado a una cuenta real</span>
      )}
      {!valor.jugadorId && valor.termino.trim() !== "" && resultados.length === 0 && !buscando && (
        <span className={`text-xs ${oscuro ? "text-[#c4dad3]" : "text-muted"}`}>Se va a cargar como invitado libre (sin cuenta)</span>
      )}
      {resultados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface rounded-[6px] border border-ink/15 z-10 overflow-hidden">
          {resultados.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => elegir(r)}
              className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-bg cursor-pointer border-b border-ink/10 last:border-b-0"
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

    // Hay que completar los datos (2026-10-05, pedido del usuario): ya no se
    // inventa un partido rápido con "Compañero QA" y rivales de prueba.
    const canchaEfectiva = cancha;
    const canchaIdEfectivo = canchaId;
    const companeroEfectivo = companero;
    const rival1Efectivo = rival1;
    const rival2Efectivo = rival2;
    if (
      canchaEfectiva.trim() === "" ||
      companeroEfectivo.termino.trim() === "" ||
      rival1Efectivo.termino.trim() === "" ||
      rival2Efectivo.termino.trim() === ""
    ) {
      setError("Completá la cancha, tu compañero/a y los dos rivales (si no tienen cuenta, alcanza con el nombre).");
      return;
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
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{"Marcadorcito"}</ConPelota></h1>
        {/* Acceso a la demo SIN pasar por el formulario (2026-09-10, a pedido
            del usuario). Desde D-38 es un botoncito al lado del título; el
            "Volver" salió porque la barra de abajo ya lleva al Inicio. */}
        <button
          type="button"
          onClick={() => router.push("/marcador-libre/demo")}
          className="text-xs font-bold uppercase tracking-[0.06em] px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer flex-shrink-0 inline-flex items-center gap-1.5 mt-1"
        >
          <IconoPlay width={12} height={12} /> Demo
        </button>
      </div>

      {/* D-38 (2026-10-10, opción B "Cartel VS" elegida por el usuario): menos
          texto -- salieron la explicación de arriba y el consejo de dónde
          dejar el celu (ya está en la hoja de elegir modo, D-35); las parejas
          van en un cartel verde con un VS amarillo; punto de oro como
          interruptor; "Cargar un partido ya jugado" pasa al final. */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* CampoCancha ya trae su etiqueta "Cancha". */}
        <CampoCancha value={cancha} onChange={setCancha} onElegir={(c) => setCanchaId(c?.id ?? null)} />

        <div className="rounded-[8px] bg-[#154139] text-[#eaf4f0] px-4 py-4 flex flex-col gap-2.5">
          <span className="font-titulo font-black uppercase text-[1.6rem] leading-none truncate">
            {nombrePropio} <span className="text-[#8fb6ae]">y</span>
          </span>
          <SlotJugador
            oscuro
            etiqueta="Tu compañero/a"
            valor={companero}
            onChange={setCompanero}
            excluirIds={[rival1.jugadorId, rival2.jugadorId].filter(Boolean)}
          />
          <div className="flex items-center gap-3 my-0.5" aria-hidden>
            <span className="flex-1 h-px bg-[#eaf4f0]/20" />
            <span className="font-titulo font-black text-[2.6rem] leading-none text-[#f2c53d]">VS</span>
            <span className="flex-1 h-px bg-[#eaf4f0]/20" />
          </div>
          <SlotJugador
            oscuro
            etiqueta="Rival 1"
            valor={rival1}
            onChange={setRival1}
            excluirIds={[companero.jugadorId, rival2.jugadorId].filter(Boolean)}
          />
          <SlotJugador
            oscuro
            etiqueta="Rival 2"
            valor={rival2}
            onChange={setRival2}
            excluirIds={[companero.jugadorId, rival1.jugadorId].filter(Boolean)}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-y border-ink/10 py-3">
          <span className="flex flex-col">
            <span className="font-semibold text-sm">Punto de oro</span>
            <span className="text-xs text-muted">En 40-40 gana el próximo punto</span>
          </span>
          <Toggle checked={puntoDeOro} onChange={setPuntoDeOro} />
        </div>

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

      <button
        type="button"
        onClick={() => router.push("/cargar-partido")}
        className="self-center text-sm text-muted underline underline-offset-2 cursor-pointer"
      >
        Cargar un partido ya jugado
      </button>
    </div>
  );
}
