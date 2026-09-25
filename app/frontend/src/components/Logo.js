// Logo de la app: pelota de tenis en línea simple (2026-09-12, a pedido
// del usuario: "en vez de la paleta dejá la pelota de tenis, me gusta
// más, es más sencillo" -- reemplaza la versión anterior, que era una
// paleta de pádel de un solo trazo). Mismo trazo fino (3.2px) y relleno
// translúcido que ya se usaba, para no perder el estilo minimalista
// (ver Icons.js / project_padelito_style_guide.md). Reconocible como
// pelota de tenis por las dos costuras curvas características.
export default function Logo({ size = 40, faceColor = "#f2c53d", frameColor = "#1a1305" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill={faceColor} fillOpacity="0.18" stroke={frameColor} strokeWidth="3.2" />
      <path
        d="M22 15c11 11 11 59 0 70"
        fill="none"
        stroke={frameColor}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M78 15c-11 11-11 59 0 70"
        fill="none"
        stroke={frameColor}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
