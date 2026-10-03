import TorneoForm from "@/components/TorneoForm";

// Ruta: /torneos/<id> -- un torneo: ronda en curso, tabla y podio.
export default async function TorneoPage({ params }) {
  const { id } = await params;

  return (
    <main className="min-h-screen flex justify-center p-6">
      <TorneoForm torneoId={id} />
    </main>
  );
}
