import DetallePartidoForm from "@/components/DetallePartidoForm";

export default async function DetallePartidoPage({ params }) {
  const { id } = await params;

  return (
    <main className="min-h-screen flex justify-center p-6">
      <DetallePartidoForm partidoId={id} />
    </main>
  );
}
