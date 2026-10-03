import ConsejosForm from "@/components/ConsejosForm";

// Ruta: /consejos -- consejos de pádel por categoría (ver lib/consejos.js).
export default function ConsejosPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <ConsejosForm />
    </main>
  );
}
