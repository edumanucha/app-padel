import MarcadorForm from "@/components/MarcadorForm";
import AvisoGirarTelefono from "@/components/AvisoGirarTelefono";
import styles from "@/components/Marcador.module.css";

export default async function MarcadorPage({ params }) {
  const { id } = await params;

  return (
    <main className="min-h-screen flex justify-center p-4 sm:p-6">
      <AvisoGirarTelefono />
      <div className={`${styles.contenidoMarcador} w-full`}>
        <MarcadorForm partidoId={id} />
      </div>
    </main>
  );
}
