import { relojPadelito } from "@/lib/marcaPadelito";

// Logo de la app (2026-10-06): reloj con la pelota de esfera y el "40-15"
// (ver lib/marcaPadelito.js). Reemplaza a la pelota sola en línea fina.
// Se dibuja centrado en una caja cuadrada de `size` (el reloj es vertical).
// `fondo` es el color de lo que hay detrás: separa la pelota de la malla.
export default function Logo({ size = 40, fondo = "#154139" }) {
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", width: size, height: size, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {relojPadelito({ alto: size, fondo })}
    </span>
  );
}
