"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

import { IconoLlamada, IconoEstrella } from "@/components/Icons";
// Ver CanchasListadoForm.js: `descripcion` guarda de todo, en pantalla
// mostramos solo la cantidad de canchas.
function cantidadCanchas(descripcion) {
  return descripcion?.match(/^\d+ canchas?/)?.[0] ?? null;
}

// US-4.2: detalle completo de una cancha del listado.
export default function DetalleCanchaForm({ canchaId }) {
  const router = useRouter();
  const { t } = useLocale();
  const [cancha, setCancha] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [resenas, setResenas] = useState([]);
  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviandoResena, setEnviandoResena] = useState(false);
  const [errorResena, setErrorResena] = useState("");
  const [resenaEnviada, setResenaEnviada] = useState(false);

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: canchaError } = await supabase
        .from("canchas")
        .select("*")
        .eq("id", canchaId)
        .maybeSingle();

      if (canchaError) {
        setError(t("detalleCancha.noSePudoCargar", { mensaje: canchaError.message }));
      } else {
        setCancha(data);
      }
      setCargando(false);

      const { data: resenasData } = await supabase.rpc("listar_resenas_cancha", { p_cancha_id: canchaId });
      setResenas(resenasData ?? []);

      // BUG encontrado en pruebas de Épica 9 (2026-09-08): sin este chequeo,
      // un jugador que ya había reseñado esta cancha en una sesión anterior
      // veía el formulario de nuevo (resenaEnviada solo vive en memoria) y,
      // al reenviar, se topaba con el error crudo de Postgres por la
      // restricción unique(cancha_id, jugador_id) en vez de un mensaje claro.
      const { data: miResena } = await supabase
        .from("resenas_canchas")
        .select("id")
        .eq("cancha_id", canchaId)
        .eq("jugador_id", user.id)
        .maybeSingle();
      if (miResena) setResenaEnviada(true);
    }
    cargar();
  }, [canchaId, router]);

  async function handleDejarResena(e) {
    e.preventDefault();
    setEnviandoResena(true);
    setErrorResena("");

    const {
      data: { user },
    } = await usuarioRapido();

    const { error: resenaError } = await supabase
      .from("resenas_canchas")
      .insert({ cancha_id: canchaId, jugador_id: user.id, puntuacion, comentario: comentario.trim() || null });

    setEnviandoResena(false);

    if (resenaError) {
      if (resenaError.code === "42501") {
        setErrorResena(t("detalleCancha.errorSoloJugadas"));
      } else if (resenaError.code === "23505") {
        setErrorResena(t("detalleCancha.errorYaResenaste"));
        setResenaEnviada(true);
      } else {
        setErrorResena(t("detalleCancha.noSePudoEnviarResena", { mensaje: resenaError.message }));
      }
      return;
    }

    setResenaEnviada(true);
    const { data: resenasData } = await supabase.rpc("listar_resenas_cancha", { p_cancha_id: canchaId });
    setResenas(resenasData ?? []);
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("detalleCancha.cargando")}</p>
      </div>
    );
  }

  if (!cancha) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4">
        <p className="text-red-600 text-sm">{error || t("detalleCancha.noEncontrada")}</p>
        <button
          onClick={() => router.push("/canchas")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer self-start"
        >
          {t("detalleCancha.volverAlListado")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <button
        onClick={() => router.push("/canchas")}
        className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer self-start"
      >
        {t("detalleCancha.volverAlListado")}
      </button>

      {/* Rediseño Cartel (2026-10-01): la cancha es la protagonista en verde
          tablero -- nombre en letra de cartel, dirección y el puntaje
          promedio como número grande. */}
      <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            {cancha.zona && (
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">{cancha.zona}</span>
            )}
            <h1 className="font-titulo font-black uppercase text-4xl leading-[0.95]">{cancha.nombre}</h1>
          </div>
          {resenas.length > 0 && (
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="font-titulo font-black text-[2.6rem] leading-none inline-flex items-center gap-1">
                <IconoEstrella llena className="ico text-accent" aria-hidden />
                {(resenas.reduce((acc, r) => acc + r.puntuacion, 0) / resenas.length).toFixed(1)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8fb6ae]">
                {resenas.length} · {t("detalleCancha.resenas")}
              </span>
            </div>
          )}
        </div>

        {cancha.direccion && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cancha.nombre}, ${cancha.direccion}, Mendoza`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#c4dad3] underline underline-offset-2"
          >
            {cancha.direccion}
            {cancha.zona ? ` — ${cancha.zona}` : ""}
          </a>
        )}

        {cantidadCanchas(cancha.descripcion) && (
          <span className="text-sm text-[#c4dad3]">{cantidadCanchas(cancha.descripcion)}</span>
        )}

        {cancha.telefono && (
          <div className="flex items-center justify-between gap-2 text-sm border-t border-[#eaf4f0]/15 pt-3">
            <span><IconoLlamada className="ico" aria-hidden /> {cancha.telefono}</span>
            <a
              href={`https://wa.me/${cancha.telefono.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-xs px-3 py-1.5 rounded-[6px] border border-[#eaf4f0]/30 text-[#eaf4f0]"
            >
              WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* Reseñas como filas con línea, sin cajitas. */}
      <div className="flex flex-col">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-2 border-b border-ink/10">
          {t("detalleCancha.resenas")}
        </span>

        {resenas.length === 0 && <span className="text-sm text-muted py-3 border-b border-ink/10">{t("detalleCancha.sinResenas")}</span>}

        {resenas.map((r, i) => (
          <div key={i} className="py-3 border-b border-ink/10 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm">{r.nombre}</span>
              <span className="text-sm text-accent inline-flex" aria-label={`${r.puntuacion} de 5`}>{Array.from({ length: r.puntuacion }, (_, i) => <IconoEstrella key={i} llena className="ico" aria-hidden />)}</span>
            </div>
            {r.comentario && <span className="text-sm text-muted">{r.comentario}</span>}
          </div>
        ))}

        {!resenaEnviada ? (
          <form onSubmit={handleDejarResena} className="flex flex-col gap-2 pt-4">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("detalleCancha.dejarResena")}</span>
            <div className="flex gap-1 text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPuntuacion(n)}
                  className="cursor-pointer"
                >
                  <IconoEstrella llena={n <= puntuacion} className="ico text-accent" aria-hidden />
                </button>
              ))}
            </div>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder={t("detalleCancha.comentarioPlaceholder")}
              rows={2}
              className="rounded-[6px] bg-surface border border-ink/15 px-3 py-2 text-sm text-ink"
            />
            {errorResena && <p className="text-red-600 text-sm">{errorResena}</p>}
            <button
              type="submit"
              disabled={enviandoResena}
              className="font-titulo font-black uppercase text-xl px-4 py-3 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {enviandoResena && <PelotaLoader />}
              {t("detalleCancha.enviarResena")}
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted pt-3">{t("detalleCancha.gracias")}</p>
        )}
      </div>
    </div>
  );
}
