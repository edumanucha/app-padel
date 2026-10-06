// Nombre de la app (2026-10-06, elegido por el usuario): "padelito" en
// minúsculas con la tipografía de los títulos y la pelota como punto de la i
// (la "o" queda normal). La i se dibuja aparte con las medidas reales de Big
// Shoulders: altura de minúscula 0,6 em y palo de 0,17 em.
export default function MarcaPadelito({ className = "", style }) {
  return (
    <span
      role="img"
      aria-label="Padelito"
      className={`font-titulo font-black leading-none whitespace-nowrap ${className}`}
      style={{ fontVariationSettings: "'opsz' 72", textTransform: "none", ...style }}
    >
      <span aria-hidden="true">
        padel
        <span style={{ position: "relative", display: "inline-block", width: "0.17em", height: "0.6em", margin: "0 0.067em 0 0.065em", background: "currentColor", verticalAlign: "baseline" }}>
          <svg viewBox="0 0 100 100" style={{ position: "absolute", left: "50%", bottom: "0.67em", width: "0.27em", height: "0.27em", transform: "translateX(-50%)", overflow: "visible" }}>
            <circle cx="50" cy="50" r="46" fill="#f2c53d" />
            <path d="M29 16c13 13 13 55 0 68M71 16c-13 13-13 55 0 68" fill="none" stroke="#154139" strokeWidth="8" strokeLinecap="round" />
          </svg>
        </span>
        to
      </span>
    </span>
  );
}
