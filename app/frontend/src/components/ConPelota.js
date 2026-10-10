// La pelotita amarilla de Padelito como "punto" de la I (D-34, 2026-10-09, a
// pedido del usuario: "que algunas íes tengan el amarillo, como la i del
// logo"; opción A de las maquetas). Solo en el título principal de cada
// pantalla y solo en la PRIMERA I del título. Si el título tiene una Í con
// acento, no se pone (el acento ya ocupa ese lugar y quedaría raro).
// Los títulos van en mayúsculas, así que la pelotita flota arriba de la I
// mayúscula (estilos en globals.css, .i-pelota).
export default function ConPelota({ children }) {
  if (typeof children !== "string" || /[íÍ]/.test(children)) return children;
  const i = children.search(/[iI]/);
  if (i < 0) return children;
  return (
    <>
      {children.slice(0, i)}
      <span className="i-pelota">{children[i]}</span>
      {children.slice(i + 1)}
    </>
  );
}
