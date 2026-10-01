"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

function formatearSets(setsA, setsB) {
  if (!setsA || !setsB) return "";
  return setsA.map((_, i) => `${setsA[i]}-${setsB[i]}`).join(", ");
}

// US-2.9: bandeja de apelaciones. Un jugador ve las suyas; un superusuario
// ve todas y puede corregir el resultado (recalcula el ranking solo, ver
// resolver_apelacion en 021_us2_9_apelaciones.sql). Sin plazo límite.
export default function ApelacionesForm() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [esSuperusuario, setEsSuperusuario] = useState(false);
  const [apelaciones, setApelaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [corrigiendoId, setCorrigiendoId] = useState(null);
  const [setsATexto, setSetsATexto] = useState("");
  const [setsBTexto, setSetsBTexto] = useState("");
  const [ganador, setGanador] = useState("A");
  const [resolviendo, setResolviendo] = useState(false);

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: perfil } = await supabase.from("perfiles").select("es_superusuario").eq("id", user.id).single();
      setEsSuperusuario(!!perfil?.es_superusuario);

      await recargar();
      setCargando(false);
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function recargar() {
    const { data, error: rpcError } = await supabase.rpc("listar_apelaciones");
    if (rpcError) {
      setError(t("apelaciones.noSePudieronCargar", { mensaje: rpcError.message }));
      return;
    }
    setApelaciones(data ?? []);
  }

  function comenzarCorreccion(ap) {
    setCorrigiendoId(ap.id);
    setSetsATexto((ap.sets_a ?? []).join(","));
    setSetsBTexto((ap.sets_b ?? []).join(","));
    setGanador(ap.ganador_actual ?? "A");
  }

  async function handleResolver(apelacionId) {
    const setsA = setsATexto.split(",").map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n));
    const setsB = setsBTexto.split(",").map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n));

    if (setsA.length === 0 || setsA.length !== setsB.length) {
      setError(t("apelaciones.gamesValidacion"));
      return;
    }

    setResolviendo(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("resolver_apelacion", {
      p_apelacion_id: apelacionId,
      p_sets_a: setsA,
      p_sets_b: setsB,
      p_ganador: ganador,
    });

    setResolviendo(false);

    if (rpcError) {
      setError(t("apelaciones.noSePudoResolver", { mensaje: rpcError.message }));
      return;
    }

    setCorrigiendoId(null);
    recargar();
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("apelaciones.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">
          {esSuperusuario ? t("apelaciones.tituloSuperusuario") : t("apelaciones.tituloJugador")}
        </h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("apelaciones.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {apelaciones.length === 0 && (
        <p className="text-sm text-muted border-y border-ink/10 py-4">
          {esSuperusuario ? t("apelaciones.sinApelacionesPendientes") : t("apelaciones.sinApelacionesTuyas")}
        </p>
      )}

      {/* Rediseño Cartel (2026-10-01): cada apelación es una fila con línea
          abajo (sin tarjeta); fecha y cancha como etiqueta, el partido en
          letra de cartel y el estado como etiqueta a la derecha. */}
      <div className="flex flex-col border-t border-ink/10 -mt-1">
      {apelaciones.map((ap) => (
        <div
          key={ap.id}
          className="text-ink border-b border-ink/10 py-3 flex flex-col gap-1.5"
        >
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
            {new Date(ap.fecha_hora).toLocaleString(INTL_LOCALE[locale] ?? "es-AR")} · {ap.cancha}
          </span>
          <div className="flex items-start justify-between gap-3">
            <span className="font-titulo font-extrabold uppercase text-xl leading-none">
              {ap.pareja_a} vs. {ap.pareja_b}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-[6px] flex-shrink-0 ${ ap.estado === "pendiente" ? "bg-accent text-accent-ink" : "border border-ink/15 text-muted" }`}
            >
              {ap.estado}
            </span>
          </div>
          <span className="text-sm">
            {t("apelaciones.resultadoActual", {
              sets: formatearSets(ap.sets_a, ap.sets_b),
              pareja: ap.ganador_actual === "A" ? ap.pareja_a : ap.pareja_b,
            })}
          </span>
          <span className="text-sm">
            <strong>{ap.apelante_nombre}</strong> {t("apelaciones.apelo", { motivo: ap.motivo })}
          </span>

          {esSuperusuario && ap.estado === "pendiente" && (
            <>
              {corrigiendoId !== ap.id ? (
                <button
                  onClick={() => comenzarCorreccion(ap)}
                  className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer self-start mt-1"
                >
                  {t("apelaciones.corregirResultado")}
                </button>
              ) : (
                <div className="bg-surface border border-ink/10 rounded-[8px] p-3 flex flex-col gap-2 mt-1">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("apelaciones.gamesPorSetA", { pareja: ap.pareja_a })}</span>
                    <input
                      type="text"
                      value={setsATexto}
                      onChange={(e) => setSetsATexto(e.target.value)}
                      className="rounded-[6px] bg-bg border border-ink/15 px-2 py-1.5 text-sm text-ink"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("apelaciones.gamesPorSetB", { pareja: ap.pareja_b })}</span>
                    <input
                      type="text"
                      value={setsBTexto}
                      onChange={(e) => setSetsBTexto(e.target.value)}
                      className="rounded-[6px] bg-bg border border-ink/15 px-2 py-1.5 text-sm text-ink"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("apelaciones.ganador")}</span>
                    <select
                      value={ganador}
                      onChange={(e) => setGanador(e.target.value)}
                      className="rounded-[6px] bg-bg border border-ink/15 px-2 py-1.5 text-sm text-ink"
                    >
                      <option value="A">{ap.pareja_a}</option>
                      <option value="B">{ap.pareja_b}</option>
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolver(ap.id)}
                      disabled={resolviendo}
                      className="font-titulo font-black uppercase text-base px-4 py-2 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
                    >
                      {resolviendo && <PelotaLoader />}
                      {t("apelaciones.confirmarCorreccion")}
                    </button>
                    <button
                      onClick={() => setCorrigiendoId(null)}
                      className="text-sm font-semibold px-4 py-2 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
                    >
                      {t("apelaciones.cancelar")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
