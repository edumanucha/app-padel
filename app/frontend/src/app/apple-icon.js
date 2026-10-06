import { ImageResponse } from "next/og";
import { relojPadelito } from "@/lib/marcaPadelito";

// iOS/Safari ignora los íconos del manifest.js -- para el ícono que
// queda en la pantalla de inicio al "Agregar a inicio" necesita este
// archivo aparte (convención de Next.js, detectado y linkeado solo).
// Mismo dibujo que /icon (ver ese archivo para el porqué del margen y de
// la paleta clara).
// Logo nuevo (2026-10-06): reloj con la pelota de esfera y "40-15" (lib/marcaPadelito.js).
// Antes (2026-10-03, opción A elegida por el usuario sobre una maqueta):
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
        {relojPadelito({ alto: 150 })}
      </div>
    ),
    { ...size }
  );
}
