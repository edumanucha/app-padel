import DetalleCanchaForm from "@/components/DetalleCanchaForm";

export default async function DetalleCanchaPage({ params }) {
  const { id } = await params;

  return (
    <main className="min-h-screen flex justify-center p-6">
      <DetalleCanchaForm canchaId={id} />
    </main>
  );
}
