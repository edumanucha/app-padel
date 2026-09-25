// Ilustración de línea de una cancha de pádel vista de arriba (2026-09-13,
// a pedido del usuario: sumar imágenes a las tarjetas para que se sientan
// menos estáticas) -- dibujada a mano en el mismo lenguaje visual que
// Icons.js (trazo simple, sin relleno, currentColor) en vez de una foto
// bajada de internet, para no romper la identidad "Friendly Rounded" ni
// meterse en lío de licencias. Pensada como watermark decorativo de fondo,
// no como ícono funcional -- por eso vive aparte de Icons.js.
export default function IlustracionCancha(props) {
  return (
    <svg viewBox="0 0 240 140" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="10" y="10" width="220" height="120" rx="10" />
      <line x1="120" y1="10" x2="120" y2="130" />
      <line x1="10" y1="70" x2="230" y2="70" />
      <rect x="60" y="10" width="60" height="60" />
      <rect x="120" y="10" width="60" height="60" />
      <rect x="60" y="70" width="60" height="60" />
      <rect x="120" y="70" width="60" height="60" />
    </svg>
  );
}
