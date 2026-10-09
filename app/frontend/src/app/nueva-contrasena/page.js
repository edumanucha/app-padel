import NuevaContrasenaForm from "@/components/NuevaContrasenaForm";

export const metadata = {
  title: "Nueva contraseña · Padelito",
};

export default function NuevaContrasenaPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <NuevaContrasenaForm />
    </main>
  );
}
