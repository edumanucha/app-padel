// Barra de progreso para una estadística de Marcadorcito (2026-09-13, a
// pedido del usuario: mostrar las estadísticas "con barras de progreso").
// `valor`/`total` arman el porcentaje; `texto` pisa la etiqueta numérica de
// la derecha cuando el "X/Y" crudo no alcanza (ej. "6 de 10 partidos").
// `variante` colorea la barra según si el número es bueno o malo para el
// jugador (2026-09-13: "que lo bueno sobre lo malo se muestre en verde
// sobre rojo") -- "bien" para lo que conviene que sea alto (quiebres/puntos
// de juego CONVERTIDOS, partidos ganados), "mal" para lo que conviene que
// sea bajo (quiebres/puntos de juego CONCEDIDOS). Sin variante, queda con
// el amarillo neutro de siempre (estadísticas puramente informativas).
// `info` agrega el botón "(i)" con la explicación de qué mide y para qué
// (2026-09-13, a pedido del usuario: "todas" las estadísticas lo tienen).
import InfoEstadistica from "@/components/InfoEstadistica";

const COLOR_POR_VARIANTE = {
  bien: { barra: "bg-[#22c55e]", texto: "text-[#16a34a]" },
  mal: { barra: "bg-[#ef4444]", texto: "text-[#dc2626]" },
};

export default function BarraEstadistica({ etiqueta, valor, total, texto, variante, info }) {
  const pct = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  const color = COLOR_POR_VARIANTE[variante];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted flex items-center gap-1">
          {etiqueta}
          <InfoEstadistica texto={info} />
        </span>
        <span className={`font-heading font-semibold whitespace-nowrap ${color ? color.texto : "text-ink"}`}>
          {texto ?? `${valor}/${total}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-bg overflow-hidden">
        <div className={`h-full rounded-full ${color ? color.barra : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
