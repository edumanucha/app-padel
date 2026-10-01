"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

// Pantalla "Mis invitaciones" (US-2.3): invitaciones pendientes
// recibidas (estado "invitado"), con Aceptar (pasa a "anotado", igual
// que sumarse del listado abierto) o Rechazar (se borra la fila -- deja
// el lugar libre, mismo mecanismo que "salir" de un partido).
export default function InvitacionesForm() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [usuarioId, setUsuarioId] = useState(null);

  const [invitaciones, setInvitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [accionEnCurso, setAccionEnCurso] = useState(null);
  const [errorAccion, setErrorAccion] = useState("");

  useEffect(() => {
    async function verificarSesion() {
      const {
        data: { user },
      } = await usuarioRapido();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUsuarioId(user.id);
      setVerificandoSesion(false);
    }

    verificarSesion();
  }, [router]);

  useEffect(() => {
    if (!usuarioId) return;
    cargarInvitaciones();
  }, [usuarioId]);

  async function cargarInvitaciones() {
    setCargando(true);
    setError("");

    const { data, error: invitacionesError } = await supabase
      .from("partido_jugadores")
      .select("id, partido_id, partidos(fecha_hora, cancha)")
      .eq("jugador_id", usuarioId)
      .eq("estado", "invitado");

    if (invitacionesError) {
      setError(t("invitaciones.noSePudieronCargar", { mensaje: invitacionesError.message }));
      setCargando(false);
      return;
    }

    setInvitaciones(data ?? []);
    setCargando(false);
  }

  async function handleAceptar(filaId) {
    setErrorAccion("");
    setAccionEnCurso(filaId);

    const { error: updateError } = await supabase
      .from("partido_jugadores")
      .update({ estado: "anotado" })
      .eq("id", filaId);

    setAccionEnCurso(null);

    if (updateError) {
      // Cubre el criterio de US-2.3: si el cupo se llenó por otro lado
      // mientras la invitación esperaba, el trigger de la base rechaza
      // este UPDATE y devuelve el mensaje de "ya no tiene lugares".
      setErrorAccion(t("invitaciones.noSePudoAceptar", { mensaje: updateError.message }));
      return;
    }

    cargarInvitaciones();
  }

  async function handleRechazar(filaId) {
    setErrorAccion("");
    setAccionEnCurso(filaId);

    const { error: deleteError } = await supabase
      .from("partido_jugadores")
      .delete()
      .eq("id", filaId);

    setAccionEnCurso(null);

    if (deleteError) {
      setErrorAccion(t("invitaciones.noSePudoRechazar", { mensaje: deleteError.message }));
      return;
    }

    cargarInvitaciones();
  }

  if (verificandoSesion || cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("invitaciones.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4 pantalla-grilla">
      <div className="flex items-center justify-between col-completa">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">
          {t("invitaciones.titulo")}
        </h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("invitaciones.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm col-completa">{error}</p>}
      {errorAccion && <p className="text-red-600 text-sm col-completa">{errorAccion}</p>}

      {invitaciones.length === 0 && (
        <div className="text-muted border-y border-ink/10 py-4 text-sm col-completa">
          {t("invitaciones.sinPendientes")}
        </div>
      )}

      {/* Rediseño Cartel (2026-10-01): cada invitación es una fila con línea
          y la fecha grande a la izquierda (como el próximo partido del
          Inicio); Aceptar amarillo y Rechazar como texto liviano. */}
      {invitaciones.map((invitacion) => {
        const fecha = new Date(invitacion.partidos.fecha_hora);
        const intl = INTL_LOCALE[locale] ?? "es-AR";
        const dia = fecha.toLocaleDateString(intl, { day: "2-digit" });
        const mes = fecha.toLocaleDateString(intl, { month: "short" }).replace(".", "").toUpperCase();
        return (
          <div key={invitacion.id} className="flex gap-4 py-3 border-b border-ink/10">
            <span className="flex flex-col items-center justify-center min-w-[56px] font-titulo font-extrabold uppercase leading-none pr-4 border-r border-ink/15">
              <span className="text-[2.6rem] font-black leading-[0.9]">{dia}</span>
              <span className="text-sm tracking-wide">{mes}</span>
            </span>
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-titulo font-extrabold uppercase text-2xl leading-none truncate">{invitacion.partidos.cancha}</span>
                <span className="text-xs text-muted">{fecha.toLocaleString(intl)}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAceptar(invitacion.id)}
                  disabled={accionEnCurso === invitacion.id}
                  className="font-titulo font-black uppercase text-lg leading-none px-4 py-2.5 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {accionEnCurso === invitacion.id && <PelotaLoader />}
                  {t("invitaciones.aceptar")}
                </button>
                <button
                  onClick={() => handleRechazar(invitacion.id)}
                  disabled={accionEnCurso === invitacion.id}
                  className="font-semibold text-sm px-2 py-2 text-red-600 cursor-pointer disabled:opacity-60"
                >
                  {t("invitaciones.rechazar")}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
