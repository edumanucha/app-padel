import PruebaTorneosForm from "@/components/PruebaTorneosForm";

// Ruta: /torneos/probar -- vista previa de torneos entre amigos (americano y
// mexicano) con datos de ejemplo. No guarda nada (2026-10-03). Antes estaba
// en /pruebas-torneos; se mudó acá (2026-10-10) porque la usan los
// visitantes ("Probá un torneo") y las /pruebas-* ya no salen en producción.
export default function TorneosProbarPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <PruebaTorneosForm />
    </main>
  );
}
