import PruebaFuentesForm from "@/components/PruebaFuentesForm";

// Ruta: /pruebas-fuentes -- comparación de combinaciones de fuentes para el
// estilo "Cartel de estadio" (2026-10-01). Las fuentes se cargan solo acá.
const FUENTES =
  "https://fonts.googleapis.com/css2?family=Big+Shoulders:opsz,wght@10..72,700..900&family=Barlow:wght@400;500;600;700&family=Schibsted+Grotesk:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Chakra+Petch:wght@600;700&display=swap";

export default function PruebasFuentesPage() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-4 sm:p-8">
      <link rel="stylesheet" href={FUENTES} precedence="default" />
      <PruebaFuentesForm />
    </main>
  );
}
