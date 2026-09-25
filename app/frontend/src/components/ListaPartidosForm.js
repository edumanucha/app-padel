"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import InvitarJugadorForm from "@/components/InvitarJugadorForm";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

// Pantalla "Partidos abiertos" (US-2.2/US-2.3/US-2.4): lista los partidos
// en estado "abierto" -- más los partidos propios (donde participo,
// aunque ya no estén "abiertos") -- con cupos ocupados/totales, y deja
// sumarse, salir, confirmar/cancelar asistencia e invitar. El cupo
// (`lugares_ocupados`) lo calcula y guarda el propio trigger de la base
// (ver app/backend/sql/005_us2_2_listado_y_cupo.sql) -- cuenta
// anotados+confirmados, no solo confirmados (eso es lo que decide si
// "Sumarme" sigue disponible, distinto del campo `estado` del partido que
// solo cambia a "completo" cuando todos CONFIRMAN, no cuando se anotan).
//
// Por qué incluir los propios aunque no estén "abiertos" (US-2.4): un
// partido "completo" desaparecería del listado de abiertos, pero un
// jugador confirmado tiene que poder seguir viéndolo para cancelar su
// asistencia (y que el trigger lo vuelva a poner en "abierto").
export default function ListaPartidosForm() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [usuarioId, setUsuarioId] = useState(null);

  const [partidos, setPartidos] = useState([]);
  const [misParticipaciones, setMisParticipaciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [accionEnCurso, setAccionEnCurso] = useState(null);
  const [errorAccion, setErrorAccion] = useState("");

  // US-6.2: filtros del listado (cancha/zona por texto, fecha exacta,
  // nivel). Se filtran en el cliente sobre lo ya traído -- el volumen de
  // partidos abiertos es chico, no justifica ir de nuevo a la base.
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [miNivel, setMiNivel] = useState(null);

  useEffect(() => {
    async function verificarSesion() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUsuarioId(user.id);
      setVerificandoSesion(false);

      const { data: perfil } = await supabase.from("perfiles").select("nivel").eq("id", user.id).maybeSingle();
      setMiNivel(perfil?.nivel ?? null);
    }

    verificarSesion();
  }, [router]);

  useEffect(() => {
    if (!usuarioId) return;
    cargarListado();
  }, [usuarioId]);

  async function cargarListado() {
    setCargando(true);
    setError("");

    const participacionesRes = await supabase
      .from("partido_jugadores")
      .select("partido_id, estado")
      .eq("jugador_id", usuarioId);

    if (participacionesRes.error) {
      setError(t("partidosAbiertos.noSePudoCargar", { mensaje: participacionesRes.error.message }));
      setCargando(false);
      return;
    }

    const misPartidoIds = (participacionesRes.data ?? []).map((p) => p.partido_id);

    // Abiertos (para sumarme) + los propios en cualquier estado gestionable
    // (para poder cancelar mi asistencia aunque ya no estén "abiertos").
    // Excluye "jugado" a propósito -- un partido ya jugado (incluye los
    // ad-hoc históricos) no tiene nada que gestionar acá, así que no
    // pertenece a esta pantalla (bug encontrado en la pasada de QA de
    // fin de épica, 2026-09-05).
    const filtro =
      misPartidoIds.length > 0
        ? `estado.eq.abierto,id.in.(${misPartidoIds.join(",")})`
        : "estado.eq.abierto";

    const partidosRes = await supabase
      .from("partidos")
      .select("*")
      .or(filtro)
      .neq("estado", "jugado")
      .order("fecha_hora", { ascending: true });

    if (partidosRes.error) {
      setError(t("partidosAbiertos.noSePudoCargar", { mensaje: partidosRes.error.message }));
      setCargando(false);
      return;
    }

    const mapa = {};
    (participacionesRes.data ?? []).forEach((p) => {
      mapa[p.partido_id] = p.estado;
    });

    setPartidos(partidosRes.data ?? []);
    setMisParticipaciones(mapa);
    setCargando(false);
  }

  async function handleSumarme(partidoId) {
    setErrorAccion("");
    setAccionEnCurso(partidoId);

    const { error: insertError } = await supabase
      .from("partido_jugadores")
      .insert({ partido_id: partidoId, jugador_id: usuarioId, estado: "anotado" });

    setAccionEnCurso(null);

    if (insertError) {
      setErrorAccion(t("partidoPublico.noPudisteSumar", { mensaje: insertError.message }));
      return;
    }

    cargarListado();
  }

  async function handleSalir(partidoId) {
    setErrorAccion("");
    setAccionEnCurso(partidoId);

    const { error: deleteError } = await supabase
      .from("partido_jugadores")
      .delete()
      .eq("partido_id", partidoId)
      .eq("jugador_id", usuarioId);

    setAccionEnCurso(null);

    if (deleteError) {
      setErrorAccion(t("partidosAbiertos.noSePudoSalir", { mensaje: deleteError.message }));
      return;
    }

    cargarListado();
  }

  // US-2.4: anotado -> confirmado (no libera ni ocupa cupo nuevo, ya
  // contaba como ocupado desde que se anotó -- ver 005_us2_2_listado_y_cupo.sql).
  async function handleConfirmar(partidoId) {
    setErrorAccion("");
    setAccionEnCurso(partidoId);

    const { error: updateError } = await supabase
      .from("partido_jugadores")
      .update({ estado: "confirmado" })
      .eq("partido_id", partidoId)
      .eq("jugador_id", usuarioId);

    setAccionEnCurso(null);

    if (updateError) {
      setErrorAccion(t("partidosAbiertos.noSePudoConfirmar", { mensaje: updateError.message }));
      return;
    }

    cargarListado();
  }

  // US-6.4: anotarme en la lista de espera de un partido completo -- no
  // ocupa cupo (lugares_ocupados solo cuenta anotado/confirmado), y el
  // trigger de la base me avisa (notificación) cuando se libera un lugar.
  async function handleAnotarmeEnEspera(partidoId) {
    setErrorAccion("");
    setAccionEnCurso(partidoId);

    const { error: insertError } = await supabase
      .from("partido_jugadores")
      .insert({ partido_id: partidoId, jugador_id: usuarioId, estado: "en_espera" });

    setAccionEnCurso(null);

    if (insertError) {
      setErrorAccion(t("partidosAbiertos.noSePudoAnotarEspera", { mensaje: insertError.message }));
      return;
    }

    cargarListado();
  }

  // Confirmar el lugar tras el aviso de "se liberó un lugar": pasa de
  // en_espera a anotado -- vuelve a chequear cupo real (por si dos
  // personas de la lista confirman casi al mismo tiempo).
  async function handleConfirmarLugarEspera(partidoId) {
    setErrorAccion("");
    setAccionEnCurso(partidoId);

    const { error: updateError } = await supabase
      .from("partido_jugadores")
      .update({ estado: "anotado" })
      .eq("partido_id", partidoId)
      .eq("jugador_id", usuarioId);

    setAccionEnCurso(null);

    if (updateError) {
      setErrorAccion(t("partidosAbiertos.noSePudoConfirmarLugar", { mensaje: updateError.message }));
      return;
    }

    cargarListado();
  }

  const partidosFiltrados = partidos.filter((partido) => {
    if (filtroTexto.trim() && !partido.cancha?.toLowerCase().includes(filtroTexto.trim().toLowerCase())) {
      return false;
    }
    if (filtroFecha) {
      const fechaPartido = new Date(partido.fecha_hora).toISOString().slice(0, 10);
      if (fechaPartido !== filtroFecha) return false;
    }
    if (filtroNivel) {
      const nivel = Number(filtroNivel);
      if (partido.nivel_min != null && nivel < partido.nivel_min) return false;
      if (partido.nivel_max != null && nivel > partido.nivel_max) return false;
    }
    return true;
  });

  if (verificandoSesion || cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("partidosAbiertos.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">
          {t("partidosAbiertos.titulo")}
        </h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("partidosAbiertos.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {errorAccion && <p className="text-red-600 text-sm">{errorAccion}</p>}

      <div className="bg-surface shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-3 flex flex-col gap-2">
        <input
          type="text"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          placeholder={t("partidosAbiertos.canchaZonaPlaceholder")}
          className="rounded-xl bg-bg px-3 py-2 text-ink text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="rounded-xl bg-bg px-3 py-2 text-ink text-sm"
          />
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="rounded-xl bg-bg px-3 py-2 text-ink text-sm"
          >
            <option value="">{t("partidosAbiertos.cualquierNivel")}</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {t("partidosAbiertos.nivelOpcion", { n })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {partidosFiltrados.length === 0 && (
        <div className="bg-surface text-muted shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 text-sm">
          {partidos.length === 0
            ? t("partidosAbiertos.sinPartidosAbiertos")
            : t("partidosAbiertos.sinCoincidencias")}
        </div>
      )}

      {partidosFiltrados.map((partido) => {
        const miEstado = misParticipaciones[partido.id];
        const estoyAnotado = miEstado === "anotado";
        const estoyConfirmado = miEstado === "confirmado";
        const estoyEnEspera = miEstado === "en_espera";
        const participo = estoyAnotado || estoyConfirmado;
        const estaCompleto = partido.lugares_ocupados >= partido.cantidad_jugadores;
        const cancelado = partido.estado === "cancelado";
        // US-2.4 (decisión del usuario): salir del partido -- anotado o
        // confirmado -- solo se permite hasta 1 hora antes del partido.
        const faltaMenosDeUnaHora =
          new Date(partido.fecha_hora).getTime() - Date.now() < 60 * 60 * 1000;
        const puedeCancelarAsistencia = !participo || !faltaMenosDeUnaHora;
        // US-6.3: advertencia informativa (nunca bloquea) si mi nivel
        // autodeclarado queda fuera del rango que el organizador declaró.
        const fueraDeNivel =
          miNivel != null &&
          ((partido.nivel_min != null && miNivel < partido.nivel_min) ||
            (partido.nivel_max != null && miNivel > partido.nivel_max));

        return (
          <div
            key={partido.id}
            className="bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-4 flex flex-col gap-2"
          >
            <span className="font-heading font-semibold">
              {new Date(partido.fecha_hora).toLocaleString(INTL_LOCALE[locale] ?? "es-AR")}
            </span>
            <span className="text-muted text-sm">{partido.cancha}</span>
            <span className="text-sm">
              {t("partidoPublico.jugadoresTemplate", { ocupados: partido.lugares_ocupados, cantidad: partido.cantidad_jugadores })}
              {cancelado && ` ${t("partidoPublico.canceladoSufijo")}`}
            </span>
            {(partido.nivel_min || partido.nivel_max) && (
              <span className="text-xs text-muted">
                {t("partidosAbiertos.nivelSugerido", { min: partido.nivel_min ?? "1", max: partido.nivel_max ?? "7" })}
              </span>
            )}
            {fueraDeNivel && (
              <span className="text-xs text-accent">{t("partidosAbiertos.fueraDeNivel")}</span>
            )}

            <button
              onClick={() => router.push(`/partido/${partido.id}`)}
              className="font-heading font-semibold text-xs px-3 py-1 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] self-start cursor-pointer"
            >
              {t("partidosAbiertos.verDetalle")}
            </button>

            {!cancelado && (
              <div className="flex flex-wrap gap-2">
                {estoyAnotado && (
                  <button
                    onClick={() => handleConfirmar(partido.id)}
                    disabled={accionEnCurso === partido.id}
                    className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {accionEnCurso === partido.id && <PelotaLoader />}
                    {t("partidosAbiertos.confirmarAsistencia")}
                  </button>
                )}

                {participo ? (
                  <button
                    onClick={() => handleSalir(partido.id)}
                    disabled={accionEnCurso === partido.id || !puedeCancelarAsistencia}
                    title={
                      !puedeCancelarAsistencia
                        ? t("partidosAbiertos.faltaMenosDeUnaHoraTitle")
                        : undefined
                    }
                    className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-red-600 shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {accionEnCurso === partido.id && <PelotaLoader />}
                    {estoyConfirmado ? t("partidosAbiertos.cancelarAsistencia") : t("partidosAbiertos.salir")}
                  </button>
                ) : estoyEnEspera ? (
                  <>
                    <button
                      onClick={() => handleConfirmarLugarEspera(partido.id)}
                      disabled={accionEnCurso === partido.id || estaCompleto}
                      className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                      {accionEnCurso === partido.id && <PelotaLoader />}
                      {estaCompleto ? t("misPartidos.listaEspera") : t("partidosAbiertos.confirmarMiLugar")}
                    </button>
                    <button
                      onClick={() => handleSalir(partido.id)}
                      disabled={accionEnCurso === partido.id}
                      className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-red-600 shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60"
                    >
                      {t("partidosAbiertos.salirDeLista")}
                    </button>
                  </>
                ) : estaCompleto ? (
                  <button
                    onClick={() => handleAnotarmeEnEspera(partido.id)}
                    disabled={accionEnCurso === partido.id}
                    className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {accionEnCurso === partido.id && <PelotaLoader />}
                    {t("partidosAbiertos.anotarmeEnEspera")}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSumarme(partido.id)}
                    disabled={accionEnCurso === partido.id}
                    className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {accionEnCurso === partido.id && <PelotaLoader />}
                    {t("partidoPublico.sumarme")}
                  </button>
                )}
              </div>
            )}

            {!cancelado && participo && !puedeCancelarAsistencia && (
              <span className="text-muted text-xs">{t("partidosAbiertos.faltaMenosDeUnaHoraTexto")}</span>
            )}

            {/* Invitar (US-2.3): solo el organizador, y solo si todavía hay
                lugares -- coincide con el criterio "partido abierto con
                lugares disponibles" de la historia de usuario. */}
            {!cancelado && partido.organizador_id === usuarioId && !estaCompleto && (
              <InvitarJugadorForm partidoId={partido.id} onInvitado={cargarListado} />
            )}
          </div>
        );
      })}
    </div>
  );
}
