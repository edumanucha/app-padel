// Logo de Padelito (2026-10-06, elegido por el usuario tras varias rondas de maquetas):
// un reloj cuya esfera es la pelota de pádel, con el tanteador "40-15" en la
// tipografía de tablero (Chakra Petch 700, convertida a trazo vectorial para que se vea
// igual en la app, en los íconos que genera el servidor y en las imágenes).
// Dibujo en una caja de 100x150 (reloj vertical). Lo usan Logo.js, icon.js,
// apple-icon.js, pwa-icon y opengraph-image.js.

export const CUARENTA_QUINCE = "M34.80 0L34.80-13L1-13L1-26.70L32.10-70L48.40-70L48.40-24.60L56.90-24.60L56.90-13L48.40-13L48.40 0L34.80 0ZM14.30-24.20L35.40-24.20L35.40-54.80L35-54.80L14.30-25.60L14.30-24.20ZM75 0L63.40-11.60L63.40-58.40L75-70L106-70L117.60-58.40L117.60-11.60L106 0L75 0ZM81.40-11.60L99.60-11.60L104-16L104-54L99.60-58.40L81.40-58.40L77-54L77-16L81.40-11.60ZM127.10-20L127.10-31.40L162.30-31.40L162.30-20L127.10-20ZM183.90 0L183.90-55.50L168.80-47.70L168.80-60.20L186.60-70L197.50-70L197.50 0L183.90 0ZM219.80 0L209-10.80L209-22.20L222.60-22.20L222.60-14.90L225.90-11.60L243.70-11.60L247-14.90L247-30.70L243.70-34L210-34L210-70L259.20-70L259.20-58.40L223.40-58.40L223.40-45.60L249.70-45.60L260.60-34.70L260.60-10.80L249.80 0L219.80 0Z";
export const TRANSFORMA_NUMEROS = "translate(12.71 84.98) scale(0.2851)";

// fondo: color de lo que hay detrás (separa la pelota de la malla con un aro).
export function relojPadelito({ alto = 150, fondo = "#154139", malla = "#0a1f1a", pelota = "#f2c53d", tinta = "#154139", numeros = true } = {}) {
  return (
    <svg width={(alto * 100) / 150} height={alto} viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 0h44l4 34H24z" fill={malla} />
      <path d="M24 116h52l-4 34H28z" fill={malla} />
      <circle cx="50" cy="75" r="49" fill={fondo} />
      <circle cx="50" cy="75" r="45" fill={pelota} />
      <path d="M29 41c13 13 13 55 0 68M71 41c-13 13-13 55 0 68" fill="none" stroke={tinta} strokeWidth="6" strokeLinecap="round" opacity={numeros ? 0.3 : 1} />
      {numeros ? <path d={CUARENTA_QUINCE} transform={TRANSFORMA_NUMEROS} fill={tinta} /> : null}
    </svg>
  );
}
