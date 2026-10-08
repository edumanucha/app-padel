import { ImageResponse } from "next/og";

// Ícono chico de las notificaciones (2026-10-07, pedido del usuario): Android
// usa solo la forma (el contorno opaco) del "badge" y lo pinta de un color,
// así que el ícono lleno de la app se veía como un cuadradito. Este es el
// reloj del logo en silueta blanca sobre fondo transparente: correas
// macizas, la pelota como aro y sus dos costuras, legible a 24 px.
export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="64" height="96" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
          <path d="M28 0h44l4 30H24z" fill="#ffffff" />
          <path d="M24 120h52l-4 30H28z" fill="#ffffff" />
          <circle cx="50" cy="75" r="40" fill="none" stroke="#ffffff" strokeWidth="11" />
          <path d="M33 47c11 11 11 45 0 56M67 47c-11 11-11 45 0 56" fill="none" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: 96, height: 96 }
  );
}
