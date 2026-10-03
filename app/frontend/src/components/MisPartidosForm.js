"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { leerPantalla, guardarPantalla } from "@/lib/cachePantalla";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/config";

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
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Copia de la última vez (2026-09-30): se ve al toque mientras se
      // piden los datos nuevos.
      const copia = leerPantalla("mis_partidos", user.id);
      if (copia) {
        setPartidos(copia);
        setCargando(false);
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
      guardarPantalla("mis_partidos", user.id, combinados);
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
    <div className="w-full max-w-md flex flex-col gap-4 pantalla-grilla">
      <div className="flex items-center justify-between col-completa">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("misPartidos.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("misPartidos.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm col-completa">{error}</p>}

      {partidos.length === 0 && (
        <p className="text-sm text-muted border-y border-ink/10 py-6 col-completa">
          {t("misPartidos.sinPartidos")}
        </p>
      )}

      {/* Rediseño Cartel (2026-10-01): filas separadas por línea en vez de
          tarjetas; la fecha va a la izquierda como en un cartel, el estado
          como etiqueta chica y el resultado de los jugados en números
          grandes, con ganado/perdido marcado por color. Las filas siguen
          siendo hijas directas de .pantalla-grilla (2 columnas en la compu). */}
      {partidos.map((p) => {
        const fecha = new Date(p.fecha_hora);
        const intl = INTL_LOCALE[locale] ?? "es-AR";
        return (
          <button
            key={p.id}
            onClick={() => router.push(`/partido/${p.id}`)}
            className="text-left text-ink border-b border-ink/10 pb-4 flex items-start gap-4 cursor-pointer"
          >
            <span className="flex flex-col items-center min-w-[52px] font-titulo uppercase leading-none">
              <span className="text-[2.4rem] font-black leading-[0.9]">
                {fecha.toLocaleDateString(intl, { day: "2-digit" })}
              </span>
              <span className="text-sm font-extrabold tracking-wide">
                {fecha.toLocaleDateString(intl, { month: "short" }).replace(".", "")}
              </span>
              <span className="text-[11px] font-bold text-muted mt-1 font-sans">
                {fecha.toLocaleTimeString(intl, { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            </span>

            <span className="flex flex-col gap-1.5 min-w-0 flex-1">
              <span className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted border border-ink/15 rounded-[4px] px-1.5 py-0.5">
                  {etiquetaEstado(p.estado, t)}
                </span>
                {p.miEstado === "en_espera" && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] bg-accent text-accent-ink rounded-[4px] px-1.5 py-0.5">
                    {t("misPartidos.listaEspera")}
                  </span>
                )}
              </span>
              <span className="font-titulo font-extrabold uppercase text-2xl leading-none truncate">{p.cancha}</span>
              {p.resultado && (
                <span className="flex flex-col gap-1 mt-0.5">
                  <span className="flex items-baseline gap-3 flex-wrap">
                    <span
                      className={`text-[10.5px] font-bold uppercase tracking-[0.12em] rounded-[4px] px-1.5 py-0.5 self-center ${
                        p.resultado.gano ? "bg-accent-2 text-accent-2-ink" : "bg-accent-3 text-accent-3-ink"
                      }`}
                    >
                      {p.resultado.gano ? t("home.ganaste") : t("home.perdiste")}
                    </span>
                    <span className="font-numero font-bold text-[2.2rem] leading-none">
                      {formatearResultado(p.resultado.sets_a, p.resultado.sets_b)}
                    </span>
                  </span>
                  <span className="text-xs text-muted truncate">
                    {t("home.vs")} {p.resultado.rival_nombres}
                  </span>
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
