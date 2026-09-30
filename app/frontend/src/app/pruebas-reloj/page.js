import PruebaRelojForm from "@/components/PruebaRelojForm";

// Ruta: /pruebas-reloj -- herramienta de QA, aislada del Marcadorcito real,
// para ver si los botones de música de un reloj Bluetooth / auriculares
// llegan a la página (Media Session API) antes de usarlos para sumar puntos.
export default function PruebasRelojPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <PruebaRelojForm />
    </main>
  );
}
