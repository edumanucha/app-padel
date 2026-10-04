import CargarPartidoForm from "@/components/CargarPartidoForm";

// Ruta: /cargar-partido -- sumar un partido jugado sin Marcadorcito.
export default function CargarPartidoPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <CargarPartidoForm />
    </main>
  );
}
