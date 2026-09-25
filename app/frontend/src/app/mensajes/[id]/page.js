import ConversacionForm from "@/components/ConversacionForm";

export default async function ConversacionPage({ params }) {
  const { id } = await params;

  return (
    <main className="min-h-screen flex justify-center p-6">
      <ConversacionForm otroId={id} />
    </main>
  );
}
