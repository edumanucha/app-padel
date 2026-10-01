"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

import { IconoDuo } from "@/components/Icons";
// US-8.2: buscar una dupla estable (no solo gente para completar un
// partido puntual) -- posición complementaria a la mía, match mutuo
// (marco interés, si la otra persona también me marcó a mí, queda
// vinculado como dupla).
export default function CompaneroFijoForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [cargando, setCargando] = useState(true);
  const [busco, setBusco] = useState(false);
  const [candidatos, setCandidatos] = useState([]);
  const [misDuplas, setMisDuplas] = useState([]);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: perfil } = await supabase.from("perfiles").select("busca_companero").eq("id", user.id).single();
      setBusco(!!perfil?.busca_companero);
      await recargar(!!perfil?.busca_companero);
      setCargando(false);
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function recargar(buscoActivo) {
    const { data: duplas } = await supabase.rpc("listar_mis_duplas");
    setMisDuplas(duplas ?? []);
    if (buscoActivo) {
      const { data: candidatosData } = await supabase.rpc("buscar_candidatos_dupla");
      setCandidatos(candidatosData ?? []);
    } else {
      setCandidatos([]);
    }
  }

  async function handleToggleBusco() {
    const nuevo = !busco;
    setBusco(nuevo);
    const {
      data: { user },
    } = await usuarioRapido();
    await supabase.from("perfiles").update({ busca_companero: nuevo }).eq("id", user.id);
    recargar(nuevo);
  }

  async function handleMarcarInteres(jugadorId) {
    setMensaje("");
    const { data, error } = await supabase.rpc("marcar_interes_dupla", { p_a_jugador_id: jugadorId });
    if (error) {
      setMensaje(t("companero.noSePudoMarcarInteres", { mensaje: error.message }));
      return;
    }
    setMensaje(data ? t("companero.match") : t("companero.interesMarcado"));
    recargar(busco);
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("companero.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("companero.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("companero.volver")}
        </button>
      </div>

      <p className="text-sm text-muted">{t("companero.descripcion")}</p>

      {/* Rediseño Cartel (2026-10-01): activar la búsqueda es el único botón
          amarillo; las duplas son la protagonista en verde tablero y los
          candidatos van como filas con línea. */}
      <button
        onClick={handleToggleBusco}
        className="font-titulo font-black uppercase text-[1.4rem] leading-none px-4 py-4 rounded-[6px] bg-accent text-accent-ink cursor-pointer text-left"
      >
        {busco ? t("companero.buscandoActivo") : t("companero.activarBusqueda")}
      </button>

      {mensaje && <p className="text-sm text-muted">{mensaje}</p>}

      {misDuplas.length > 0 && (
        <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-4 flex flex-col gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">{t("companero.misDuplas")}</span>
          {misDuplas.map((d) => (
            <div key={d.jugador_id} className="font-titulo font-extrabold uppercase text-[1.7rem] leading-none flex items-center gap-2">
              <IconoDuo width={22} height={22} aria-hidden /> {d.nombre}
            </div>
          ))}
        </div>
      )}

      {busco && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1">{t("companero.candidatosTitulo")}</span>
          {candidatos.length === 0 && (
            <span className="text-sm text-muted py-2">{t("companero.sinCandidatos")}</span>
          )}
          {candidatos.map((c) => (
            <div
              key={c.id}
              className="py-3 border-b border-ink/10 flex items-center justify-between gap-2"
            >
              <div>
                <span className="font-titulo font-extrabold uppercase text-xl leading-none block">{c.nombre}</span>
                <span className="text-xs text-muted">
                  {t("companero.nivelPosicionZona", {
                    nivel: c.nivel,
                    posicion: c.posicion === "reves" ? t("companero.reves") : t("companero.drive"),
                    zona: c.zona,
                  })}
                </span>
              </div>
              <button
                onClick={() => handleMarcarInteres(c.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer flex-shrink-0"
              >
                {t("companero.marcarInteres")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
