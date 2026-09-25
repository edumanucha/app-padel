"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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
      } = await supabase.auth.getUser();
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
        <h1 className="font-heading text-2xl font-semibold">
          {esSuperusuario ? t("apelaciones.tituloSuperusuario") : t("apelaciones.tituloJugador")}
        </h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("apelaciones.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {apelaciones.length === 0 && (
        <div className="bg-surface text-muted shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 text-sm">
          {esSuperusuario ? t("apelaciones.sinApelacionesPendientes") : t("apelaciones.sinApelacionesTuyas")}
        </div>
      )}

      {apelaciones.map((ap) => (
        <div
          key={ap.id}
          className="bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-3 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-heading font-semibold text-sm">
              {ap.pareja_a} vs. {ap.pareja_b}
            </span>
            <span className="text-xs text-muted uppercase">{ap.estado}</span>
          </div>
          <span className="text-xs text-muted">
            {new Date(ap.fecha_hora).toLocaleString(INTL_LOCALE[locale] ?? "es-AR")} · {ap.cancha}
          </span>
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
                  className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer self-start"
                >
                  {t("apelaciones.corregirResultado")}
                </button>
              ) : (
                <div className="bg-bg border-2 border-outline rounded-[14px] p-3 flex flex-col gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs">{t("apelaciones.gamesPorSetA", { pareja: ap.pareja_a })}</span>
                    <input
                      type="text"
                      value={setsATexto}
                      onChange={(e) => setSetsATexto(e.target.value)}
                      className="rounded-xl bg-surface px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs">{t("apelaciones.gamesPorSetB", { pareja: ap.pareja_b })}</span>
                    <input
                      type="text"
                      value={setsBTexto}
                      onChange={(e) => setSetsBTexto(e.target.value)}
                      className="rounded-xl bg-surface px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs">{t("apelaciones.ganador")}</span>
                    <select
                      value={ganador}
                      onChange={(e) => setGanador(e.target.value)}
                      className="rounded-xl bg-surface px-2 py-1 text-sm"
                    >
                      <option value="A">{ap.pareja_a}</option>
                      <option value="B">{ap.pareja_b}</option>
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolver(ap.id)}
                      disabled={resolviendo}
                      className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
                    >
                      {resolviendo && <PelotaLoader />}
                      {t("apelaciones.confirmarCorreccion")}
                    </button>
                    <button
                      onClick={() => setCorrigiendoId(null)}
                      className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-ink border-2 border-outline cursor-pointer"
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
  );
}
