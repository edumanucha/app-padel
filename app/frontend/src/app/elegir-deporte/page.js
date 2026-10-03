import { redirect } from "next/navigation";

// Elegí tu deporte (2026-10-03): se sacó, la app se enfoca solo en pádel. Si alguien tiene
// el link guardado, va al inicio.
export default function Pagina() {
  redirect("/");
}
