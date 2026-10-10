"use client";

import ConPelota from "@/components/ConPelota";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

const DIAS_VALORES = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const FRANJAS_VALORES = ["manana", "tarde", "noche"];

const DIA_CLAVE = {
  lunes: "diaLunes",
  martes: "diaMartes",
  miercoles: "diaMiercoles",
  jueves: "diaJueves",
  viernes: "diaViernes",
  sabado: "diaSabado",
  domingo: "diaDomingo",
};
const FRANJA_CLAVE = {
  manana: "franjaManana",
  tarde: "franjaTarde",
  noche: "franjaNoche",
};

function etiquetaDia(valor, t) {
  return DIA_CLAVE[valor] ? t(`disponibilidad.${DIA_CLAVE[valor]}`) : valor;
}
function etiquetaFranja(valor, t) {
  return FRANJA_CLAVE[valor] ? t(`disponibilidad.${FRANJA_CLAVE[valor]}`) : valor;
}

// US-8.1: declarar disponibilidad habitual (día + franja) y ver
// sugerencias de grupo cuando el sistema encuentra 3 jugadores más
// compatibles (misma zona, nivel parecido) para ese mismo horario.
export default function DisponibilidadForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [cargando, setCargando] = useState(true);
  const [dia, setDia] = useState("lunes");
  const [franja, setFranja] = useState("tarde");
  const [misSlots, setMisSlots] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [guardando, setGuardando] = useState(false);
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
      await recargar();
      setCargando(false);
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function recargar() {
    const [slotsRes, sugerenciasRes] = await Promise.all([
      supabase.rpc("listar_mi_disponibilidad"),
      supabase.rpc("listar_mis_sugerencias_grupo"),
    ]);
    setMisSlots(slotsRes.data ?? []);
    setSugerencias(sugerenciasRes.data ?? []);
  }

  async function handleAgregar(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje("");

    const { error } = await supabase.rpc("guardar_disponibilidad", { p_dia_semana: dia, p_franja: franja });

    setGuardando(false);

    if (error) {
      setMensaje(t("disponibilidad.noSePudoGuardar", { mensaje: error.message }));
      return;
    }
    setMensaje(t("disponibilidad.guardadoOk"));
    recargar();
  }

  async function handleQuitar(id) {
    await supabase.from("disponibilidad_habitual").delete().eq("id", id);
    recargar();
  }

  async function handleResponder(grupoId, acepto) {
    await supabase.rpc("responder_sugerencia_grupo", { p_grupo_id: grupoId, p_acepto: acepto });
    recargar();
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("disponibilidad.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{t("disponibilidad.titulo")}</ConPelota></h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("disponibilidad.volver")}
        </button>
      </div>

      <p className="text-sm text-muted">{t("disponibilidad.descripcion")}</p>

      {/* Rediseño Cartel (2026-10-01): las sugerencias de grupo son la
          protagonista en verde tablero; "Agregar" es el único botón
          amarillo y los horarios van como filas con línea. */}
      {sugerencias.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
            {t("disponibilidad.sugerenciasGrupo")}
          </span>
          {sugerencias.map((s) => (
            <div
              key={s.grupo_id}
              className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-4 flex flex-col gap-2"
            >
              <span className="font-titulo font-extrabold uppercase text-[1.7rem] leading-none">
                {t("disponibilidad.diaPorLaFranja", {
                  dia: etiquetaDia(s.dia_semana, t),
                  franja: etiquetaFranja(s.franja, t).toLowerCase(),
                })}
              </span>
              <span className="text-sm text-[#c4dad3]">
                {t("disponibilidad.confirmaronTemplate", { aceptados: s.aceptados, total: s.total })}
              </span>
              {s.mi_estado === "pendiente" ? (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => handleResponder(s.grupo_id, true)}
                    className="text-sm font-semibold px-4 py-2 rounded-[6px] bg-[#eaf4f0] text-[#154139] cursor-pointer"
                  >
                    {t("disponibilidad.confirmar")}
                  </button>
                  <button
                    onClick={() => handleResponder(s.grupo_id, false)}
                    className="text-sm font-semibold px-4 py-2 rounded-[6px] border border-[#8fb6ae]/50 text-[#eaf4f0] cursor-pointer"
                  >
                    {t("disponibilidad.rechazar")}
                  </button>
                </div>
              ) : (
                <span className="text-sm text-[#c4dad3]">{t("disponibilidad.yaConfirmaste")}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleAgregar}
        className="flex flex-col gap-2"
      >
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("disponibilidad.agregarDisponibilidad")}</span>
        <div className="flex gap-2">
          <select value={dia} onChange={(e) => setDia(e.target.value)} className="flex-1 rounded-[6px] bg-bg border border-ink/15 px-2 py-2 text-sm text-ink">
            {DIAS_VALORES.map((d) => (
              <option key={d} value={d}>
                {etiquetaDia(d, t)}
              </option>
            ))}
          </select>
          <select value={franja} onChange={(e) => setFranja(e.target.value)} className="flex-1 rounded-[6px] bg-bg border border-ink/15 px-2 py-2 text-sm text-ink">
            {FRANJAS_VALORES.map((f) => (
              <option key={f} value={f}>
                {etiquetaFranja(f, t)}
              </option>
            ))}
          </select>
        </div>
        {mensaje && <span className="text-xs text-muted">{mensaje}</span>}
        <button
          type="submit"
          disabled={guardando}
          className="font-titulo font-black uppercase text-[1.4rem] leading-none px-4 py-4 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {guardando && <PelotaLoader />}
          {t("disponibilidad.agregar")}
        </button>
      </form>

      {misSlots.length > 0 && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1">
            {t("disponibilidad.misHorarios")}
          </span>
          {misSlots.map((s) => (
            <div
              key={s.id}
              className="py-3 border-b border-ink/10 flex items-center justify-between"
            >
              <span className="font-titulo font-extrabold uppercase text-xl leading-none">
                {etiquetaDia(s.dia_semana, t)} · {etiquetaFranja(s.franja, t)}
              </span>
              <button onClick={() => handleQuitar(s.id)} className="w-8 h-8 flex items-center justify-center text-red-600 text-sm cursor-pointer">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
