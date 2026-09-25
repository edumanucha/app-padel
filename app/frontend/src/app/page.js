import HomeForm from "@/components/HomeForm";

// Pantalla principal (US-5.3): resumen personalizado + accesos directos.
// Reemplaza a la vieja pantalla de prueba de identidad visual (que ya
// cumplió su función al construir la Épica 1).
export default function Home() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <HomeForm />
    </main>
  );
}
