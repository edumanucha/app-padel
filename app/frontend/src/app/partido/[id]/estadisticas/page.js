import EstadisticasPartidoForm from "@/components/EstadisticasPartidoForm";

export default async function EstadisticasPartidoPage({ params }) {
  const { id } = await params;

  return (
    <main className="min-h-screen flex justify-center p-6">
      <EstadisticasPartidoForm partidoId={id} />
    </main>
  );
}
