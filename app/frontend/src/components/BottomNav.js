"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import {
  IconoCasa,
  IconoTrofeo,
  IconoPelota,
  IconoPersona,
  IconoLista,
  IconoPin,
  IconoMensaje,
  IconoMenu,
} from "@/components/Icons";
import Logo from "@/components/Logo";
import MarcaPadelito from "@/components/MarcaPadelito";
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

// En la compu (opción C, 2026-09-30, elegida por el usuario sobre
// /pruebas-pc) la navegación es una barra arriba con más accesos, y la de
// abajo se oculta.
const TABS_COMPU = [
  { href: "/", texto: (t) => t("nav.home"), Icono: IconoCasa },
  { href: "/jugadores", texto: (t) => t("nav.jugadores"), Icono: IconoTrofeo },
  { href: "/marcador-libre", texto: (t) => t("nav.marcadorcito"), Icono: IconoPelota },
  { href: "/mis-partidos", texto: (t) => t("home.misPartidos"), Icono: IconoLista },
  { href: "/canchas", texto: (t) => t("home.canchas"), Icono: IconoPin },
  { href: "/mensajes", texto: (t) => t("home.mensajesTitulo"), Icono: IconoMensaje },
];

// Pantallas donde no tiene sentido mostrarla: previas a tener sesión/perfil
// activo, y el marcador en vivo (US-2.7), que es una pantalla apaisada e
// inmersiva -- una barra fija abajo achicaría el tablero justo en la
// cancha, que es donde más importa que se vea grande.
function debeOcultarse(pathname) {
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
    usuarioRapido().then(({ data: { user } }) => {
      if (activo) setConSesion(!!user);
    });
    return () => {
      activo = false;
    };
  }, [pathname]);

  if (!conSesion || debeOcultarse(pathname)) return null;

  return (
    <>
    <header
      data-guia="navegacion"
      className="nav-escritorio hidden lg:flex fixed top-0 left-0 right-0 z-40 items-center gap-2 px-6 py-3"
      /* Barra oscura tipo cartel, igual que la de abajo del celu (rediseño, 2026-10-01). */
      style={{ background: "#10201a" }}
    >
      <button onClick={() => router.push("/")} className="flex items-center gap-2 mr-4 cursor-pointer">
        <Logo size={34} fondo="#10201a" />
        <MarcaPadelito className="text-[28px] text-[#eaf4f0]" />
      </button>
      {TABS_COMPU.map(({ href, texto, Icono }) => {
        const activa = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-heading font-semibold cursor-pointer ${ activa ? "bg-accent text-accent-ink" : "text-[#8fb6ae] hover:bg-white/10 hover:text-[#eaf4f0]" }`}
          >
            <Icono width={18} height={18} />
            {texto(t)}
          </button>
        );
      })}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => router.push("/menu")}
          className="w-10 h-10 rounded-[6px] text-[#eaf4f0] hover:bg-white/10 flex items-center justify-center cursor-pointer"
          aria-label={t("home.verTodo")}
          title={t("home.verTodo")}
        >
          <IconoMenu />
        </button>
        <button
          onClick={() => router.push("/perfil")}
          className={`flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-heading font-semibold cursor-pointer ${ pathname.startsWith("/perfil") ? "bg-accent text-accent-ink" : "text-[#eaf4f0] border border-white/20 hover:bg-white/10" }`}
        >
          <IconoPersona width={18} height={18} />
          {t("nav.perfil")}
        </button>
      </div>
    </header>
    <nav
      data-guia="navegacion"
      className="lg:hidden fixed bottom-4 left-4 right-4 max-w-md mx-auto flex items-center justify-around py-2.5 rounded-[8px] z-40"
      /* Barra oscura tipo cartel (rediseño paso C, 2026-10-01). */
      style={{ background: "#10201a", boxShadow: "0 4px 16px rgba(20,38,31,0.22)" }}
    >
      {TABS.map(({ href, key, Icono }) => {
        const activa = pathname === href;
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-[6px] cursor-pointer ${ activa ? "bg-accent text-accent-ink" : "text-[#8fb6ae]" }`}
          >
            <span>
              <Icono />
            </span>
            <span className="text-[10px] font-heading font-semibold">{t(`nav.${key}`)}</span>
          </button>
        );
      })}
    </nav>
    </>
  );
}
