import PruebaRelojFinalForm from "@/components/PruebaRelojFinalForm";

// Ruta: /pruebas-reloj-final -- opciones del aviso que llega al reloj al
// terminar el partido (2026-10-01, pedido del usuario después de su primer
// partido real con el modo Reloj).
export default function PruebasRelojFinalPage() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-4 sm:p-8">
      <PruebaRelojFinalForm />
    </main>
  );
}
