"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

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
      } = await supabase.auth.getUser();
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
    } = await supabase.auth.getUser();
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
        <h1 className="font-heading text-2xl font-semibold">{t("companero.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("companero.volver")}
        </button>
      </div>

      <p className="text-sm text-muted">{t("companero.descripcion")}</p>

      <button
        onClick={handleToggleBusco}
        className="font-heading font-semibold text-sm px-4 py-3 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer self-start"
      >
        {busco ? t("companero.buscandoActivo") : t("companero.activarBusqueda")}
      </button>

      {mensaje && <p className="text-sm text-muted">{mensaje}</p>}

      {misDuplas.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">{t("companero.misDuplas")}</span>
          {misDuplas.map((d) => (
            <div key={d.jugador_id} className="bg-accent-2 text-accent-2-ink border-2 border-outline rounded-[14px] p-3">
              🤝 {d.nombre}
            </div>
          ))}
        </div>
      )}

      {busco && (
        <div className="flex flex-col gap-2">
          <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">{t("companero.candidatosTitulo")}</span>
          {candidatos.length === 0 && (
            <span className="text-sm text-muted">{t("companero.sinCandidatos")}</span>
          )}
          {candidatos.map((c) => (
            <div
              key={c.id}
              className="bg-surface shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-3 flex items-center justify-between gap-2"
            >
              <div>
                <span className="font-heading font-semibold text-sm block">{c.nombre}</span>
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
                className="font-heading font-semibold text-xs px-3 py-1.5 rounded-full bg-accent text-accent-ink border-2 border-outline cursor-pointer"
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
