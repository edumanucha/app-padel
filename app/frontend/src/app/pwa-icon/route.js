import { ImageResponse } from "next/og";

// Ícono de la app para instalar como PWA (2026-09-13, a pedido del
// usuario: "modo instalar"). Se genera con next/og (Satori, ya incluido
// en Next.js -- no hace falta ningún programa externo de imágenes) en
// vez de subir un PNG a mano: dibuja una pelota de tenis sólida, con
// margen generoso alrededor para que sobreviva el recorte circular que
// hace Android con los íconos "maskable". ?size=192 o ?size=512 (los dos
// tamaños mínimos que pide un manifest de PWA); cualquier otro valor cae
// a 512.
// Paleta clara (2026-09-19, a pedido del usuario: "pelota sólida pero con
// colores más claritos que no distraiga" -- la primera versión, pelota
// amarilla intensa sobre verde bien oscuro, se leía demasiado fuerte para
// un ícono de pestaña tan chico).
// Movido de `app/icon/route.js` a `app/pwa-icon/route.js` (2026-09-19):
// esa ruta NUNCA fue el favicon de la pestaña del navegador -- Next.js
// solo reconoce el ícono automático con el archivo especial `icon.js`
// puesto directo en `app/` (ver ese archivo), no una carpeta con
// `route.js` -- este archivo solo lo usa manifest.js para los tamaños de
// PWA (192/512), que si necesitan el querystring `?size=`.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const size = searchParams.get("size") === "192" ? 192 : 512;

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
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="#f5dd90" />
          <path d="M20 12c13 13 13 63 0 76M80 12c-13 13-13 63 0 76" fill="none" stroke="#6b9080" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
