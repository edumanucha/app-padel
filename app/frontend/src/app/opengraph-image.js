import { ImageResponse } from "next/og";
import { relojPadelito } from "@/lib/marcaPadelito";

// Imagen que se ve al compartir el link de Padelito en WhatsApp, Instagram,
// etc. (2026-10-05, para el MVP): verde del cartel, pelota amarilla y la frase
// de presentación.
export const alt = "Padelito: llevá el marcador del partido desde tu reloj";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#154139",
          color: "#eaf4f0",
          padding: "64px 72px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ display: "flex", fontSize: 40, letterSpacing: 2, color: "#8fb6ae" }}>padelito</div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05, marginTop: 24, color: "#f2c53d" }}>
            Llevá el marcador
          </div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05, color: "#eaf4f0" }}>
            desde tu reloj
          </div>
          <div style={{ display: "flex", fontSize: 34, marginTop: 36, color: "#8fb6ae" }}>
            Marcadorcito para pádel · gratis
          </div>
        </div>
        {relojPadelito({ alto: 380 })}
      </div>
    ),
    { ...size }
  );
}
