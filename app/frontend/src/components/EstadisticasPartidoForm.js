"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import BarraEstadistica from "@/components/BarraEstadistica";
import { IconoTrofeo } from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";
import { estadisticasDeLado, formatoSets, calcularPuntosRanking } from "@/lib/estadisticasMarcadorcito";

const tarjeta = "bg-surface text-ink rounded-[18px] p-4 shadow-[0_1px_3px_rgba(20,38,31,0.08)]";

function Dato({ etiqueta, valor }) {
  return (
    <div className="bg-bg shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[14px] p-2.5 flex flex-col gap-0.5">
      <span className="font-heading text-xs text-muted">{etiqueta}</span>
      <span className="text-sm font-heading font-semibold">{valor}</span>
    </div>
  );
}

// Vista propia para el detalle de UN partido de Marcadorcito (2026-09-13,
// a pedido del usuario: "que vaya a una nueva vista" en vez de expandir
// inline dentro de la lista del perfil) -- muestra TODO lo que guarda
// estadisticas_partido para ese partido puntual, ya del lado de este
// jugador (ver estadisticasMarcadorcito.js), quiénes fueron los rivales
// (2026-09-13, a pedido del usuario: "contra quién, qué categoría/ranking
// tiene") y cuántos puntos de ranking dejó este partido puntual.
export default function EstadisticasPartidoForm({ partidoId }) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: miFila } = await supabase
        .from("partido_jugadores")
        .select("equipo")
        .eq("partido_id", partidoId)
        .eq("jugador_id", user.id)
        .not("equipo", "is", null)
        .single();

      const { data: partido } = await supabase
        .from("partidos")
        .select("fecha_hora, cancha, resultados_partido(ganador, estado), estadisticas_partido(*)")
        .eq("id", partidoId)
        .single();

      if (!miFila?.equipo || !partido?.estadisticas_partido) {
        setNoEncontrado(true);
        setCargando(false);
        return;
      }

      const miEquipo = miFila.equipo;

      // Quiénes jugaron del otro lado de la red: cuenta real (con
      // nivel/ranking, vía ver_perfil_jugador -- perfiles tiene RLS que
      // solo deja ver la propia fila, así que un select directo no
      // alcanza) o invitado libre (invitado_nombre, sin cuenta).
      const { data: todosLosJugadores } = await supabase
        .from("partido_jugadores")
        .select("jugador_id, invitado_nombre, equipo")
        .eq("partido_id", partidoId);

      const filasRivales = (todosLosJugadores ?? []).filter((f) => f.equipo && f.equipo !== miEquipo);
      const rivales = await Promise.all(
        filasRivales.map(async (f) => {
          if (!f.jugador_id) {
            return { nombre: f.invitado_nombre, invitado: true };
          }
          const { data: perfilRival } = await supabase
            .rpc("ver_perfil_jugador", { p_id: f.jugador_id })
            .single();
          return {
            nombre: perfilRival?.nombre ?? f.invitado_nombre,
            invitado: false,
            nivel: perfilRival?.nivel,
            puntosRanking: perfilRival?.puntos_ranking,
          };
        })
      );

      const gane = partido.resultados_partido?.ganador === miEquipo;
      setDatos({
        fechaHora: partido.fecha_hora,
        cancha: partido.cancha,
        gane,
        sets: formatoSets(partido.resultados_partido?.estado, miEquipo),
        d: estadisticasDeLado(partido.estadisticas_partido, miEquipo),
        puntosRankingGanados: calcularPuntosRanking(partido.resultados_partido?.estado, miEquipo, gane),
        rivales,
      });
      setCargando(false);
    }
    cargar();
  }, [partidoId, router]);

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("detalleEstadisticas.cargando")}</p>
      </div>
    );
  }

  if (noEncontrado || !datos) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-semibold">{t("detalleEstadisticas.titulo")}</h1>
          <button
            onClick={() => router.back()}
            className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
          >
            {t("detalleEstadisticas.volver")}
          </button>
        </div>
        <div className={`${tarjeta} text-sm text-muted`}>{t("detalleEstadisticas.noEncontrado")}</div>
      </div>
    );
  }

  const { d } = datos;

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t("detalleEstadisticas.titulo")}</h1>
        <button
          onClick={() => router.back()}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("detalleEstadisticas.volver")}
        </button>
      </div>

      <div className={tarjeta}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-heading font-semibold">
              {new Date(datos.fechaHora).toLocaleDateString(INTL_LOCALE[locale] ?? "es-AR")} · {datos.cancha}
            </span>
            <span className="text-sm text-muted">{datos.gane ? t("home.ganaste") : t("home.perdiste")}</span>
          </div>
          <IconoTrofeo width={22} height={22} className={datos.gane ? "" : "opacity-30"} />
        </div>
        {datos.sets && (
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-bg">
            <span className="text-xs text-muted">{t("estadisticas.resultadoPorSet")}</span>
            <span className="font-heading font-semibold tabular-nums">{datos.sets}</span>
          </div>
        )}
        {datos.puntosRankingGanados !== null && (
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-bg">
            <span className="text-xs text-muted">{t("estadisticas.puntosRankingGanados")}</span>
            <span className="font-heading font-semibold text-[#16a34a]">+{datos.puntosRankingGanados}</span>
          </div>
        )}
      </div>

      {datos.rivales.length > 0 && (
        <div className={`${tarjeta} flex flex-col gap-2`}>
          <span className="text-xs text-muted">
            {datos.rivales.length > 1 ? t("estadisticas.rivales") : t("estadisticas.rival")}
          </span>
          {datos.rivales.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-sm font-heading font-semibold">{r.nombre}</span>
              {r.invitado ? (
                <span className="text-xs text-muted">{t("estadisticas.invitado")}</span>
              ) : (
                <span className="text-xs text-muted">
                  {t("directorio.nivelPrefijo")} {r.nivel}ª · {r.puntosRanking} pts
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={`${tarjeta} grid grid-cols-2 gap-2`}>
        <Dato etiqueta={t("estadisticas.duracion")} valor={`${d.duracionMin} min`} />
        <Dato
          etiqueta={t("estadisticas.sacoPrimero")}
          valor={d.sacoPrimeroYo ? t("estadisticas.vos") : t("estadisticas.rival")}
        />
        <Dato etiqueta={t("estadisticas.rachaMaximaVosRival")} valor={`${d.racha} / ${d.rachaRival}`} />
        <Dato etiqueta={t("estadisticas.juegosADeuceCorto")} valor={d.juegosADeuce} />
      </div>

      <div className={`${tarjeta} flex flex-col gap-3`}>
        <BarraEstadistica
          etiqueta={t("estadisticas.puntosTotales")}
          valor={d.puntosPropios}
          total={d.puntosPropios + d.puntosRival}
          texto={`${d.puntosPropios} - ${d.puntosRival}`}
          info={t("estadisticas.puntosTotalesInfo")}
        />
        <BarraEstadistica
          etiqueta={t("estadisticas.quiebresConvertidos")}
          valor={d.quiebresFavor}
          total={d.quiebresOpFavor}
          variante="bien"
          info={t("estadisticas.quiebresConvertidosInfo")}
        />
        <BarraEstadistica
          etiqueta={t("estadisticas.quiebresConcedidos")}
          valor={d.quiebresContra}
          total={d.quiebresOpContra}
          variante="mal"
          info={t("estadisticas.quiebresConcedidosInfo")}
        />
        <BarraEstadistica
          etiqueta={t("estadisticas.puntosJuegoConvertidos")}
          valor={d.puntosJuegoFavor}
          total={d.puntosJuegoOpFavor}
          variante="bien"
          info={t("estadisticas.puntosJuegoConvertidosInfo")}
        />
        <BarraEstadistica
          etiqueta={t("estadisticas.puntosJuegoConcedidos")}
          valor={d.puntosJuegoContra}
          total={d.puntosJuegoOpContra}
          variante="mal"
          info={t("estadisticas.puntosJuegoConcedidosInfo")}
        />
      </div>
    </div>
  );
}
