"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";
import { PROVINCIAS } from "@/lib/zonasPorProvincia";

import { IconoLlamada, IconoPin } from "@/components/Icons";
// Ver CanchasListadoForm.js: `descripcion` guarda de todo, en pantalla
// mostramos solo la cantidad de canchas.
function cantidadCanchas(descripcion) {
  return descripcion?.match(/^\d+ canchas?/)?.[0] ?? null;
}

// Google Maps: busca "nombre, localidad" con el mapa centrado en las
// coordenadas del club, así abre la ficha del lugar (con sus opiniones).
// Probado (2026-10-10) con 46 clubes al azar, 2 por provincia, de ATC y
// OpenStreetMap: con el nombre solo abrió la ficha en 30; sumando la
// localidad se arreglaron 4 de los 8 que quedaban en una lista. Con las
// coordenadas solas ponía un pin suelto y con la dirección se confundía.
// Sin coordenadas: nombre, localidad y provincia.
function enlaceMaps(cancha) {
  if (cancha.lat != null && cancha.lng != null) {
    const consulta = [cancha.nombre, cancha.zona].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/${encodeURIComponent(consulta)}/@${cancha.lat},${cancha.lng},17z`;
  }
  const provincia = PROVINCIAS.find((p) => p.valor === cancha.provincia)?.etiqueta;
  const consulta = [cancha.nombre, cancha.zona, provincia].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}

// US-4.2: detalle completo de una cancha del listado.
// Sin reseñas (2026-10-10, a pedido del usuario: "me parece al pedo si ya está
// en Maps"): en su lugar, un botón para abrir el club en Google Maps, donde
// están las opiniones. La tabla resenas_canchas queda en la base sin usar.
export default function DetalleCanchaForm({ canchaId }) {
  const router = useRouter();
  const { t } = useLocale();
  const [cancha, setCancha] = useState(null);
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
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canchaId, router]);

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
          tablero -- nombre en letra de cartel y dirección. */}
      <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          {cancha.zona && (
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">{cancha.zona}</span>
          )}
          <h1 className="font-titulo font-black uppercase text-4xl leading-[0.95]">{cancha.nombre}</h1>
        </div>

        {cancha.direccion && <span className="text-sm text-[#c4dad3]">{cancha.direccion}</span>}

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

      <a
        href={enlaceMaps(cancha)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-titulo font-black uppercase text-xl px-4 py-3 rounded-[6px] bg-accent text-accent-ink inline-flex items-center justify-center gap-2"
      >
        <IconoPin className="ico" aria-hidden />
        {t("detalleCancha.verEnMaps")}
      </a>
    </div>
  );
}
