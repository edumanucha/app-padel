import { ImageResponse } from "next/og";

// iOS/Safari ignora los íconos del manifest.js -- para el ícono que
// queda en la pantalla de inicio al "Agregar a inicio" necesita este
// archivo aparte (convención de Next.js, detectado y linkeado solo).
// Mismo dibujo que /icon (ver ese archivo para el porqué del margen y de
// la paleta clara).
// Ícono nuevo (2026-10-03, opción A elegida por el usuario sobre una maqueta):
// pelota amarilla fuerte con costuras verdes sobre el verde del cartel. Reemplaza
// la versión de colores claros, que se veía desvaída. Mismo dibujo en
// icon.js, apple-icon.js y pwa-icon/route.js.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#154139",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="34" fill="#f2c53d" />
          <path d="M32 25c11 11 11 39 0 50M68 25c-11 11-11 39 0 50" fill="none" stroke="#154139" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
