import { ImageResponse } from "next/og";

// Favicon real de la pestaña del navegador (2026-09-19). Nombre de
// archivo especial de Next.js (no una carpeta con `route.js`, como se
// había hecho antes por error en `app/icon/route.js` -- esa ruta nunca
// generaba el <link rel="icon">, por eso el cambio de colores no se veía
// en la pestaña por más que se probara en modo incógnito/otro
// navegador). Mismo dibujo y paleta clara que `pwa-icon/route.js` (que
// sigue existiendo aparte, para los tamaños grandes del manifest de PWA).
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#dcefe4",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="#f5dd90" />
          <path d="M20 12c13 13 13 63 0 76M80 12c-13 13-13 63 0 76" fill="none" stroke="#6b9080" strokeWidth="8" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
