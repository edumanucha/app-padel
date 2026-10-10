// La pelotita amarilla de la marca como punto de la PRIMERA i del texto
// (D-34, 2026-10-09). Solo textos simples: si el texto trae una Í con tilde
// no se toca (quedaría una i con pelotita y otra con tilde). `verde` es para
// textos sobre fondo amarillo, donde la pelotita amarilla no se vería (D-36).
export default function ConPelota({ children, verde = false }) {
  if (typeof children !== "string" || /[íÍ]/.test(children)) return children;
  const i = children.search(/[iI]/);
  if (i < 0) return children;
  return (
    <>
      {children.slice(0, i)}
      <span className={verde ? "i-pelota i-pelota-verde" : "i-pelota"}>{children[i]}</span>
      {children.slice(i + 1)}
    </>
  );
}
