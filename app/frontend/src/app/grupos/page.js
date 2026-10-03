import GruposForm from "@/components/GruposForm";

// Ruta: /grupos -- mis grupos de amigos (ver 069_grupos_de_amigos.sql).
export default function GruposPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <GruposForm />
    </main>
  );
}
