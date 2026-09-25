"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import FormularioFeedback from "@/components/FormularioFeedback";
import { useLocale } from "@/i18n/LocaleContext";
import {
  IconoPelota,
  IconoCalendario,
  IconoLupa,
  IconoLista,
  IconoTrofeo,
  IconoMensaje,
  IconoSobre,
  IconoRadar,
  IconoDuo,
  IconoPin,
  IconoPersona,
  IconoBandera,
  IconoLlave,
  IconoAyuda,
  IconoLibro,
  IconoSinConexion,
} from "@/components/Icons";

// "Ver todo" (a pedido del usuario, 2026-09-06): el Home resume los
// accesos más frecuentes en secciones cortas -- esta pantalla lista
// TODAS las funcionalidades reales de la app en un solo lugar, para que
// nada quede "perdido" detrás de un resumen.
// Rediseñada (2026-09-12, a pedido del usuario: "no sigue el estilo
// minimalista de las imágenes") -- pasa de bloques sólidos con borde
// grueso + emoji a tarjetas claras con ícono lineal en una placa de
// color, igual que el resto de la app (ver
// project_padelito_style_guide.md).
const SECCIONES = [
  {
    claveTitulo: "menu.jugarTitulo",
    badge: "bg-accent/20",
    items: [
      { Icono: IconoPelota, claveTexto: "nav.marcadorcito", ruta: "/marcador-libre" },
      { Icono: IconoCalendario, claveTexto: "home.crearPartido", ruta: "/crear-partido" },
      { Icono: IconoLupa, claveTexto: "home.abiertos", ruta: "/partidos" },
      { Icono: IconoLista, claveTexto: "home.misPartidos", ruta: "/mis-partidos" },
    ],
  },
  {
    claveTitulo: "home.comunidad",
    badge: "bg-accent-2/20",
    items: [
      { Icono: IconoTrofeo, claveTexto: "menu.jugadoresRanking", ruta: "/jugadores" },
      { Icono: IconoMensaje, claveTexto: "home.mensajesTitulo", ruta: "/mensajes" },
      { Icono: IconoSobre, claveTexto: "invitaciones.titulo", ruta: "/invitaciones" },
    ],
  },
  {
    claveTitulo: "home.matchmaking",
    badge: "bg-accent-2/20",
    items: [
      { Icono: IconoRadar, claveTexto: "home.disponibilidad", ruta: "/disponibilidad" },
      { Icono: IconoDuo, claveTexto: "home.companeroFijo", ruta: "/companero-fijo" },
    ],
  },
  {
    claveTitulo: "home.recursos",
    badge: "bg-accent-3/20",
    items: [{ Icono: IconoPin, claveTexto: "home.canchas", ruta: "/canchas" }],
  },
  {
    claveTitulo: "home.cuenta",
    badge: "bg-bg",
    esCuenta: true,
    items: [
      { Icono: IconoPersona, claveTexto: "home.miPerfil", ruta: "/perfil" },
      { Icono: IconoBandera, claveTexto: "home.apelaciones", ruta: "/apelaciones" },
      { Icono: IconoPelota, claveTexto: "home.cambiarDeporte", ruta: "/elegir-deporte" },
    ],
  },
  {
    claveTitulo: "menu.ayudaTitulo",
    badge: "bg-bg",
    items: [
      { Icono: IconoAyuda, claveTexto: "comoFunciona.titulo", ruta: "/como-funciona" },
      { Icono: IconoLibro, claveTexto: "quienesSomos.titulo", ruta: "/quienes-somos" },
    ],
  },
];

const SE_VIENE = [
  { Icono: IconoCalendario, claveTexto: "home.reservarCancha" },
  { Icono: IconoSinConexion, claveTexto: "home.modoSinConexion" },
];

const tarjeta = "bg-surface text-ink rounded-[14px] p-3 shadow-[0_1px_3px_rgba(20,38,31,0.08)]";

export default function MenuCompletoForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [esSuperusuario, setEsSuperusuario] = useState(false);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: perfil } = await supabase.from("perfiles").select("es_superusuario").eq("id", user.id).single();
      setEsSuperusuario(!!perfil?.es_superusuario);
      setCargando(false);
    }
    cargar();
  }, [router]);

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("menu.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t("menu.verTodo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("menu.volver")}
        </button>
      </div>

      {SECCIONES.map((seccion) => (
        <div key={seccion.claveTitulo} className="flex flex-col gap-2">
          <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">
            {t(seccion.claveTitulo)}
          </span>
          <div className="flex flex-col gap-2">
            {seccion.items.map((item) => (
              <button
                key={item.ruta}
                onClick={() => router.push(item.ruta)}
                className={`text-left font-heading font-semibold text-sm cursor-pointer flex items-center gap-3 ${tarjeta}`}
              >
                <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${seccion.badge}`}>
                  <item.Icono width={18} height={18} />
                </span>
                {t(item.claveTexto)}
              </button>
            ))}
            {seccion.esCuenta && esSuperusuario && (
              <button
                onClick={() => router.push("/admin/canchas")}
                className={`text-left font-heading font-semibold text-sm cursor-pointer flex items-center gap-3 ${tarjeta}`}
              >
                <span className="w-9 h-9 rounded-full bg-bg flex items-center justify-center flex-shrink-0">
                  <IconoLlave width={18} height={18} />
                </span>
                {t("home.adminCanchas")}
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">{t("home.seViene")}</span>
        <div className="flex flex-col gap-2">
          {SE_VIENE.map((item) => (
            <div
              key={item.claveTexto}
              className={`text-sm text-muted flex items-center gap-3 opacity-70 ${tarjeta}`}
            >
              <span className="w-9 h-9 rounded-full bg-bg flex items-center justify-center flex-shrink-0">
                <item.Icono width={18} height={18} />
              </span>
              {t(item.claveTexto)} · {t("home.proximamente")}
            </div>
          ))}
        </div>
      </div>

      <FormularioFeedback />
    </div>
  );
}
