import PruebaDistanciaRelojForm from "@/components/PruebaDistanciaRelojForm";

// Ruta: /pruebas-distancia -- herramienta de QA (2026-10-04): hasta qué
// distancia del celu llegan los botones del reloj. Solo cuenta puntos con beep, no guarda nada.
export default function PruebasDistanciaPage() {
  return (
    <main className="min-h-screen flex flex-col items-center p-6">
      <PruebaDistanciaRelojForm />
    </main>
  );
}
