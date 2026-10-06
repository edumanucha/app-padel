import PruebaRelojAlternaForm from "@/components/PruebaRelojAlternaForm";

// Ruta: /pruebas-reloj-alterna -- herramienta de QA (2026-10-06): el envío
// nuevo al reloj (cada 1,5 s, renglón de abajo alternado) con registro de
// cada envío. No guarda nada.
export default function PruebasRelojAlternaPage() {
  return (
    <main className="min-h-screen flex flex-col items-center p-6">
      <PruebaRelojAlternaForm />
    </main>
  );
}
