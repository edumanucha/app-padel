import DemoMarcadorForm from "@/components/DemoMarcadorForm";
import AvisoGirarTelefono from "@/components/AvisoGirarTelefono";
import styles from "@/components/Marcador.module.css";

export default function DemoMarcadorPage() {
  return (
    <main className="min-h-screen flex justify-center p-4 sm:p-6">
      <AvisoGirarTelefono />
      <div className={styles.contenidoMarcador}>
        <DemoMarcadorForm />
      </div>
    </main>
  );
}
