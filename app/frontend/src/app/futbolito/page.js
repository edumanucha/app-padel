import DeporteMaquetaForm from "@/components/DeporteMaquetaForm";

export default function FutbolitoPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <DeporteMaquetaForm
        nombre="Futbolito"
        emoji="⚽"
        colorAcento="#8fd19e"
        datosEjemplo={{
          proximoPartido: "Domingo, 18hs · Cancha 5 (ejemplo)",
          ultimoPartido: "🏆 Ganaron 4-2 vs. Los Pibes FC (ejemplo)",
          stats: [
            { valor: "5", etiqueta: "Racha ganada" },
            { valor: "#8", etiqueta: "en el ranking" },
            { valor: "70%", etiqueta: "12 jugados" },
          ],
        }}
      />
    </main>
  );
}
