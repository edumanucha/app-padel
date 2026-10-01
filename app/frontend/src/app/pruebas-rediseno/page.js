import PruebaRedisenoForm from "@/components/PruebaRedisenoForm";

// Ruta: /pruebas-rediseno -- maquetas del rediseño "sin olor a IA"
// (2026-10-01, rama `rediseno`). Las fuentes de cada estilo se cargan solo
// en esta página (Google Fonts directo; next/font fallaba con Turbopack para
// varias familias en una página), para compararlas sin tocar el resto de la app.
const FUENTES =
  "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Fraunces:ital,wght@0,400;0,600;0,800;1,400;1,600&family=Chakra+Petch:wght@500;600;700&display=swap";

export default function PruebasRedisenoPage() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-4 sm:p-8">
      <link rel="stylesheet" href={FUENTES} precedence="default" />
      <PruebaRedisenoForm />
    </main>
  );
}
