"use client";

import ConPelota from "@/components/ConPelota";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
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
  IconoChevron,
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
    ],
  },
  {
    claveTitulo: "menu.ayudaTitulo",
    badge: "bg-bg",
    items: [
      { Icono: IconoAyuda, claveTexto: "comoFunciona.titulo", ruta: "/como-funciona" },
      { Icono: IconoAyuda, claveTexto: "menu.verGuia", ruta: "/?guia=1" },
      { Icono: IconoLibro, claveTexto: "quienesSomos.titulo", ruta: "/quienes-somos" },
    ],
  },
];

const SE_VIENE = [
  { Icono: IconoCalendario, claveTexto: "home.reservarCancha" },
  { Icono: IconoSinConexion, claveTexto: "home.modoSinConexion" },
];

// Rediseño Cartel (2026-10-01): fila con ícono y línea fina abajo.
const fila = "w-full text-left flex items-center gap-3 py-2.5 border-b border-ink/10 text-sm font-semibold";

export default function MenuCompletoForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [esSuperusuario, setEsSuperusuario] = useState(false);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await usuarioRapido();
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

  // Rediseño Cartel (2026-10-01): cada sección es una etiqueta chica y una
  // lista de filas con ícono, separadas por líneas finas (sin tarjetas).
  return (
    <div className="w-full max-w-md flex flex-col gap-6 pantalla-mosaico text-ink">
      <div className="flex items-center justify-between gap-3 col-completa">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{t("menu.verTodo")}</ConPelota></h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("menu.volver")}
        </button>
      </div>

      {SECCIONES.map((seccion) => (
        <div key={seccion.claveTitulo} className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-2">
            {t(seccion.claveTitulo)}
          </span>
          <div className="flex flex-col border-t-2 border-ink">
            {seccion.items.map((item) => (
              <button
                key={item.ruta}
                onClick={() => router.push(item.ruta)}
                className={`${fila} cursor-pointer`}
              >
                <span className={`w-9 h-9 rounded-[6px] flex items-center justify-center flex-shrink-0 ${seccion.badge}`}>
                  <item.Icono width={18} height={18} />
                </span>
                <span className="flex-1 min-w-0">{t(item.claveTexto)}</span>
                <IconoChevron width={16} height={16} className="text-muted" style={{ transform: "rotate(-90deg)" }} aria-hidden />
              </button>
            ))}
            {seccion.esCuenta && esSuperusuario && (
              <button
                onClick={() => router.push("/admin/canchas")}
                className={`${fila} cursor-pointer`}
              >
                <span className="w-9 h-9 rounded-[6px] bg-bg flex items-center justify-center flex-shrink-0">
                  <IconoLlave width={18} height={18} />
                </span>
                <span className="flex-1 min-w-0">{t("home.adminCanchas")}</span>
                <IconoChevron width={16} height={16} className="text-muted" style={{ transform: "rotate(-90deg)" }} aria-hidden />
              </button>
            )}
            {seccion.esCuenta && esSuperusuario && (
              <button
                onClick={() => router.push("/admin/estadisticas")}
                className={`${fila} cursor-pointer`}
              >
                <span className="w-9 h-9 rounded-[6px] bg-bg flex items-center justify-center flex-shrink-0">
                  <IconoLlave width={18} height={18} />
                </span>
                <span className="flex-1 min-w-0">{t("home.adminEstadisticas")}</span>
                <IconoChevron width={16} height={16} className="text-muted" style={{ transform: "rotate(-90deg)" }} aria-hidden />
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-col">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-2">{t("home.seViene")}</span>
        <div className="flex flex-col border-t-2 border-ink">
          {SE_VIENE.map((item) => (
            <div
              key={item.claveTexto}
              className={`${fila} text-muted font-normal`}
            >
              <span className="w-9 h-9 rounded-[6px] bg-bg flex items-center justify-center flex-shrink-0 opacity-70">
                <item.Icono width={18} height={18} />
              </span>
              <span className="flex-1 min-w-0">
                {t(item.claveTexto)} · {t("home.proximamente")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <FormularioFeedback />
    </div>
  );
}
