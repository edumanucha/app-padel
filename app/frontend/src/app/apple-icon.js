import { ImageResponse } from "next/og";

// iOS/Safari ignora los íconos del manifest.js -- para el ícono que
// queda en la pantalla de inicio al "Agregar a inicio" necesita este
// archivo aparte (convención de Next.js, detectado y linkeado solo).
// Mismo dibujo que /icon (ver ese archivo para el porqué del margen y de
// la paleta clara).
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
          background: "#dcefe4",
        }}
      >
        <svg width="112" height="112" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="#f5dd90" />
          <path d="M20 12c13 13 13 63 0 76M80 12c-13 13-13 63 0 76" fill="none" stroke="#6b9080" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
