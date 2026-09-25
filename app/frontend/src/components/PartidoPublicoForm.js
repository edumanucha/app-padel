"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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
      } = await supabase.auth.getUser();
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

  return (
    <div className="w-full max-w-sm bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-3">
      <h1 className="font-heading text-2xl font-semibold">{t("partidoPublico.titulo")}</h1>
      <span className="font-heading font-semibold">
        {new Date(partido.fecha_hora).toLocaleString(INTL_LOCALE[locale] ?? "es-AR")}
      </span>
      <span className="text-muted text-sm">{partido.cancha}</span>
      <span className="text-sm">
        {t("partidoPublico.jugadoresTemplate", { ocupados: partido.lugares_ocupados, cantidad: partido.cantidad_jugadores })}
        {cancelado && ` ${t("partidoPublico.canceladoSufijo")}`}
      </span>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!cancelado && estaCompleto && (
        <span className="text-sm text-muted">{t("partidoPublico.completo")}</span>
      )}

      {!cancelado && !estaCompleto && usuarioId && (
        <button
          onClick={handleSumarme}
          disabled={sumando}
          className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {sumando && <PelotaLoader />}
          {t("partidoPublico.sumarme")}
        </button>
      )}

      {!cancelado && !estaCompleto && !usuarioId && (
        <button
          onClick={handleIrALogin}
          className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("partidoPublico.iniciaSesion")}
        </button>
      )}
    </div>
  );
}
