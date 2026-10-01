"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

// US-6.7: vista pública mínima de un partido, para quien llega por un
// link compartido sin tener cuenta todavía. Si ya tiene sesión, puede
// sumarse directo; si no, lo mandamos a loguearse y volvemos acá
// (ver el efecto de "volverA" en HomeForm.js) para completar el sumarme.
export default function PartidoPublicoForm({ partidoId }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [partido, setPartido] = useState(null);
  const [usuarioId, setUsuarioId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [sumando, setSumando] = useState(false);

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await usuarioRapido();
      setUsuarioId(user?.id ?? null);

      const { data, error: rpcError } = await supabase.rpc("ver_partido_publico", { p_id: partidoId });
      setCargando(false);

      if (rpcError) {
        setError(t("partidoPublico.noSePudoCargar", { mensaje: rpcError.message }));
        return;
      }
      setPartido(data?.[0] ?? null);
    }
    cargar();
  }, [partidoId]);

  function handleIrALogin() {
    sessionStorage.setItem("volverA", `/p/${partidoId}`);
    router.push("/login");
  }

  async function handleSumarme() {
    setSumando(true);
    setError("");

    const { error: insertError } = await supabase
      .from("partido_jugadores")
      .insert({ partido_id: partidoId, jugador_id: usuarioId, estado: "anotado" });

    setSumando(false);

    if (insertError) {
      setError(t("partidoPublico.noPudisteSumar", { mensaje: insertError.message }));
      return;
    }
    router.push(`/partido/${partidoId}`);
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("partidoPublico.cargando")}</p>
      </div>
    );
  }

  if (!partido) {
    return <p className="text-red-600 text-sm">{error || t("partidoPublico.noEncontrado")}</p>;
  }

  const estaCompleto = partido.lugares_ocupados >= partido.cantidad_jugadores;
  const cancelado = partido.estado === "cancelado";

  // Rediseño Cartel (2026-10-01): sin tarjeta -- título, protagonista verde
  // tablero (fecha amarilla, cancha y cupo, como el próximo partido del
  // Inicio) y abajo un solo botón amarillo (Sumarme o Iniciá sesión).
  return (
    <div className="w-full max-w-sm flex flex-col gap-4">
      <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("partidoPublico.titulo")}</h1>
      {(() => {
        const fecha = new Date(partido.fecha_hora);
        const intl = INTL_LOCALE[locale] ?? "es-AR";
        const diaSemana = fecha.toLocaleDateString(intl, { weekday: "short" }).replace(".", "");
        const dia = fecha.toLocaleDateString(intl, { day: "2-digit" });
        const mes = fecha.toLocaleDateString(intl, { month: "short" }).replace(".", "").toUpperCase();
        const hora = fecha.toLocaleTimeString(intl, { hour: "2-digit", minute: "2-digit", hour12: false });
        return (
          <div className="flex rounded-[6px] overflow-hidden bg-[#154139] text-[#eaf4f0]">
            <span className="bg-accent text-accent-ink flex flex-col items-center justify-center px-3 py-3 min-w-[72px] font-titulo font-extrabold uppercase tracking-wide leading-none">
              <span className="text-sm">{diaSemana}</span>
              <span className="font-numero text-5xl font-bold leading-[0.9]">{dia}</span>
              <span className="text-sm">{mes}</span>
            </span>
            <div className="flex flex-col justify-center gap-1 px-4 py-3 min-w-0">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">{hora}</span>
              <span className="font-titulo font-extrabold uppercase text-[1.7rem] leading-none truncate">{partido.cancha}</span>
              <span className="text-xs text-[#c4dad3]">{fecha.toLocaleString(intl)}</span>
              <span className="text-sm font-semibold mt-1">
                {t("partidoPublico.jugadoresTemplate", { ocupados: partido.lugares_ocupados, cantidad: partido.cantidad_jugadores })}
                {cancelado && ` ${t("partidoPublico.canceladoSufijo")}`}
              </span>
            </div>
          </div>
        );
      })()}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!cancelado && estaCompleto && (
        <span className="text-sm text-muted border-y border-ink/10 py-3">{t("partidoPublico.completo")}</span>
      )}

      {!cancelado && !estaCompleto && usuarioId && (
        <button
          onClick={handleSumarme}
          disabled={sumando}
          className="font-titulo font-black uppercase text-[1.75rem] leading-none px-4 py-4 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {sumando && <PelotaLoader />}
          {t("partidoPublico.sumarme")}
        </button>
      )}

      {!cancelado && !estaCompleto && !usuarioId && (
        <button
          onClick={handleIrALogin}
          className="font-titulo font-black uppercase text-[1.75rem] leading-none px-4 py-4 rounded-[6px] bg-accent text-accent-ink cursor-pointer"
        >
          {t("partidoPublico.iniciaSesion")}
        </button>
      )}
    </div>
  );
}
