"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { IconoCasa, IconoTrofeo, IconoPelota, IconoPersona } from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";

// Barra de navegación fija (2026-09-12, a pedido del usuario, inspirada en
// una referencia visual que trajo): accesos directos a las 4 secciones más
// usadas, siempre visible mientras haya sesión iniciada. El ☰ (menú
// completo, MenuCompletoForm) sigue siendo el acceso a todo lo demás
// (mensajes, invitaciones, canchas, etc.) -- ver
// project_padelito_style_guide.md.
const TABS = [
  { href: "/", key: "home", Icono: IconoCasa },
  { href: "/jugadores", key: "jugadores", Icono: IconoTrofeo },
  { href: "/marcador-libre", key: "marcadorcito", Icono: IconoPelota },
  { href: "/perfil", key: "perfil", Icono: IconoPersona },
];

// Pantallas donde no tiene sentido mostrarla: previas a tener sesión/perfil
// activo, y el marcador en vivo (US-2.7), que es una pantalla apaisada e
// inmersiva -- una barra fija abajo achicaría el tablero justo en la
// cancha, que es donde más importa que se vea grande.
function debeOcultarse(pathname) {
  if (pathname.startsWith("/elegir-deporte")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/completar-perfil")) return true;
  if (/^\/partido\/[^/]+\/marcador$/.test(pathname)) return true;
  if (pathname.startsWith("/marcador-libre/demo")) return true;
  if (pathname.startsWith("/pruebas-manos-libres")) return true;
  return false;
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const [conSesion, setConSesion] = useState(false);

  useEffect(() => {
    let activo = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (activo) setConSesion(!!user);
    });
    return () => {
      activo = false;
    };
  }, [pathname]);

  if (!conSesion || debeOcultarse(pathname)) return null;

  return (
    <nav
      className="fixed bottom-4 left-4 right-4 max-w-md mx-auto flex items-center justify-around py-2.5 rounded-[20px] z-40"
      style={{ background: "var(--nav-bg)", boxShadow: "0 4px 16px rgba(20,38,31,0.16)" }}
    >
      {TABS.map(({ href, key, Icono }) => {
        const activa = pathname === href;
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-[14px] cursor-pointer ${
              activa ? "bg-accent/20 text-ink" : "text-muted"
            }`}
          >
            <span>
              <Icono />
            </span>
            <span className="text-[10px] font-heading font-semibold">{t(`nav.${key}`)}</span>
          </button>
        );
      })}
    </nav>
  );
}
