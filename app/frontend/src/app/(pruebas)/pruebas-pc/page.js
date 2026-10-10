import PruebaPcForm from "@/components/PruebaPcForm";

// Ruta: /pruebas-pc -- herramienta de diseño, aislada de la app real, para
// elegir cómo se ve el inicio en la compu (con su versión de celu al lado)
// antes de aplicarlo a las pantallas reales. Datos de ejemplo, nada real.
export default function PruebasPcPage() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-4 sm:p-8">
      <PruebaPcForm />
    </main>
  );
}
