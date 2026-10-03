"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { mensajeErrorGrupo } from "@/lib/gruposErrores";
import PelotaLoader from "@/components/PelotaLoader";
import HojaAbajo from "@/components/HojaAbajo";
import { IconoChevron } from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";

const MAXIMO_GRUPOS = 5;

// "Mis grupos" (2026-10-03, maqueta aprobada por el usuario): la lista de los
// círculos de amigos con mi posición en cada uno, las invitaciones pendientes
// y el botón para crear un grupo nuevo (hasta 5 por persona).
export default function GruposForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [cargando, setCargando] = useState(true);
  const [grupos, setGrupos] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const [g, i] = await Promise.all([supabase.rpc("mis_grupos"), supabase.rpc("mis_invitaciones_grupo")]);
    setGrupos(g.data ?? []);
    setInvitaciones(i.data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    async function iniciar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }
      cargar();
    }
    iniciar();
  }, [router, cargar]);

  async function crearGrupo(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    const { data, error: rpcError } = await supabase.rpc("crear_grupo", { p_nombre: nombre });
    setGuardando(false);
    if (rpcError) {
      setError(mensajeErrorGrupo(rpcError, t));
      return;
    }
    router.push(`/grupos/${data}`);
  }

  async function responder(id, aceptar) {
    setError("");
    const { error: rpcError } = await supabase.rpc("responder_invitacion_grupo", { p_invitacion: id, p_aceptar: aceptar });
    if (rpcError) setError(mensajeErrorGrupo(rpcError, t));
    cargar();
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("grupos.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-5 text-ink">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("grupos.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("grupos.volver")}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#dc2626]">
          {error}
        </p>
      )}

      {invitaciones.length > 0 && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">
            {t("grupos.invitaciones")}
          </span>
          {invitaciones.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-3 py-3 border-b border-ink/10">
              <span className="flex flex-col min-w-0">
                <span className="font-semibold">{inv.grupo_nombre}</span>
                <span className="text-xs text-muted">{t("grupos.teInvito", { quien: inv.invitado_por_nombre })}</span>
              </span>
              <span className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => responder(inv.id, false)}
                  className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer"
                >
                  {t("grupos.rechazar")}
                </button>
                <button
                  onClick={() => responder(inv.id, true)}
                  className="text-sm font-bold px-3 py-1.5 rounded-[6px] bg-accent text-accent-ink cursor-pointer"
                >
                  {t("grupos.aceptar")}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {grupos.length === 0 ? (
        <p className="text-sm text-muted border-y border-ink/10 py-4">{t("grupos.vacio")}</p>
      ) : (
        <div className="flex flex-col border-t-2 border-ink">
          {grupos.map((g) => (
            <button
              key={g.grupo_id}
              onClick={() => router.push(`/grupos/${g.grupo_id}`)}
              className="flex items-center gap-3 py-3 border-b border-ink/10 text-left cursor-pointer"
            >
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="font-semibold text-base truncate">{g.nombre}</span>
                <span className="text-xs text-muted">{t("grupos.miembrosPartidos", { m: g.miembros, p: g.partidos })}</span>
              </span>
              <span className="flex flex-col items-end flex-shrink-0">
                <span className="font-numero font-bold text-lg leading-none">{g.mi_posicion ?? "-"}°</span>
                <span className="text-xs text-muted">{g.mis_puntos} pts</span>
              </span>
              <IconoChevron width={16} height={16} style={{ transform: "rotate(-90deg)" }} className="text-muted flex-shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            setError("");
            setCreando(true);
          }}
          disabled={grupos.length >= MAXIMO_GRUPOS}
          className="w-full rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer disabled:opacity-50"
        >
          {t("grupos.crear")}
        </button>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted text-center">
          {t("grupos.contador", { n: grupos.length })}
        </span>
      </div>

      {creando && (
        <HojaAbajo titulo={t("grupos.crear")} onCerrar={() => setCreando(false)} textoCerrar={`${t("grupos.cancelar")} ✕`}>
          <form onSubmit={crearGrupo} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("grupos.nombreLabel")}
              <input
                id="nombre-grupo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={40}
                placeholder={t("grupos.nombrePlaceholder")}
                autoFocus
                className="rounded-[6px] border border-ink/20 bg-bg px-3 py-2.5 text-base font-normal"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-[#dc2626]">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={guardando || nombre.trim().length < 2}
              className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer disabled:opacity-50"
            >
              {guardando ? t("grupos.creando") : t("grupos.crearBoton")}
            </button>
          </form>
        </HojaAbajo>
      )}
    </div>
  );
}
