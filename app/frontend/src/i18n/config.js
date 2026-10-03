// Diccionario de traducción liviano (2026-09-12, a pedido del usuario:
// "traduci al inglés y al portugués", después de que el selector de
// Idioma en /configuracion era un cartel fijo sin función real).
// No es ruteo por idioma (no hay /en/... ni /pt/...): es un diccionario
// simple + contexto de React, para no tener que tocar cada router.push()
// de la app. Arranca por Home + BottomNav + Configuración; se puede
// seguir sumando pantalla por pantalla.
export const DEFAULT_LOCALE = "es";

export const LOCALES = [
  { valor: "es", nombre: "Español" },
  { valor: "en", nombre: "English" },
  { valor: "pt", nombre: "Português" },
];

export const INTL_LOCALE = {
  es: "es-AR",
  en: "en-US",
  pt: "pt-BR",
};
