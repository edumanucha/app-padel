// Traduce los errores de las funciones de grupos (069_grupos_de_amigos.sql) a
// un texto claro para la persona. La base devuelve un código corto en
// `error.message` (por ejemplo "limite_grupos").
export function mensajeErrorGrupo(error, t) {
  const m = error?.message ?? "";
  if (m.includes("limite_grupos")) return t("grupos.errLimite");
  if (m.includes("nombre_invalido")) return t("grupos.errNombre");
  if (m.includes("grupo_lleno")) return t("grupos.errLleno");
  return t("grupos.errGenerico");
}
