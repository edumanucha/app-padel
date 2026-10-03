import TorneosForm from "@/components/TorneosForm";

// Ruta: /torneos -- mis torneos (ver 071_torneos.sql).
export default function TorneosPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <TorneosForm />
    </main>
  );
}
