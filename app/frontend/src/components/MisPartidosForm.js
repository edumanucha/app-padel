"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

const ESTADO_CLAVE = {
  abierto: "estadoAbierto",
  completo: "estadoCompleto",
  cancelado: "estadoCancelado",
  jugado: "estadoJugado",
};

function etiquetaEstado(estado, t) {
  return ESTADO_CLAVE[estado] ? t(`misPartidos.${ESTADO_CLAVE[estado]}`) : estado;
}

function formatearResultado(setsA, setsB) {
  if (!setsA || !setsB) return "";
  return setsA.map((_, i) => `${setsA[i]}-${setsB[i]}`).join(", ");
}

// US-6.1: historial personal en CUALQUIER estado (a diferencia de
// "Partidos abiertos", que solo muestra abiertos + los propios
// gestionables -- ver BUG-007). Acá el jugado/cancelado sí pertenece.
export default function MisPartidosForm() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const [participacionesRes, historialRes] = await Promise.all([
        supabase
          .from("partido_jugadores")
          .select("partido_id, estado, partidos(*)")
          .eq("jugador_id", user.id)
          .in("estado", ["anotado", "confirmado", "en_espera"]),
        supabase.rpc("mi_historial_partidos"),
      ]);

      if (participacionesRes.error) {
        setError(t("misPartidos.noSePudoCargar", { mensaje: participacionesRes.error.message }));
        setCargando(false);
        return;
      }

      const historialPorId = {};
      (historialRes.data ?? []).forEach((h) => {
        historialPorId[h.partido_id] = h;
      });

      const combinados = (participacionesRes.data ?? [])
        .filter((p) => p.partidos)
        .map((p) => ({
          ...p.partidos,
          miEstado: p.estado,
          resultado: historialPorId[p.partido_id] ?? null,
        }))
        .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));

      setPartidos(combinados);
      setCargando(false);
    }
    cargar();
  }, [router]);

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("misPartidos.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t("misPartidos.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("misPartidos.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {partidos.length === 0 && (
        <div className="bg-surface text-muted shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 text-sm">
          {t("misPartidos.sinPartidos")}
        </div>
      )}

      {partidos.map((p) => (
        <button
          key={p.id}
          onClick={() => router.push(`/partido/${p.id}`)}
          className="text-left bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-4 flex flex-col gap-1 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="font-heading font-semibold text-sm">
              {new Date(p.fecha_hora).toLocaleString(INTL_LOCALE[locale] ?? "es-AR")}
            </span>
            <span className="text-xs text-muted uppercase">{etiquetaEstado(p.estado, t)}</span>
          </div>
          <span className="text-sm text-muted">{p.cancha}</span>
          {p.miEstado === "en_espera" && (
            <span className="text-xs text-accent">{t("misPartidos.listaEspera")}</span>
          )}
          {p.resultado && (
            <span className="text-sm">
              {p.resultado.gano ? `🏆 ${t("home.ganaste")}` : t("home.perdiste")} {t("home.vs")} {p.resultado.rival_nombres} (
              {formatearResultado(p.resultado.sets_a, p.resultado.sets_b)})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
