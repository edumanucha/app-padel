import AdminEstadisticasForm from "@/components/AdminEstadisticasForm";

// Ruta: /admin/estadisticas -- panel privado del superusuario (2026-10-06):
// estadísticas de uso anónimas. Si no sos superusuario, te devuelve al inicio.
export default function AdminEstadisticasPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <AdminEstadisticasForm />
    </main>
  );
}
