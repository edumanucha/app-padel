import { Suspense } from "react";
import CrearPartidoForm from "@/components/CrearPartidoForm";

// Ruta: /crear-partido (US-2.1). Suspense: CrearPartidoForm usa
// useSearchParams (US-6.6, precarga de "Repetir este partido"), que
// Next.js exige envolver en un boundary de Suspense.
export default function CrearPartidoPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <Suspense fallback={null}>
        <CrearPartidoForm />
      </Suspense>
    </main>
  );
}
