"use client";

import { useEffect, useState } from "react";

// Botón para cambiar entre modo claro y oscuro a mano.
// "use client" es necesario porque este componente usa estado (useState) y
// toca el DOM/localStorage directamente — cosas que solo pueden pasar en el
// navegador, no en el servidor (donde Next.js arma la mayor parte del HTML).
export default function ThemeToggle() {
  // null = "todavía no sabemos" (recién lo sabemos una vez que este código
  // corre en el navegador). Evita mostrar un valor que no coincida entre
  // lo que arma el servidor y lo que arma el navegador.
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    // Por defecto siempre claro (2026-09-19, a pedido del usuario) -- antes,
    // sin nada guardado, se adivinaba según la preferencia del sistema
    // (`prefers-color-scheme`), lo que hacía arrancar en oscuro sin que la
    // persona lo pidiera. El CSS (globals.css) ya no tiene ningún bloque
    // que aplique oscuro automático, así que este estado inicial tiene
    // que coincidir: "light" salvo que la persona ya haya elegido antes.
    setTheme(stored === "dark" ? "dark" : "light");
  }, []);

  function alternarTema() {
    const siguiente = theme === "dark" ? "light" : "dark";
    setTheme(siguiente);
    document.documentElement.setAttribute("data-theme", siguiente);
    localStorage.setItem("theme", siguiente);
  }

  if (theme === null) {
    // Todavía no sabemos qué tema mostrar en el botón — no mostramos nada
    // en vez de arriesgarnos a mostrar el ícono equivocado por un instante.
    return null;
  }

  return (
    <button
      onClick={alternarTema}
      className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
    >
      {theme === "dark" ? "☀️ Modo claro" : "🌙 Modo oscuro"}
    </button>
  );
}
