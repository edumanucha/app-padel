import PrivacidadForm from "@/components/PrivacidadForm";

// Ruta pública: /privacidad -- política de privacidad (2026-10-03). Google la
// pide para publicar el inicio de sesión con Google. No está enlazada desde
// el menú principal: se llega desde Configuración, al final.
export default function PrivacidadPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <PrivacidadForm />
    </main>
  );
}
