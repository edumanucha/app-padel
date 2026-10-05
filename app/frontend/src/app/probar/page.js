import ProbarConRelojForm from "@/components/ProbarConRelojForm";

export const metadata = {
  title: "Probá el Marcadorcito · Padelito",
  description: "Probá el marcador de pádel de Padelito con tu reloj, sin cuenta y gratis.",
};

// Dirección corta para compartir (2026-10-05): el Marcadorcito de verdad para
// probar sin cuenta, con el reloj de quien lo prueba.
export default function ProbarPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <ProbarConRelojForm />
    </main>
  );
}
