"use client";

import { useEffect, useState } from "react";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { useLocale } from "@/i18n/LocaleContext";

const inputClass = "rounded-[6px] border border-ink/15 bg-surface px-3 py-2 text-ink";

// Campo "Cancha" predictivo (adelanto chico de la Épica 4, a pedido del
// usuario): a medida que se escribe, sugiere coincidencias contra la tabla
// `canchas` (sembrada con canchas reales de Mendoza) para elegir con un
// click; si no hay ninguna coincidencia, el texto tipeado se usa tal cual
// -- mismo patrón de "clickear si existe, si no dejar texto libre" que ya
// se usa para buscar jugadores.
// `onChange` sigue mandando solo el texto (compatibilidad con quien ya lo
// usaba así); `onElegir` es nuevo -- se llama con la fila completa cuando
// se elige una sugerencia real (2026-09-13, a pedido del usuario: "que la
// cancha elegida en Marcadorcito quede linkeada a la fila real"), para que
// el que arma el partido pueda guardar `cancha_id` además del texto. Si el
// usuario sigue tipeando sin elegir ninguna, queda como texto libre de
// siempre (sin id).
export default function CampoCancha({ value, onChange, onElegir }) {
  const { t } = useLocale();
  const [resultados, setResultados] = useState([]);
  // Solo canchas de tu provincia (2026-10-10, pedido del usuario: "si sos un
  // jugador de Mendoza que te muestre canchas de Mendoza"), ahora que hay
  // canchas de todo el país. Sin perfil cargado todavía, busca en todas.
  const [provincia, setProvincia] = useState(null);

  useEffect(() => {
    let vivo = true;
    usuarioRapido().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("perfiles")
        .select("provincia")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (vivo && data?.provincia) setProvincia(data.provincia);
        });
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function handleChange(texto) {
    onChange(texto);
    onElegir?.(null);
    if (texto.trim().length < 2) {
      setResultados([]);
      return;
    }
    let consulta = supabase.from("canchas").select("id, nombre, zona").ilike("nombre", `%${texto.trim()}%`);
    if (provincia) consulta = consulta.eq("provincia", provincia);
    const { data } = await consulta.order("nombre", { ascending: true }).limit(6);
    setResultados(data ?? []);
  }

  function elegir(cancha) {
    onChange(cancha.nombre);
    onElegir?.(cancha);
    setResultados([]);
  }

  return (
    <label className="flex flex-col gap-1 relative">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("campoCancha.cancha")}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t("campoCancha.buscarCancha")}
        className={inputClass}
      />
      {resultados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-ink/15 rounded-[6px] z-10 overflow-hidden divide-y divide-ink/10">
          {resultados.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => elegir(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-bg cursor-pointer flex flex-col"
            >
              <span>{c.nombre}</span>
              {c.zona && <span className="text-xs text-muted">{c.zona}</span>}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}
