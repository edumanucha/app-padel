import { redirect } from "next/navigation";

// Dirección corta para compartir (2026-10-05): lleva al Marcadorcito de
// ejemplo, que se puede probar sin cuenta.
export default function ProbarPage() {
  redirect("/marcador-libre/demo");
}
