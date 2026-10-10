"use client";

import ConPelota from "@/components/ConPelota";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";

// Visitante (2026-10-04): quien entra sin cuenta puede mirar la parte
// pública de la app. Las pantallas que necesitan una cuenta (perfil,
// Marcadorcito, partidos, etc.) muestran este aviso en vez de mandar
// directo al login.
const PUBLICAS = [
  "/login",
  "/consejos",
  "/quienes-somos",
  "/como-funciona",
  "/privacidad",
  "/pruebas",
  "/torneos/probar",
  "/marcador-libre/demo",
  "/probar",
  "/reloj",
  "/p/",
  "/g/",
  "/offline",
  "/nueva-contrasena",
];

const AVISOS = [
  [/^\/perfil/, "Tu perfil", "Acá van tus partidos, tus estadísticas y tus destacados. Creá tu cuenta y empezá a armarlo."],
  [/^\/marcador-libre/, "Marcadorcito", "Para llevar el marcador de un partido necesitás una cuenta, así queda guardado para todos."],
  [/^\/partido\/[^/]+\/marcador/, "Marcadorcito", "Para ver o llevar el marcador de un partido necesitás una cuenta."],
  [/^\/jugadores/, "Jugadores", "Para ver el ranking y buscar jugadores necesitás una cuenta."],
  [/^\/torneos/, "Torneos", "Para armar y seguir tus torneos necesitás una cuenta. Mientras tanto, probá un torneo de ejemplo."],
  [/^\/(mis-partidos|cargar-partido)/, "Tus partidos", "Para guardar y ver tus partidos necesitás una cuenta."],
];

function hayToken() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      if (/^sb-.*-auth-token$/.test(localStorage.key(i))) return true;
    }
  } catch {
    // sin localStorage
  }
  return false;
}

export default function PuertaVisitante({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  // null = todavía no se sabe (no se monta la pantalla privada hasta decidir,
  // si no se redirigiría al login antes de mostrar el aviso).
  const [visitante, setVisitante] = useState(null);

  useEffect(() => {
    setVisitante(!hayToken());
  }, [pathname]);

  const esPublica = pathname === "/" || PUBLICAS.some((r) => pathname.startsWith(r));
  if (esPublica) return children;
  if (visitante === null) return null;
  if (!visitante) return children;

  const [, titulo, texto] = AVISOS.find(([re]) => re.test(pathname)) ?? [null, "Necesitás una cuenta", "Para usar esta parte de Padelito creá tu cuenta: es gratis y tarda un minuto."];

  function irALogin() {
    try {
      sessionStorage.setItem("volverA", pathname);
    } catch {
      // nada
    }
    router.push("/login");
  }

  return (
    <main className="min-h-[70vh] flex justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-5 text-ink pt-10">
        <Logo size={44} />
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{titulo}</ConPelota></h1>
        <p className="text-base text-muted">{texto}</p>
        <button onClick={irALogin} className="rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-xl py-2.5 cursor-pointer">
          Crear mi cuenta o entrar
        </button>
        <button onClick={() => router.push("/")} className="text-sm font-semibold px-3 py-2 rounded-[6px] border border-ink/15 cursor-pointer">
          Seguir mirando
        </button>
      </div>
    </main>
  );
}
