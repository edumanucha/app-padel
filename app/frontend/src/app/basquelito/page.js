import DeporteMaquetaForm from "@/components/DeporteMaquetaForm";

export default function BasquelitoPage() {
  return (
    <main className="min-h-screen flex justify-center p-6">
      <DeporteMaquetaForm
        nombre="Basquelito"
        emoji="🏀"
        colorAcento="#f2a65a"
        datosEjemplo={{
          proximoPartido: "Miércoles, 21hs · Gimnasio Central (ejemplo)",
          ultimoPartido: "Perdieron 45-52 vs. Huracán Básquet (ejemplo)",
          stats: [
            { valor: "0", etiqueta: "Racha ganada" },
            { valor: "#15", etiqueta: "en el ranking" },
            { valor: "55%", etiqueta: "9 jugados" },
          ],
        }}
      />
    </main>
  );
}
