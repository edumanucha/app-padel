import GrupoForm from "@/components/GrupoForm";

// Ruta: /grupos/<id> -- ranking, cara a cara y miembros de un grupo.
export default async function GrupoPage({ params }) {
  const { id } = await params;

  return (
    <main className="min-h-screen flex justify-center p-6">
      <GrupoForm grupoId={id} />
    </main>
  );
}
