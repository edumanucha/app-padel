"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
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
      } = await usuarioRapido();
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
    // Rediseño Cartel (2026-10-01): las canchas van como filas con línea
    // abajo (sin tarjetas), el nombre en letra de cartel y la zona como
    // etiqueta chica arriba. En la compu siguen en dos columnas.
    <div className="w-full max-w-md flex flex-col pantalla-grilla">
      <div className="flex items-center justify-between col-completa mb-4">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("canchas.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("canchas.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm col-completa mb-3">{error}</p>}

      {canchas.length === 0 && (
        <p className="text-sm text-muted border-y border-ink/10 py-4 col-completa">
          {t("canchas.sinCanchas")}
        </p>
      )}

      {canchas.map((c) => (
        <button
          key={c.id}
          onClick={() => router.push(`/canchas/${c.id}`)}
          className="text-left text-ink border-b border-ink/10 py-3 flex items-center justify-between gap-3 cursor-pointer"
        >
          <span className="flex flex-col gap-0.5 min-w-0">
            {c.zona && (
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{c.zona}</span>
            )}
            <span className="font-titulo font-extrabold uppercase text-2xl leading-none">{c.nombre}</span>
            {c.direccion && <span className="text-sm text-muted">{c.direccion}</span>}
            {c.telefono && <span className="text-sm text-muted">{c.telefono}</span>}
          </span>
          {cantidadCanchas(c.descripcion) && (
            <span className="text-xs font-semibold text-muted whitespace-nowrap flex-shrink-0">{cantidadCanchas(c.descripcion)}</span>
          )}
        </button>
      ))}
    </div>
  );
}
