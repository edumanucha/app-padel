import PruebaTarjetaForm from "@/components/PruebaTarjetaForm";

// Ruta: /pruebas-tarjeta -- herramienta de QA, aislada del Marcadorcito real,
// para elegir el diseño de la tarjeta de resultado para compartir
// (WhatsApp / Instagram) antes de sumarla al final del partido.
export default function PruebasTarjetaPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 sm:p-8">
      <PruebaTarjetaForm />
    </main>
  );
}
