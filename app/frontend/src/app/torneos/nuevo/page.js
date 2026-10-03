import NuevoTorneoForm from "@/components/NuevoTorneoForm";

// Ruta: /torneos/nuevo -- armar un torneo.
export default function NuevoTorneoPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <NuevoTorneoForm />
    </main>
  );
}
