import InvitacionesForm from "@/components/InvitacionesForm";

// Ruta: /invitaciones (US-2.3, "Mis invitaciones")
export default function InvitacionesPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <InvitacionesForm />
    </main>
  );
}
