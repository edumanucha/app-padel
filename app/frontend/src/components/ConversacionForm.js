"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import HojaAbajo from "@/components/HojaAbajo";
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
      } = await usuarioRapido();
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
      {/* Rediseño Cartel (2026-10-01): encabezado limpio con línea abajo;
          "Reportar" pasa a ser un botón de texto liviano. */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-ink/10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/mensajes")}
            className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer flex-shrink-0"
          >
            ←
          </button>
          <h1 className="font-titulo text-3xl font-black uppercase leading-[0.95] truncate">{otroNombre}</h1>
        </div>
        <button
          onClick={() => setMostrarReporte(true)}
          className="text-xs font-semibold px-2 py-1.5 text-red-600 underline underline-offset-2 cursor-pointer flex-shrink-0"
        >
          {t("conversacion.reportar")}
        </button>
      </div>

      {/* Reportar en hoja de abajo (2026-10-01, mismo estilo que las
          Opciones del Marcadorcito, a pedido del usuario). */}
      {mostrarReporte && (
        <HojaAbajo
          titulo={`${t("conversacion.reportar")} · ${otroNombre}`}
          onCerrar={() => setMostrarReporte(false)}
          textoCerrar="✕"
        >
          <textarea
            value={motivoReporte}
            onChange={(e) => setMotivoReporte(e.target.value)}
            placeholder={t("conversacion.motivoPlaceholder")}
            rows={3}
            className="rounded-[6px] border border-ink/15 bg-bg px-3 py-2 text-ink text-sm resize-y"
          />
          <button
            onClick={handleReportar}
            disabled={motivoReporte.trim() === ""}
            className="rounded-[6px] font-titulo font-black uppercase text-lg py-3 bg-red-600 text-white cursor-pointer disabled:opacity-50"
          >
            {t("conversacion.enviarReporte")}
          </button>
          <button
            onClick={() => setMostrarReporte(false)}
            className="rounded-[6px] font-semibold text-sm py-2.5 border border-ink/15 text-ink cursor-pointer"
          >
            {t("conversacion.cancelar")}
          </button>
        </HojaAbajo>
      )}
      {reporteEnviado && <p className="text-xs text-muted">{t("conversacion.reporteEnviado")}</p>}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Rediseño Cartel (2026-10-01): burbujas con esquinas de 8px; las mías
          en amarillo sin contorno, las del otro con línea fina. */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 py-1">
        {mensajes.length === 0 && (
          <span className="text-sm text-muted text-center m-auto">{t("conversacion.sinMensajes")}</span>
        )}
        {mensajes.map((m) => {
          const esMio = m.remitente_id === usuarioId;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-[8px] px-3 py-2 text-sm flex flex-col gap-0.5 ${ esMio ? "self-end bg-accent text-accent-ink" : "self-start bg-surface text-ink border border-ink/10" }`}
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

      <form onSubmit={handleEnviar} className="flex gap-2 pt-3 border-t border-ink/10">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={1000}
          placeholder={t("conversacion.mensajePlaceholder")}
          className="flex-1 min-w-0 rounded-[6px] bg-surface border border-ink/15 px-3 py-2 text-ink text-sm"
        />
        <button
          type="submit"
          disabled={enviando || texto.trim() === ""}
          className="font-titulo font-black uppercase text-base px-4 py-2 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60"
        >
          {enviando ? <PelotaLoader /> : t("conversacion.enviar")}
        </button>
      </form>
    </div>
  );
}
