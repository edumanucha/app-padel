import { headers } from "next/headers";
import { notFound } from "next/navigation";

// Páginas de prueba (/pruebas-*): maquetas y herramientas de QA. Solo se ven
// en local (npm run dev); en producción dan "página no encontrada"
// (2026-10-10, a pedido del usuario, antes de publicar en Instagram: "que no
// se vea lo que vamos probando en la de producción"). El grupo (pruebas) no
// cambia las direcciones.
// Excepción (2026-11-11): con el link escondido (?clave=..., ver src/proxy.js)
// se ven también en producción, para probarlas desde el celu.
export default async function PruebasLayout({ children }) {
  if (process.env.NODE_ENV === "production" && (await headers()).get("x-pruebas") !== "1") notFound();
  return children;
}
