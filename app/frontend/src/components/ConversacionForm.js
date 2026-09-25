"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

// A pedido del usuario (2026-09-06): cada mensaje muestra día y hora en
// que se mandó, siempre los dos (no solo la hora aunque sea de hoy).
function formatearFechaHora(iso, locale) {
  const fecha = new Date(iso);
  return fecha.toLocaleString(INTL_LOCALE[locale] ?? "es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Conversación 1 a 1 (US-7.4), en tiempo real vía Supabase Realtime --
// mismo patrón que el marcador en vivo (US-2.7): sincroniza mensajes
// nuevos entre dispositivos sin recargar la pantalla.
export default function ConversacionForm({ otroId }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [usuarioId, setUsuarioId] = useState(null);
  const [otroNombre, setOtroNombre] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [motivoReporte, setMotivoReporte] = useState("");
  const [reporteEnviado, setReporteEnviado] = useState(false);
  const finRef = useRef(null);

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUsuarioId(user.id);

      // `perfiles` solo se puede leer directo para el propio perfil (RLS,
      // Épica 1) -- para el nombre de OTRO jugador hay que pasar por la
      // misma función que ya expone la vista reducida (US-1.4/US-3.5).
      const { data: perfilOtro } = await supabase.rpc("ver_perfil_jugador", { p_id: otroId });
      setOtroNombre(perfilOtro?.[0]?.nombre ?? t("conversacion.jugadorFallback"));

      const { data, error: mensajesError } = await supabase
        .from("mensajes")
        .select("*")
        .or(`and(remitente_id.eq.${user.id},destinatario_id.eq.${otroId}),and(remitente_id.eq.${otroId},destinatario_id.eq.${user.id})`)
        .order("creado_en", { ascending: true });

      if (mensajesError) {
        setError(t("conversacion.noSePudoCargar", { mensaje: mensajesError.message }));
      } else {
        setMensajes(data ?? []);
      }
      setCargando(false);

      await supabase.rpc("marcar_conversacion_leida", { p_otro_id: otroId });
    }
    cargar();
  }, [otroId, router]);

  useEffect(() => {
    if (!usuarioId) return;
    const channel = supabase
      .channel(`mensajes-${usuarioId}-${otroId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes" },
        (payload) => {
          const m = payload.new;
          const esDeEstaConversacion =
            (m.remitente_id === usuarioId && m.destinatario_id === otroId) ||
            (m.remitente_id === otroId && m.destinatario_id === usuarioId);
          if (!esDeEstaConversacion) return;
          setMensajes((prev) => [...prev, m]);
          if (m.destinatario_id === usuarioId) {
            supabase.rpc("marcar_conversacion_leida", { p_otro_id: otroId });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [usuarioId, otroId]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  async function handleEnviar(e) {
    e.preventDefault();
    if (texto.trim() === "") return;

    setEnviando(true);
    setError("");

    const { error: enviarError } = await supabase.rpc("enviar_mensaje", {
      p_destinatario_id: otroId,
      p_contenido: texto.trim(),
    });

    setEnviando(false);

    if (enviarError) {
      setError(t("conversacion.noSePudoEnviar", { mensaje: enviarError.message }));
      return;
    }
    setTexto("");
  }

  async function handleReportar() {
    if (motivoReporte.trim() === "") return;
    await supabase
      .from("reportes_mensajes")
      .insert({ reportado_por: usuarioId, reportado_id: otroId, motivo: motivoReporte.trim() });
    setReporteEnviado(true);
    setMostrarReporte(false);
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("conversacion.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-3 h-[85vh]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/mensajes")}
            className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
          >
            ←
          </button>
          <h1 className="font-heading text-xl font-semibold">{otroNombre}</h1>
        </div>
        <button
          onClick={() => setMostrarReporte((v) => !v)}
          className="font-heading font-semibold text-xs px-3 py-1.5 rounded-full bg-surface text-red-600 border-2 border-outline cursor-pointer"
        >
          {t("conversacion.reportar")}
        </button>
      </div>

      {mostrarReporte && (
        <div className="bg-bg border-2 border-outline rounded-[14px] p-3 flex flex-col gap-2">
          <textarea
            value={motivoReporte}
            onChange={(e) => setMotivoReporte(e.target.value)}
            placeholder={t("conversacion.motivoPlaceholder")}
            rows={2}
            className="rounded-xl bg-surface px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReportar}
              className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-red-600 text-white border-2 border-outline cursor-pointer"
            >
              {t("conversacion.enviarReporte")}
            </button>
            <button
              onClick={() => setMostrarReporte(false)}
              className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink border-2 border-outline cursor-pointer"
            >
              {t("conversacion.cancelar")}
            </button>
          </div>
        </div>
      )}
      {reporteEnviado && <p className="text-xs text-muted">{t("conversacion.reporteEnviado")}</p>}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 bg-bg rounded-[16px] p-3">
        {mensajes.length === 0 && (
          <span className="text-sm text-muted text-center m-auto">{t("conversacion.sinMensajes")}</span>
        )}
        {mensajes.map((m) => {
          const esMio = m.remitente_id === usuarioId;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-[14px] px-3 py-2 text-sm flex flex-col gap-0.5 ${
                esMio ? "self-end bg-accent text-accent-ink" : "self-start bg-surface text-ink border-2 border-outline"
              }`}
            >
              <span>{m.contenido}</span>
              <span className={`text-[10px] self-end ${esMio ? "text-accent-ink/70" : "text-muted"}`}>
                {formatearFechaHora(m.creado_en, locale)}
              </span>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      <form onSubmit={handleEnviar} className="flex gap-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={1000}
          placeholder={t("conversacion.mensajePlaceholder")}
          className="flex-1 rounded-xl bg-bg px-3 py-2 text-ink text-sm"
        />
        <button
          type="submit"
          disabled={enviando || texto.trim() === ""}
          className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60"
        >
          {enviando ? <PelotaLoader /> : t("conversacion.enviar")}
        </button>
      </form>
    </div>
  );
}
