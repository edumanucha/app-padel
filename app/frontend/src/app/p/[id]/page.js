import PartidoPublicoForm from "@/components/PartidoPublicoForm";

export default async function PartidoPublicoPage({ params }) {
  const { id } = await params;

  return (
    <main className="min-h-screen flex justify-center items-center p-6">
      <PartidoPublicoForm partidoId={id} />
    </main>
  );
}
