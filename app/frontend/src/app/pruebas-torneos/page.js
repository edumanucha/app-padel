import PruebaTorneosForm from "@/components/PruebaTorneosForm";

// Ruta: /pruebas-torneos -- vista previa de torneos entre amigos (americano y
// mexicano) con datos de ejemplo. No guarda nada (2026-10-03).
export default function PruebasTorneosPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <PruebaTorneosForm />
    </main>
  );
}
