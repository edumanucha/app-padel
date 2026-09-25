"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLocale } from "@/i18n/LocaleContext";

const inputClass = "rounded-xl border-2 border-outline bg-bg px-3 py-2 text-ink";

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

  async function handleChange(texto) {
    onChange(texto);
    onElegir?.(null);
    if (texto.trim().length < 2) {
      setResultados([]);
      return;
    }
    const { data } = await supabase
      .from("canchas")
      .select("id, nombre, zona")
      .ilike("nombre", `%${texto.trim()}%`)
      .order("nombre", { ascending: true })
      .limit(6);
    setResultados(data ?? []);
  }

  function elegir(cancha) {
    onChange(cancha.nombre);
    onElegir?.(cancha);
    setResultados([]);
  }

  return (
    <label className="flex flex-col gap-1 relative">
      <span className="font-heading text-sm">{t("campoCancha.cancha")}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t("campoCancha.buscarCancha")}
        className={inputClass}
      />
      {resultados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border-2 border-outline rounded-[12px] z-10 overflow-hidden">
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
