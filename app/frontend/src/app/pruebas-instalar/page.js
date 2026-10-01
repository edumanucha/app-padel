import PruebaInstalarForm from "@/components/PruebaInstalarForm";

// Ruta: /pruebas-instalar -- herramienta de diseño, aislada de la app real,
// para elegir cómo se ofrece "Instalar la app" en el inicio y en el perfil.
export default function PruebasInstalarPage() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-4 sm:p-8">
      <PruebaInstalarForm />
    </main>
  );
}
