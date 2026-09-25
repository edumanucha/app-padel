import ListaPartidosForm from "@/components/ListaPartidosForm";

// Ruta: /partidos (US-2.2, "Partidos abiertos")
export default function PartidosPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <ListaPartidosForm />
    </main>
  );
}
