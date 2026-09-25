"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

// `descripcion` guarda de todo (canchas, amenities, horario) porque así se
// extrajo de la fuente real (atcsports.io) -- en pantalla SOLO mostramos
// la cantidad de canchas (2026-09-13, a pedido del usuario: "no te dije
// que pongas todos esos datos, solo... la cantidad de canchas"), el resto
// queda guardado por si se usa después.
function cantidadCanchas(descripcion) {
  return descripcion?.match(/^\d+ canchas?/)?.[0] ?? null;
}

// US-4.1: listado de canchas de la provincia del jugador (mismo criterio
// que la cancha recomendada de Home, US-5.3) -- evita mostrar de entrada
// canchas de otra punta del país sin ningún filtro.
export default function CanchasListadoForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [canchas, setCanchas] = useState([]);
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

      const { data: perfil } = await supabase.from("perfiles").select("provincia").eq("id", user.id).maybeSingle();

      const { data, error: canchasError } = await supabase
        .from("canchas")
        .select("id, nombre, zona, direccion, telefono, descripcion")
        .eq("provincia", perfil?.provincia ?? "mendoza")
        .order("nombre", { ascending: true });

      if (canchasError) {
        setError(t("canchas.noSePudoCargar", { mensaje: canchasError.message }));
      } else {
        setCanchas(data ?? []);
      }
      setCargando(false);
    }
    cargar();
  }, [router]);

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("canchas.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t("canchas.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("canchas.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {canchas.length === 0 && (
        <div className="bg-surface text-muted shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 text-sm">
          {t("canchas.sinCanchas")}
        </div>
      )}

      {canchas.map((c) => (
        <button
          key={c.id}
          onClick={() => router.push(`/canchas/${c.id}`)}
          className="text-left bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-4 flex flex-col gap-1 cursor-pointer"
        >
          <span className="font-heading font-semibold">{c.nombre}</span>
          {c.zona && <span className="text-sm text-muted">{c.zona}</span>}
          {c.direccion && <span className="text-sm text-muted">{c.direccion}</span>}
          {c.telefono && <span className="text-sm text-muted">{c.telefono}</span>}
          {cantidadCanchas(c.descripcion) && (
            <span className="text-xs text-muted">{cantidadCanchas(c.descripcion)}</span>
          )}
        </button>
      ))}
    </div>
  );
}
