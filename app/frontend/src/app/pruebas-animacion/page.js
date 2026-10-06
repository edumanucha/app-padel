import PruebaAnimacionForm from "@/components/PruebaAnimacionForm";

// Ruta: /pruebas-animacion -- ver la animación de entrada cuando se quiera,
// con sonido (2026-10-06, pedido del usuario).
export default function PruebasAnimacionPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <PruebaAnimacionForm />
    </main>
  );
}
