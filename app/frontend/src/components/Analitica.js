"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { registrar, pantallaNormalizada } from "@/lib/analitica";

// Estadísticas de uso (2026-10-06): una vez por pantalla ("abrir"), un
// "latido" cada 30 s mientras la app está a la vista (de ahí sale el tiempo
// de uso) y el aviso de instalación. No dibuja nada.
const LATIDO_MS = 30000;

export default function Analitica() {
  const pathname = usePathname();

  useEffect(() => {
    // Las páginas de prueba (/pruebas-*) son herramientas de QA: no suman.
    if (pathname?.startsWith("/pruebas")) return;
    registrar("abrir", null, pantallaNormalizada(pathname));
  }, [pathname]);

  useEffect(() => {
    if (pathname?.startsWith("/pruebas")) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") registrar("latido", null, pantallaNormalizada(window.location.pathname));
    }, LATIDO_MS);
    return () => clearInterval(id);
  }, [pathname]);

  useEffect(() => {
    const alInstalar = () => registrar("instalo_app");
    window.addEventListener("appinstalled", alInstalar);
    return () => window.removeEventListener("appinstalled", alInstalar);
  }, []);

  return null;
}
