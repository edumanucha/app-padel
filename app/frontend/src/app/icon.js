import { ImageResponse } from "next/og";
import { relojPadelito } from "@/lib/marcaPadelito";

// Favicon real de la pestaña del navegador (2026-09-19). Nombre de
// archivo especial de Next.js (no una carpeta con `route.js`, como se
// había hecho antes por error en `app/icon/route.js` -- esa ruta nunca
// generaba el <link rel="icon">, por eso el cambio de colores no se veía
// en la pestaña por más que se probara en modo incógnito/otro
// navegador). Mismo dibujo y paleta clara que `pwa-icon/route.js` (que
// sigue existiendo aparte, para los tamaños grandes del manifest de PWA).
// Logo nuevo (2026-10-06): reloj con la pelota de esfera y "40-15" (lib/marcaPadelito.js).
// Antes (2026-10-03, opción A elegida por el usuario sobre una maqueta):
// pelota amarilla fuerte con costuras verdes sobre el verde del cartel. Reemplaza
// la versión de colores claros, que se veía desvaída. Mismo dibujo en
// icon.js, apple-icon.js y pwa-icon/route.js.

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
          background: "#154139",
        }}
      >
        {relojPadelito({ alto: 31 })}
      </div>
    ),
    { ...size }
  );
}
