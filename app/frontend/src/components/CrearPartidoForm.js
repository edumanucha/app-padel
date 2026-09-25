"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import CampoCancha from "@/components/CampoCancha";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

const inputClass =
  "rounded-xl bg-bg px-3 py-2 text-ink";

const NIVELES_VALORES = [1, 2, 3, 4, 5, 6, 7];

function etiquetaNivel(n, t) {
  if (n === 1) return t("directorio.opcionNivelMaxima");
  if (n === 7) return t("directorio.opcionNivelMinima");
  return t("directorio.opcionNivelGenerica", { n });
}

// Formulario de "crear partido" (US-2.1): fecha/hora, cancha (texto libre --
// la Épica 4 todavía no existe, así que por ahora este es el único modo de
// cargarla, no un fallback) y cantidad de jugadores necesarios (campo
// variable, no fijo en 4 -- decisión en app/backend/sql/002_partidos.sql).
// Al crearse, el organizador queda anotado y confirmado automáticamente
// (lo hace un trigger en la base, no este componente).
export default function CrearPartidoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useLocale();
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  const [fechaHora, setFechaHora] = useState("");
  const [cancha, setCancha] = useState("");
  const [canchaId, setCanchaId] = useState(null);
  const [cantidadJugadores, setCantidadJugadores] = useState("");
  const [puntoDeOro, setPuntoDeOro] = useState(false);
  const [nivelMin, setNivelMin] = useState("");
  const [nivelMax, setNivelMax] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [partidoCreado, setPartidoCreado] = useState(null);

  // Mismo guard de sesión que completar/ver perfil (BUG-001 de la Épica 1):
  // sin sesión activa, redirige al login en vez de mostrar el formulario.
  useEffect(() => {
    async function verificarSesion() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setVerificandoSesion(false);
    }

    verificarSesion();
  }, [router]);

  // US-6.6: precarga desde "Repetir este partido" (detalle de un partido
  // pasado) -- viene todo por query params, solo se pide la fecha nueva.
  useEffect(() => {
    if (searchParams.get("repetir") !== "1") return;
    setCancha(searchParams.get("cancha") ?? "");
    setCantidadJugadores(searchParams.get("cantidadJugadores") ?? "");
    setPuntoDeOro(searchParams.get("puntoDeOro") === "true");
    setNivelMin(searchParams.get("nivelMin") ?? "");
    setNivelMax(searchParams.get("nivelMax") ?? "");
  }, [searchParams]);

  // Botón "Generar partido rápido" (2026-09-13, a pedido del usuario para
  // agilizar QA manual: "no puedo estar poniendo datos todo el tiempo") --
  // completa SOLO los campos que estén vacíos (nunca pisa algo que la
  // persona ya cargó a mano) con el primer valor disponible de cada lista,
  // sin enviar el formulario -- la persona revisa y confirma con "Crear
  // partido" como siempre.
  async function generarPartidoRapido() {
    if (fechaHora.trim() === "") {
      const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
      manana.setMinutes(0, 0, 0);
      const pad = (n) => String(n).padStart(2, "0");
      setFechaHora(
        `${manana.getFullYear()}-${pad(manana.getMonth() + 1)}-${pad(manana.getDate())}T${pad(manana.getHours())}:00`
      );
    }
    if (cancha.trim() === "") {
      const { data } = await supabase
        .from("canchas")
        .select("id, nombre")
        .order("nombre", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) {
        setCancha(data.nombre);
        setCanchaId(data.id);
      }
    }
    if (cantidadJugadores === "") {
      setCantidadJugadores(4);
    }
  }

  const formularioCompleto =
    fechaHora.trim() !== "" &&
    cancha.trim() !== "" &&
    cantidadJugadores !== "" &&
    Number(cantidadJugadores) >= 2 &&
    Number(cantidadJugadores) <= 4;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const fechaHoraElegida = new Date(fechaHora);
    if (fechaHoraElegida.getTime() <= Date.now()) {
      setError(t("crearPartido.fechaFutura"));
      return;
    }

    if (Number(cantidadJugadores) < 2 || Number(cantidadJugadores) > 4) {
      setError(t("crearPartido.cantidadInvalida"));
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    setCargando(true);

    const { data, error: insertError } = await supabase
      .from("partidos")
      .insert({
        organizador_id: user.id,
        fecha_hora: fechaHoraElegida.toISOString(),
        cancha,
        cancha_id: canchaId,
        cantidad_jugadores: Number(cantidadJugadores),
        punto_de_oro: puntoDeOro,
        nivel_min: nivelMin === "" ? null : Number(nivelMin),
        nivel_max: nivelMax === "" ? null : Number(nivelMax),
      })
      .select()
      .single();

    setCargando(false);

    if (insertError) {
      setError(t("crearPartido.noSePudoCrear", { mensaje: insertError.message }));
      return;
    }

    setPartidoCreado(data);
  }

  if (verificandoSesion) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("crearPartido.cargando")}</p>
      </div>
    );
  }

  if (partidoCreado) {
    return (
      <div className="w-full max-w-sm bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-semibold">
            {t("crearPartido.creado")}
          </h1>
          <button
            onClick={() => router.push("/")}
            className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
          >
            {t("crearPartido.volverAlInicio")}
          </button>
        </div>
        <p className="text-muted text-sm">{t("crearPartido.quedasteAnotado")}</p>
        <div className="flex flex-col gap-1 text-sm">
          <span>
            <strong>{t("crearPartido.cuando")}</strong>{" "}
            {new Date(partidoCreado.fecha_hora).toLocaleString(INTL_LOCALE[locale] ?? "es-AR")}
          </span>
          <span>
            <strong>{t("crearPartido.cancha")}</strong> {partidoCreado.cancha}
          </span>
          <span>
            <strong>{t("crearPartido.jugadoresNecesariosConfirm")}</strong>{" "}
            {partidoCreado.cantidad_jugadores}
          </span>
          <span>
            <strong>{t("crearPartido.estado")}</strong> {partidoCreado.estado}
          </span>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t("home.crearPartido")}</h1>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("crearPartido.volver")}
        </button>
      </div>
      <p className="text-muted text-sm">{t("crearPartido.subtitulo")}</p>

      <button
        type="button"
        onClick={generarPartidoRapido}
        className="self-start font-heading font-semibold text-xs px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
      >
        ⚡ Generar partido rápido
      </button>

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("crearPartido.fechaYHora")}</span>
        <input
          type="datetime-local"
          value={fechaHora}
          onChange={(e) => setFechaHora(e.target.value)}
          required
          className={inputClass}
        />
      </label>

      <CampoCancha value={cancha} onChange={setCancha} onElegir={(c) => setCanchaId(c?.id ?? null)} />

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("crearPartido.jugadoresNecesariosLabel")}</span>
        <input
          type="number"
          min={2}
          max={4}
          value={cantidadJugadores}
          onChange={(e) => setCantidadJugadores(e.target.value)}
          required
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("crearPartido.rangoNivel")}</span>
        <span className="text-xs text-muted">{t("crearPartido.rangoNivelAviso")}</span>
        <div className="grid grid-cols-2 gap-2">
          <select value={nivelMin} onChange={(e) => setNivelMin(e.target.value)} className={inputClass}>
            <option value="">{t("crearPartido.sinMinimo")}</option>
            {NIVELES_VALORES.map((n) => (
              <option key={n} value={n}>
                {etiquetaNivel(n, t)}
              </option>
            ))}
          </select>
          <select value={nivelMax} onChange={(e) => setNivelMax(e.target.value)} className={inputClass}>
            <option value="">{t("crearPartido.sinMaximo")}</option>
            {NIVELES_VALORES.map((n) => (
              <option key={n} value={n}>
                {etiquetaNivel(n, t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={puntoDeOro}
          onChange={(e) => setPuntoDeOro(e.target.checked)}
        />
        <span className="text-sm">{t("crearPartido.puntoDeOro")}</span>
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={cargando || !formularioCompleto}
        className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {cargando && <PelotaLoader />}
        {cargando ? t("crearPartido.creando") : t("home.crearPartido")}
      </button>
    </form>
  );
}
