import RelojInfoForm from "@/components/RelojInfoForm";

export const metadata = {
  title: "El marcador en tu reloj · Padelito",
  description: "Sumá los puntos del partido de pádel desde tu reloj, con el celu en el bolso.",
};

export default function RelojPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <RelojInfoForm />
    </main>
  );
}
