import PerfilJugadorForm from "@/components/PerfilJugadorForm";

export default async function PerfilJugadorPage({ params }) {
  const { id } = await params;

  return (
    <main className="min-h-screen flex justify-center p-6">
      <PerfilJugadorForm jugadorId={id} />
    </main>
  );
}
