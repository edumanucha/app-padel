"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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
      } = await supabase.auth.getUser();

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
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">
          {t("invitaciones.titulo")}
        </h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("invitaciones.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {errorAccion && <p className="text-red-600 text-sm">{errorAccion}</p>}

      {invitaciones.length === 0 && (
        <div className="bg-surface text-muted shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 text-sm">
          {t("invitaciones.sinPendientes")}
        </div>
      )}

      {invitaciones.map((invitacion) => (
        <div
          key={invitacion.id}
          className="bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-4 flex flex-col gap-2"
        >
          <span className="font-heading font-semibold">
            {new Date(invitacion.partidos.fecha_hora).toLocaleString(INTL_LOCALE[locale] ?? "es-AR")}
          </span>
          <span className="text-muted text-sm">{invitacion.partidos.cancha}</span>

          <div className="flex gap-3">
            <button
              onClick={() => handleAceptar(invitacion.id)}
              disabled={accionEnCurso === invitacion.id}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {accionEnCurso === invitacion.id && <PelotaLoader />}
              {t("invitaciones.aceptar")}
            </button>
            <button
              onClick={() => handleRechazar(invitacion.id)}
              disabled={accionEnCurso === invitacion.id}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-red-600 shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60"
            >
              {t("invitaciones.rechazar")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
