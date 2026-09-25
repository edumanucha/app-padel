"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { IconoPelota, IconoCompartir, IconoRepetir, IconoBilletera, IconoTelefono } from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

const tarjeta = "bg-surface text-ink rounded-[18px] p-4 shadow-[0_1px_3px_rgba(20,38,31,0.08)]";
const tarjetaChica = "bg-bg rounded-[14px] p-3 flex flex-col gap-2";
const botonSuave = "font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer";

// Campo "nombre" de un gasto (US-10.1): busca contra cuentas reales
// (buscar_jugadores, mismo RPC que ya usa el marcador libre ad-hoc,
// US-2.8) para poder avisarle su saldo por notificación si es una
// cuenta real; si sigue como texto libre, queda como invitado sin
// notificación (no hay a quién avisarle).
function CampoJugadorGasto({ valor, onChange }) {
  const { t } = useLocale();
  const [resultados, setResultados] = useState([]);

  async function buscar(texto) {
    onChange({ nombre: texto, jugadorId: null, monto: valor.monto });
    if (texto.trim().length < 2) {
      setResultados([]);
      return;
    }
    const { data } = await supabase.rpc("buscar_jugadores", { p_termino: texto.trim() });
    setResultados(data ?? []);
  }

  function elegir(jugador) {
    onChange({ nombre: jugador.nombre, jugadorId: jugador.id, monto: valor.monto });
    setResultados([]);
  }

  return (
    <label className="flex-1 relative">
      <input
        value={valor.nombre}
        onChange={(e) => buscar(e.target.value)}
        placeholder={t("completarPerfil.nombre")}
        className="w-full rounded-xl bg-bg px-2 py-1 text-sm"
      />
      {valor.jugadorId && <span className="text-[10px] text-muted">{t("detallePartido.cuentaReal")}</span>}
      {resultados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface rounded-[12px] shadow-[0_2px_8px_rgba(20,38,31,0.15)] z-10 overflow-hidden">
          {resultados.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => elegir(r)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-bg cursor-pointer"
            >
              {r.nombre}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

function etiquetaNivel(n, t) {
  return t("directorio.opcionNivelGenerica", { n });
}

function manoHabilLabel(v, t) {
  if (v === "diestro") return t("directorio.diestro");
  if (v === "zurdo") return t("directorio.zurdo");
  return v;
}

function posicionLabel(v, t) {
  if (v === "drive") return t("companero.drive");
  if (v === "reves") return t("companero.reves");
  return v;
}

const ESTADO_CLAVE = {
  abierto: "estadoAbierto",
  completo: "estadoCompleto",
  cancelado: "estadoCancelado",
  jugado: "estadoJugado",
};
function etiquetaEstadoPartido(estado, t) {
  return ESTADO_CLAVE[estado] ? t(`misPartidos.${ESTADO_CLAVE[estado]}`) : estado;
}

// Pantalla "Detalle de partido" (US-2.5: ver estado + cancelar; US-2.6:
// plantel con teléfono visible solo para confirmados). La transición a
// "jugado" no la hace el cliente -- se llama a la función del sistema
// marcar_partidos_jugados() (perezosa, ver 002_partidos.sql) antes de leer,
// para que el estado que se muestra esté al día.
export default function DetallePartidoForm({ partidoId }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [usuarioId, setUsuarioId] = useState(null);
  const [partido, setPartido] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [confirmandoCancelacion, setConfirmandoCancelacion] = useState(false);
  const [canchaId, setCanchaId] = useState(null);
  const [mensajeCompartir, setMensajeCompartir] = useState("");
  const [gastos, setGastos] = useState([{ nombre: "", monto: "", jugadorId: null }]);
  const [editandoGastos, setEditandoGastos] = useState(false);
  const [guardandoGastos, setGuardandoGastos] = useState(false);

  useEffect(() => {
    async function iniciar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUsuarioId(user.id);
    }

    iniciar();
  }, [router]);

  useEffect(() => {
    if (!usuarioId) return;
    cargarDetalle();
  }, [usuarioId]);

  async function cargarDetalle() {
    setCargando(true);
    setError("");

    // Recalcula perezosamente abierto/completo -> jugado antes de leer.
    await supabase.rpc("marcar_partidos_jugados");

    const [partidoRes, participantesRes] = await Promise.all([
      supabase.from("partidos").select("*").eq("id", partidoId).single(),
      supabase.rpc("ver_participantes_partido", { p_partido_id: partidoId }),
    ]);

    if (partidoRes.error) {
      setError(t("detallePartido.noSePudoCargar", { mensaje: partidoRes.error.message }));
      setCargando(false);
      return;
    }

    setPartido(partidoRes.data);
    setParticipantes(participantesRes.data ?? []);
    const gastosGuardados = partidoRes.data?.gastos;
    if (Array.isArray(gastosGuardados) && gastosGuardados.length > 0) {
      setGastos(
        gastosGuardados.map((g) => ({ nombre: g.nombre, monto: String(g.monto), jugadorId: g.jugador_id ?? null }))
      );
    }
    setCargando(false);

    // US-4.3, ahora con relación real (2026-09-13): si el partido se creó
    // eligiendo una sugerencia real de CampoCancha.js, ya tiene su
    // `cancha_id` guardado -- se usa directo. Los partidos viejos (o los
    // que se cargaron con un texto que no coincidía con ninguna
    // sugerencia) no tienen ese id, así que como respaldo se sigue
    // intentando el match heurístico por nombre exacto contra el
    // Directorio, para no perder el acceso que ya tenían.
    if (partidoRes.data?.cancha_id) {
      setCanchaId(partidoRes.data.cancha_id);
    } else if (partidoRes.data?.cancha) {
      const { data: canchaMatch } = await supabase
        .from("canchas")
        .select("id")
        .eq("nombre", partidoRes.data.cancha)
        .maybeSingle();
      setCanchaId(canchaMatch?.id ?? null);
    }
  }

  async function handleCancelar() {
    setCancelando(true);
    setError("");

    const { error: updateError } = await supabase
      .from("partidos")
      .update({ estado: "cancelado" })
      .eq("id", partidoId);

    setCancelando(false);
    setConfirmandoCancelacion(false);

    if (updateError) {
      setError(t("detallePartido.noSePudoCancelar", { mensaje: updateError.message }));
      return;
    }

    cargarDetalle();
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("detallePartido.cargando")}</p>
      </div>
    );
  }

  if (!partido) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4">
        <p className="text-red-600 text-sm">{error || t("detallePartido.noEncontrado")}</p>
        <button onClick={() => router.push("/partidos")} className={`${botonSuave} self-start`}>
          {t("detallePartido.volver")}
        </button>
      </div>
    );
  }

  const soyOrganizador = partido.organizador_id === usuarioId;
  const puedeCancelar = soyOrganizador && partido.estado !== "cancelado" && partido.estado !== "jugado";
  const puedeRepetir = soyOrganizador && (partido.estado === "jugado" || partido.estado === "cancelado");
  const miParticipacion = participantes.find((p) => p.jugador_id === usuarioId);
  const estoyEnEspera = miParticipacion?.estado === "en_espera";
  const hayLugar = partido.lugares_ocupados < partido.cantidad_jugadores;

  async function handleConfirmarLugarEspera() {
    await supabase
      .from("partido_jugadores")
      .update({ estado: "anotado" })
      .eq("partido_id", partidoId)
      .eq("jugador_id", usuarioId);
    cargarDetalle();
  }

  async function handleSalirDeLaLista() {
    await supabase.from("partido_jugadores").delete().eq("partido_id", partidoId).eq("jugador_id", usuarioId);
    cargarDetalle();
  }

  function handleRepetir() {
    const params = new URLSearchParams({
      repetir: "1",
      cancha: partido.cancha ?? "",
      cantidadJugadores: String(partido.cantidad_jugadores ?? ""),
      puntoDeOro: String(partido.punto_de_oro ?? false),
      nivelMin: partido.nivel_min != null ? String(partido.nivel_min) : "",
      nivelMax: partido.nivel_max != null ? String(partido.nivel_max) : "",
    });
    router.push(`/crear-partido?${params.toString()}`);
  }

  async function handleCompartir() {
    const link = `${window.location.origin}/p/${partidoId}`;
    try {
      await navigator.clipboard.writeText(link);
      setMensajeCompartir(t("detallePartido.linkCopiado"));
    } catch {
      setMensajeCompartir(link);
    }
  }

  // US-10.1 (splitwise simple): cada uno pone cuánto gastó -- el nombre
  // busca contra cuentas reales (mismo buscador del marcador libre,
  // US-2.8) o queda como texto libre si no se elige ninguna. Guardado
  // como jsonb en el propio partido. Solo informativo, no procesa ningún
  // pago real -- si el gasto quedó vinculado a una cuenta real, se le
  // notifica su saldo (a pedido del usuario, 2026-09-06).
  function agregarFilaGasto() {
    setGastos((g) => [...g, { nombre: "", monto: "", jugadorId: null }]);
  }

  function actualizarFilaGasto(i, campo, valor) {
    setGastos((g) => g.map((fila, idx) => (idx === i ? { ...fila, [campo]: valor } : fila)));
  }

  function quitarFilaGasto(i) {
    setGastos((g) => g.filter((_, idx) => idx !== i));
  }

  async function handleGuardarGastos(e) {
    e.preventDefault();
    setGuardandoGastos(true);

    const limpios = gastos
      .filter((g) => g.nombre.trim() !== "")
      .map((g) => ({ nombre: g.nombre.trim(), monto: Number(g.monto) || 0, jugador_id: g.jugadorId }));

    const { error: gastosError } = await supabase.rpc("guardar_gastos_y_notificar", {
      p_partido_id: partidoId,
      p_gastos: limpios,
    });

    setGuardandoGastos(false);

    if (gastosError) {
      setError(t("disponibilidad.noSePudoGuardar", { mensaje: gastosError.message }));
      return;
    }
    setEditandoGastos(false);
    cargarDetalle();
  }

  // Algoritmo simple de "quién le debe a quién": reparte el total en
  // partes iguales entre todos los que cargaron un gasto, calcula el
  // saldo de cada uno (lo que puso menos su parte), y empareja al mayor
  // acreedor con el mayor deudor hasta saldar todo.
  function calcularSaldos(listaGastos) {
    const total = listaGastos.reduce((acc, g) => acc + g.monto, 0);
    const parte = total / listaGastos.length;
    const saldos = listaGastos.map((g) => ({ nombre: g.nombre, saldo: g.monto - parte }));

    const acreedores = saldos.filter((s) => s.saldo > 0.01).map((s) => ({ ...s })).sort((a, b) => b.saldo - a.saldo);
    const deudores = saldos.filter((s) => s.saldo < -0.01).map((s) => ({ ...s, saldo: -s.saldo })).sort((a, b) => b.saldo - a.saldo);

    const pagos = [];
    let i = 0;
    let j = 0;
    while (i < deudores.length && j < acreedores.length) {
      const monto = Math.min(deudores[i].saldo, acreedores[j].saldo);
      pagos.push({ de: deudores[i].nombre, a: acreedores[j].nombre, monto });
      deudores[i].saldo -= monto;
      acreedores[j].saldo -= monto;
      if (deudores[i].saldo < 0.01) i++;
      if (acreedores[j].saldo < 0.01) j++;
    }

    return { total, parte, pagos };
  }

  async function handleMarcarNoShow(jugadorId, valorActual) {
    await supabase.rpc("marcar_no_show", {
      p_partido_id: partidoId,
      p_jugador_id: jugadorId,
      p_no_show: !valorActual,
    });
    cargarDetalle();
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t("detallePartido.titulo")}</h1>
        <button onClick={() => router.push("/partidos")} className={botonSuave}>
          {t("detallePartido.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className={`${tarjeta} flex flex-col gap-2`}>
        <span className="font-heading font-semibold">
          {new Date(partido.fecha_hora).toLocaleString(INTL_LOCALE[locale] ?? "es-AR")}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted text-sm">{partido.cancha}</span>
          {canchaId && (
            <button
              onClick={() => router.push(`/canchas/${canchaId}`)}
              className="font-heading font-semibold text-xs px-2 py-0.5 rounded-full bg-bg text-ink cursor-pointer"
            >
              {t("detallePartido.verCancha")}
            </button>
          )}
        </div>
        <span className="text-sm">
          {t("crearPartido.estado")} <strong>{etiquetaEstadoPartido(partido.estado, t)}</strong>
        </span>
        <span className="text-sm">
          {t("partidoPublico.jugadoresTemplate", { ocupados: participantes.length, cantidad: partido.cantidad_jugadores })}
        </span>

        {(partido.estado === "jugado" || partido.estado === "completo") && (
          <button
            onClick={() => router.push(`/partido/${partidoId}/marcador`)}
            className="font-heading font-bold text-lg px-6 py-5 rounded-[20px] bg-accent text-accent-ink border-2 border-outline shadow-[0_2px_6px_rgba(20,38,31,0.12)] cursor-pointer self-center w-full flex flex-col items-center gap-1"
          >
            <IconoPelota width={26} height={26} />
            {partido.estado === "jugado" ? t("detallePartido.verMarcadorcito") : t("detallePartido.irAlMarcadorcito")}
          </button>
        )}

        {estoyEnEspera && (
          <div className={tarjetaChica}>
            <span className="text-sm">{t("detallePartido.enListaEspera")}</span>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmarLugarEspera}
                disabled={!hayLugar}
                className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline cursor-pointer disabled:opacity-60"
              >
                {hayLugar ? t("partidosAbiertos.confirmarMiLugar") : t("detallePartido.esperandoLugar")}
              </button>
              <button onClick={handleSalirDeLaLista} className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-red-600 cursor-pointer">
                {t("partidosAbiertos.salirDeLista")}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCompartir}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer flex items-center gap-2"
          >
            <IconoCompartir width={16} height={16} /> {t("detallePartido.compartir")}
          </button>
          {puedeRepetir && (
            <button
              onClick={handleRepetir}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer flex items-center gap-2"
            >
              <IconoRepetir width={16} height={16} /> {t("detallePartido.repetirPartido")}
            </button>
          )}
        </div>
        {mensajeCompartir && <span className="text-xs text-muted">{mensajeCompartir}</span>}

        <div className={tarjetaChica}>
          <span className="font-heading text-sm font-semibold flex items-center gap-1.5">
            <IconoBilletera width={16} height={16} /> {t("detallePartido.gastosDeLaCancha")}
          </span>

          {soyOrganizador && editandoGastos ? (
            <form onSubmit={handleGuardarGastos} className="flex flex-col gap-2">
              {gastos.map((g, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <CampoJugadorGasto
                    valor={g}
                    onChange={(nuevo) =>
                      setGastos((prev) => prev.map((fila, idx) => (idx === i ? nuevo : fila)))
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={g.monto}
                    onChange={(e) => actualizarFilaGasto(i, "monto", e.target.value)}
                    placeholder={t("detallePartido.gastoPlaceholder")}
                    className="w-24 rounded-xl bg-surface px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => quitarFilaGasto(i)}
                    className="text-red-600 text-sm px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={agregarFilaGasto}
                className="font-heading font-semibold text-xs px-3 py-1 rounded-full bg-surface text-ink self-start cursor-pointer"
              >
                + {t("detallePartido.agregarJugador")}
              </button>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={guardandoGastos}
                  className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-accent text-accent-ink border-2 border-outline cursor-pointer disabled:opacity-60"
                >
                  {t("admin.guardar")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoGastos(false)}
                  className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink cursor-pointer"
                >
                  {t("admin.cancelar")}
                </button>
              </div>
            </form>
          ) : partido.gastos?.length > 0 ? (
            (() => {
              const { total, parte, pagos } = calcularSaldos(partido.gastos);
              const intl = INTL_LOCALE[locale] ?? "es-AR";
              return (
                <>
                  <span className="text-sm">
                    {t("detallePartido.totalTemplate", {
                      total: total.toLocaleString(intl),
                      n: partido.gastos.length,
                      parte: parte.toLocaleString(intl, { maximumFractionDigits: 0 }),
                    })}
                  </span>
                  {pagos.length === 0 ? (
                    <span className="text-sm text-muted">{t("detallePartido.saldado")}</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {pagos.map((p, i) => (
                        <span key={i} className="text-sm">
                          <strong>{p.de}</strong>{" "}
                          {t("detallePartido.leDebeConector", {
                            monto: p.monto.toLocaleString(intl, { maximumFractionDigits: 0 }),
                          })}{" "}
                          <strong>{p.a}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                  {soyOrganizador && (
                    <button
                      onClick={() => setEditandoGastos(true)}
                      className="font-heading font-semibold text-xs px-3 py-1 rounded-full bg-surface text-ink self-start cursor-pointer"
                    >
                      {t("verPerfil.editar")}
                    </button>
                  )}
                </>
              );
            })()
          ) : soyOrganizador ? (
            <button
              onClick={() => setEditandoGastos(true)}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-ink cursor-pointer self-start"
            >
              {t("detallePartido.cargarGastos")}
            </button>
          ) : (
            <span className="text-sm text-muted">{t("detallePartido.sinGastos")}</span>
          )}
          <span className="text-[10px] text-muted">{t("detallePartido.soloInformativo")}</span>
        </div>

        {puedeCancelar && !confirmandoCancelacion && (
          <button
            onClick={() => setConfirmandoCancelacion(true)}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer text-red-600 self-start"
          >
            {t("detallePartido.cancelarPartido")}
          </button>
        )}

        {confirmandoCancelacion && (
          <div className={tarjetaChica}>
            <p className="text-sm">{t("detallePartido.confirmarCancelar")}</p>
            <div className="flex gap-2">
              <button
                onClick={handleCancelar}
                disabled={cancelando}
                className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-red-600 text-white cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
              >
                {cancelando && <PelotaLoader />}
                {t("detallePartido.siCancelar")}
              </button>
              <button
                onClick={() => setConfirmandoCancelacion(false)}
                disabled={cancelando}
                className={botonSuave}
              >
                {t("detallePartido.no")}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-heading font-semibold text-lg">{t("detallePartido.plantel")}</h2>
        {participantes.map((p, i) => (
          <div key={p.jugador_id ?? `invitado-${i}`} className={`${tarjeta} flex flex-col gap-1`}>
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold">{p.nombre}</span>
              <span className="text-xs text-muted uppercase">
                {p.estado}
                {p.no_show && t("detallePartido.noShowSufijo")}
              </span>
            </div>
            {soyOrganizador && partido.estado === "jugado" && p.estado === "confirmado" && p.jugador_id !== usuarioId && (
              <button
                onClick={() => handleMarcarNoShow(p.jugador_id, p.no_show)}
                className="font-heading font-semibold text-xs px-3 py-1 rounded-full bg-bg text-ink self-start cursor-pointer"
              >
                {p.no_show ? t("detallePartido.desmarcarNoShow") : t("detallePartido.marcarNoShow")}
              </button>
            )}
            <span className="text-sm text-muted">
              {t("directorio.nivelPrefijo")} {etiquetaNivel(p.nivel, t)} · {manoHabilLabel(p.mano_habil, t)} · {posicionLabel(p.posicion, t)}
            </span>
            {p.telefono && (
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <IconoTelefono width={14} height={14} /> {p.telefono}
                </span>
                {p.mostrar_whatsapp && (
                  <a
                    href={`https://wa.me/${p.telefono.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-heading font-semibold text-xs px-3 py-1 rounded-full bg-accent text-accent-ink"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            )}
            {!p.telefono && p.estado !== "confirmado" && (
              <span className="text-xs text-muted italic">{t("detallePartido.telVisibleAlConfirmar")}</span>
            )}
            {!p.telefono && p.estado === "confirmado" && (
              <span className="text-xs text-muted italic">{t("detallePartido.telNoCompartido")}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
