"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

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
      } = await supabase.auth.getUser();
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
    } = await supabase.auth.getUser();

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
          className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer self-start"
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
        className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer self-start"
      >
        {t("detalleCancha.volverAlListado")}
      </button>

      <div className="bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-5 flex flex-col gap-3">
        <span className="font-heading text-xl font-semibold">{cancha.nombre}</span>

        {cancha.direccion && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cancha.nombre}, ${cancha.direccion}, Mendoza`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent-2-ink underline"
          >
            {cancha.direccion}
            {cancha.zona ? ` — ${cancha.zona}` : ""}
          </a>
        )}

        {cantidadCanchas(cancha.descripcion) && (
          <span className="text-sm text-muted">{cantidadCanchas(cancha.descripcion)}</span>
        )}

        {cancha.telefono && (
          <div className="flex items-center gap-2 text-sm">
            <span>📞 {cancha.telefono}</span>
            <a
              href={`https://wa.me/${cancha.telefono.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-heading font-semibold text-xs px-3 py-1 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)]"
            >
              WhatsApp
            </a>
          </div>
        )}
      </div>

      <div className="bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-heading text-lg font-semibold">{t("detalleCancha.resenas")}</span>
          {resenas.length > 0 && (
            <span className="font-heading font-semibold text-sm">
              ⭐ {(resenas.reduce((acc, r) => acc + r.puntuacion, 0) / resenas.length).toFixed(1)} · {resenas.length}
            </span>
          )}
        </div>

        {resenas.length === 0 && <span className="text-sm text-muted">{t("detalleCancha.sinResenas")}</span>}

        {resenas.map((r, i) => (
          <div key={i} className="bg-bg border-2 border-outline rounded-[14px] p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold text-sm">{r.nombre}</span>
              <span className="text-sm">{"⭐".repeat(r.puntuacion)}</span>
            </div>
            {r.comentario && <span className="text-sm text-muted">{r.comentario}</span>}
          </div>
        ))}

        {!resenaEnviada ? (
          <form onSubmit={handleDejarResena} className="flex flex-col gap-2 border-t-2 border-outline pt-3 mt-1">
            <span className="font-heading text-sm font-semibold">{t("detalleCancha.dejarResena")}</span>
            <div className="flex gap-1 text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPuntuacion(n)}
                  className="cursor-pointer"
                >
                  {n <= puntuacion ? "⭐" : "☆"}
                </button>
              ))}
            </div>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder={t("detalleCancha.comentarioPlaceholder")}
              rows={2}
              className="rounded-xl bg-bg px-3 py-2 text-sm"
            />
            {errorResena && <p className="text-red-600 text-sm">{errorResena}</p>}
            <button
              type="submit"
              disabled={enviandoResena}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 self-start inline-flex items-center gap-2"
            >
              {enviandoResena && <PelotaLoader />}
              {t("detalleCancha.enviarResena")}
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted">{t("detalleCancha.gracias")}</p>
        )}
      </div>
    </div>
  );
}
