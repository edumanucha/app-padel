"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { leerPantalla, guardarPantalla } from "@/lib/cachePantalla";
import PelotaLoader from "@/components/PelotaLoader";
import Logo from "@/components/Logo";
import { useLocale } from "@/i18n/LocaleContext";

// Bandeja de conversaciones (US-7.4).
export default function MensajesForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [conversaciones, setConversaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Copia de la última vez (2026-09-30): se ve al toque mientras se
      // piden los datos nuevos.
      const copia = leerPantalla("mensajes", user.id);
      if (copia) {
        setConversaciones(copia);
        setCargando(false);
      }

      const { data, error: rpcError } = await supabase.rpc("listar_conversaciones");
      setCargando(false);

      if (rpcError) {
        setError(t("mensajes.noSePudieronCargar", { mensaje: rpcError.message }));
        return;
      }
      setConversaciones(data ?? []);
      guardarPantalla("mensajes", user.id, data ?? []);
    }
    cargar();
  }, [router]);

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("mensajes.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("mensajes.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("mensajes.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {conversaciones.length === 0 && (
        <p className="text-sm text-muted border-y border-ink/10 py-4">
          {t("mensajes.sinConversaciones")}
        </p>
      )}

      {/* Rediseño Cartel (2026-10-01): la bandeja es una lista de filas con
          línea abajo, sin tarjetas; los no leídos van como contador amarillo. */}
      {conversaciones.length > 0 && (
        <div className="flex flex-col border-t border-ink/10">
          {conversaciones.map((c) => (
            <button
              key={c.jugador_id}
              onClick={() => router.push(`/mensajes/${c.jugador_id}`)}
              className="text-left text-ink border-b border-ink/10 py-3 flex items-center gap-3 cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-bg border border-ink/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                {c.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Logo size={22} />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="font-bold text-[15px] leading-tight truncate">{c.nombre}</span>
                <span className={`text-xs truncate ${c.no_leidos > 0 ? "text-ink" : "text-muted"}`}>{c.ultimo_mensaje}</span>
              </div>
              {c.no_leidos > 0 && (
                <span className="bg-accent text-accent-ink text-[11px] font-bold rounded-full min-w-[22px] h-[22px] px-1 flex items-center justify-center flex-shrink-0">
                  {c.no_leidos > 9 ? "9+" : c.no_leidos}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
