"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("listar_conversaciones");
      setCargando(false);

      if (rpcError) {
        setError(t("mensajes.noSePudieronCargar", { mensaje: rpcError.message }));
        return;
      }
      setConversaciones(data ?? []);
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
        <h1 className="font-heading text-2xl font-semibold">{t("mensajes.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("mensajes.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {conversaciones.length === 0 && (
        <div className="bg-surface text-muted shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 text-sm">
          {t("mensajes.sinConversaciones")}
        </div>
      )}

      {conversaciones.map((c) => (
        <button
          key={c.jugador_id}
          onClick={() => router.push(`/mensajes/${c.jugador_id}`)}
          className="text-left bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-3 flex items-center gap-3 cursor-pointer"
        >
          <div className="w-11 h-11 rounded-full border-2 border-outline bg-bg overflow-hidden flex items-center justify-center flex-shrink-0">
            {c.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Logo size={22} />
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="font-heading font-semibold text-sm">{c.nombre}</span>
            <span className="text-xs text-muted truncate">{c.ultimo_mensaje}</span>
          </div>
          {c.no_leidos > 0 && (
            <span className="bg-red-600 text-white text-[10px] font-heading font-semibold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
              {c.no_leidos > 9 ? "9+" : c.no_leidos}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
