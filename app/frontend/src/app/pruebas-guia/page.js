import PruebaGuiaForm from "@/components/PruebaGuiaForm";

// Ruta: /pruebas-guia -- herramienta de diseño, aislada de la app real, para
// elegir cómo se ofrece y cómo se ve la guía de la app.
export default function PruebasGuiaPage() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-4 sm:p-8">
      <PruebaGuiaForm />
    </main>
  );
}
