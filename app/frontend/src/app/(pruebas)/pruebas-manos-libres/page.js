import PruebaManosLibresForm from "@/components/PruebaManosLibresForm";

// Ruta: /pruebas-manos-libres -- herramienta de QA, aislada del Marcadorcito
// real (US-2.7), para probar en la cancha si detectar aplausos/silbidos y
// gestos de mano por cámara son más confiables que la voz actual.
export default function PruebasManosLibresPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <PruebaManosLibresForm />
    </main>
  );
}
