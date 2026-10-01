import PruebaMarcadorcitoForm from "@/components/PruebaMarcadorcitoForm";

// Ruta: /pruebas-marcadorcito -- herramienta de diseño, aislada de la app
// real, para elegir cómo se ve el "¿Cómo querés llevar los puntos?" y el
// panel "⚙️ Opciones" del Marcadorcito.
export default function PruebasMarcadorcitoPage() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-4 sm:p-8">
      <PruebaMarcadorcitoForm />
    </main>
  );
}
