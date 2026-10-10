import { notFound } from "next/navigation";

// Páginas de prueba (/pruebas-*): maquetas y herramientas de QA. Solo se ven
// en local (npm run dev); en producción dan "página no encontrada"
// (2026-10-10, a pedido del usuario, antes de publicar en Instagram: "que no
// se vea lo que vamos probando en la de producción"). El grupo (pruebas) no
// cambia las direcciones.
export default function PruebasLayout({ children }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
