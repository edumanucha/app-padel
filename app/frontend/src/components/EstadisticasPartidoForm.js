"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import BarraEstadistica from "@/components/BarraEstadistica";
import { IconoTrofeo } from "@/components/Icons";
import BotonCompartirTarjeta from "@/components/BotonCompartirTarjeta";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/config";
import { estadisticasDeLado, formatoSets, calcularPuntosRanking } from "@/lib/estadisticasMarcadorcito";

// Rediseño Cartel (2026-10-01): cada dato es un número grande con la
// etiqueta abajo, sin cajita; los divisores los pone quien lo usa.
function Dato({ etiqueta, valor, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 py-3 ${className}`}>
      <span className="font-numero font-bold text-[2.2rem] leading-none tabular-nums">{valor}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{etiqueta}</span>
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
      } = await usuarioRapido();
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

      // Nombres (solo el primero) de mi pareja y de los rivales para la tarjeta
      // de compartir. perfiles solo deja leer la propia fila, así que los
      // nombres salen de ver_participantes_partido (como en el Marcadorcito).
      const { data: participantes } = await supabase.rpc("ver_participantes_partido", { p_partido_id: partidoId });
      const nombrePorId = Object.fromEntries((participantes ?? []).map((p) => [p.jugador_id, p.nombre]));
      const primerNombre = (f) =>
        String((f.jugador_id ? nombrePorId[f.jugador_id] : null) ?? f.invitado_nombre ?? "").trim().split(/\s+/)[0] || "?";
      const nombresDe = (equipo) => (todosLosJugadores ?? []).filter((f) => f.equipo === equipo).map(primerNombre);

      const gane = partido.resultados_partido?.ganador === miEquipo;
      setDatos({
        fechaHora: partido.fecha_hora,
        cancha: partido.cancha,
        gane,
        sets: formatoSets(partido.resultados_partido?.estado, miEquipo),
        d: estadisticasDeLado(partido.estadisticas_partido, miEquipo),
        puntosRankingGanados: calcularPuntosRanking(partido.resultados_partido?.estado, miEquipo, gane),
        rivales,
        nombresMios: nombresDe(miEquipo),
        nombresRivales: nombresDe(miEquipo === "A" ? "B" : "A"),
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
          <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("detalleEstadisticas.titulo")}</h1>
          <button
            onClick={() => router.back()}
            className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
          >
            {t("detalleEstadisticas.volver")}
          </button>
        </div>
        <p className="text-sm text-muted border-y border-ink/10 py-3">{t("detalleEstadisticas.noEncontrado")}</p>
      </div>
    );
  }

  const { d } = datos;

  return (
    <div className="w-full max-w-md flex flex-col gap-4 pantalla-mosaico">
      <div className="flex items-center justify-between col-completa">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("detalleEstadisticas.titulo")}</h1>
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("detalleEstadisticas.volver")}
        </button>
      </div>

      {/* Rediseño Cartel (2026-10-01): la protagonista es el resultado,
          en verde tablero con cada set como número grande; los puntos de
          ranking van como acento amarillo. */}
      <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">
              {new Date(datos.fechaHora).toLocaleDateString(INTL_LOCALE[locale] ?? "es-AR")} · {datos.cancha}
            </span>
            <span className="font-titulo font-black uppercase text-[2.2rem] leading-none">
              {datos.gane ? t("home.ganaste") : t("home.perdiste")}
            </span>
          </div>
          <IconoTrofeo width={26} height={26} className={datos.gane ? "flex-shrink-0" : "flex-shrink-0 opacity-30"} />
        </div>
        {datos.sets && (
          <div className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">{t("estadisticas.resultadoPorSet")}</span>
            <div className="flex">
              {datos.sets.split("  ·  ").map((set, i) => (
                <span
                  key={i}
                  className={`font-numero font-bold text-[2.6rem] leading-none tabular-nums pr-4 ${i > 0 ? "pl-4 border-l border-[#8fb6ae]/40" : ""}`}
                >
                  {set}
                </span>
              ))}
            </div>
          </div>
        )}
        {datos.puntosRankingGanados !== null && (
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#8fb6ae]/30">
            <span className="text-xs text-[#c4dad3]">{t("estadisticas.puntosRankingGanados")}</span>
            <span className="bg-accent text-accent-ink rounded-[6px] px-2.5 py-1 font-titulo font-black text-xl leading-none">
              +{datos.puntosRankingGanados}
            </span>
          </div>
        )}
      </div>

      {datos.nombresMios.length > 0 && datos.nombresRivales.length > 0 && (
        <BotonCompartirTarjeta
          gane={datos.gane}
          mios={datos.nombresMios}
          rivales={datos.nombresRivales}
          sets={datos.sets}
          fechaHora={datos.fechaHora}
          duracionMin={d.duracionMin}
          cancha={datos.cancha}
        />
      )}

      {datos.rivales.length > 0 && (
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted mb-1">
            {datos.rivales.length > 1 ? t("estadisticas.rivales") : t("estadisticas.rival")}
          </span>
          {datos.rivales.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-2.5 border-b border-ink/10">
              <span className="text-sm font-semibold">{r.nombre}</span>
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

      {/* Números grandes en grilla de 2 con divisores (líneas, no cajas). */}
      <div className="grid grid-cols-2 border-y border-ink/10">
        <Dato etiqueta={t("estadisticas.duracion")} valor={`${d.duracionMin} min`} className="pr-3" />
        <Dato
          etiqueta={t("estadisticas.sacoPrimero")}
          valor={d.sacoPrimeroYo ? t("estadisticas.vos") : t("estadisticas.rival")}
          className="pl-3 border-l border-ink/15 uppercase"
        />
        <Dato etiqueta={t("estadisticas.rachaMaximaVosRival")} valor={`${d.racha} / ${d.rachaRival}`} className="pr-3 border-t border-ink/10" />
        <Dato etiqueta={t("estadisticas.juegosADeuceCorto")} valor={d.juegosADeuce} className="pl-3 border-l border-t border-ink/15" />
      </div>

      <div className="flex flex-col [&>*]:py-3 [&>*]:border-b [&>*]:border-ink/10">
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
