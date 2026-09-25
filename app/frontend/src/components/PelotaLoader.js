// Pelotita de tenis picando -- para mostrar en un boton mientras se
// espera una respuesta (en vez de solo texto "Guardando..."). Toda la
// animacion es CSS puro (@keyframes en globals.css), este componente
// solo dibuja los dos elementos (pelota + sombra) que anima esa CSS.
// aria-hidden porque es decorativo: el texto que la acompana (ej.
// "Guardando...") ya comunica el estado a lectores de pantalla.
export default function PelotaLoader() {
  return (
    <span className="pelota-loader" aria-hidden="true">
      <span className="pelota-loader__pelota" />
      <span className="pelota-loader__sombra" />
    </span>
  );
}
