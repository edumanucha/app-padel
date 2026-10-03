import UnirseGrupoForm from "@/components/UnirseGrupoForm";

// Ruta: /g/<código> -- link de invitación a un grupo (se manda por WhatsApp).
export default async function UnirseGrupoPage({ params }) {
  const { codigo } = await params;

  return (
    <main className="min-h-screen flex justify-center p-6">
      <UnirseGrupoForm codigo={codigo} />
    </main>
  );
}
