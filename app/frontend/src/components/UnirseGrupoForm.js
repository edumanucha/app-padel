"use client";

import ConPelota from "@/components/ConPelota";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { mensajeErrorGrupo } from "@/lib/gruposErrores";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

// Pantalla del link de invitación a un grupo: /g/<código> (2026-10-03).
// Funciona sin tener la app instalada (es una página web):
//  - sin sesión: se guarda el link en sessionStorage("volverA") -- el Inicio ya
//    sabe volver ahí después de iniciar sesión o crear la cuenta (US-6.7) -- y
//    se manda a /login;
//  - con sesión pero sin perfil (cuenta nueva): primero /completar-perfil,
//    porque pertenecer a un grupo exige tener perfil;
//  - con sesión y perfil: muestra a qué grupo lo invitaron y el botón Unirme.
export default function UnirseGrupoForm({ codigo }) {
  const router = useRouter();
  const { t } = useLocale();
  const [cargando, setCargando] = useState(true);
  const [grupo, setGrupo] = useState(null); // null = no existe
  const [uniendo, setUniendo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function iniciar() {
      const {
        data: { user },
      } = await usuarioRapido();
      const volverAqui = `/g/${codigo}`;

      if (!user) {
        sessionStorage.setItem("volverA", volverAqui);
        router.replace("/login");
        return;
      }

      const { data: perfil } = await supabase.from("perfiles").select("id").eq("id", user.id).maybeSingle();
      if (!perfil) {
        sessionStorage.setItem("volverA", volverAqui);
        router.replace("/completar-perfil");
        return;
      }

      const { data } = await supabase.rpc("ver_grupo_por_codigo", { p_codigo: codigo });
      setGrupo(data?.[0] ?? null);
      setCargando(false);
    }
    iniciar();
  }, [codigo, router]);

  async function unirme() {
    setError("");
    setUniendo(true);
    const { data, error: rpcError } = await supabase.rpc("unirse_a_grupo", { p_codigo: codigo });
    setUniendo(false);
    if (rpcError) {
      setError(mensajeErrorGrupo(rpcError, t));
      return;
    }
    router.replace(`/grupos/${data}`);
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("grupos.cargando")}</p>
      </div>
    );
  }

  if (!grupo) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4 text-ink">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{t("grupos.titulo")}</ConPelota></h1>
        <p className="text-sm text-muted border-y border-ink/10 py-3">{t("grupos.codigoInvalido")}</p>
        <button onClick={() => router.replace("/grupos")} className="rounded-[6px] border border-ink/15 font-semibold py-2.5 cursor-pointer">
          {t("grupos.volver")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-5 text-ink">
      <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-5 flex flex-col gap-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">{t("grupos.teInvitaron")}</span>
        <span className="font-titulo font-black uppercase text-[2.6rem] leading-[0.9] break-words">{grupo.nombre}</span>
        <span className="text-sm text-[#c4dad3]">{t("grupos.jugadoresDelGrupo", { n: grupo.miembros })}</span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#dc2626]">
          {error}
        </p>
      )}

      {grupo.ya_soy_miembro ? (
        <>
          <p className="text-sm text-muted">{t("grupos.yaSos")}</p>
          <button
            onClick={() => router.replace(`/grupos/${grupo.id}`)}
            className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer"
          >
            {t("grupos.irAlGrupo")}
          </button>
        </>
      ) : (
        <button
          onClick={unirme}
          disabled={uniendo}
          className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer disabled:opacity-60"
        >
          {uniendo ? t("grupos.sumandote") : t("grupos.unirme")}
        </button>
      )}
    </div>
  );
}
