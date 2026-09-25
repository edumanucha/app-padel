"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";
import ContadorNumero from "@/components/ContadorNumero";
import InfoEstadistica from "@/components/InfoEstadistica";

const tarjeta = "bg-surface text-ink rounded-[18px] p-4 shadow-[0_1px_3px_rgba(20,38,31,0.08)]";

function Subtitulo({ children }) {
  return <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">{children}</span>;
}

const NIVELES_VALORES = [1, 2, 3, 4, 5, 6, 7];

function etiquetaNivel(n, t) {
  if (n === 1) return t("directorio.opcionNivelMaxima");
  if (n === 7) return t("directorio.opcionNivelMinima");
  return t("directorio.opcionNivelGenerica", { n });
}

function manoHabilLabel(v, t) {
  if (v === "diestro") return t("directorio.diestro");
  if (v === "zurdo") return t("directorio.zurdo");
  return v;
}

function sexoLabel(v, t) {
  if (v === "masculino") return t("directorio.masculino");
  if (v === "femenino") return t("directorio.femenino");
  return v;
}

const inputClass = "rounded-xl bg-bg px-3 py-2 text-ink text-sm";

// Podio visual para el top 3 (2026-09-13, a pedido del usuario: "quiero
// que sea diferencial" -- una lista plana no transmite que hay un podio
// semanal/mensual que se disputa de verdad). Colores de medalla reales
// (oro/plata/bronce) por puesto, pero la ALTURA es proporcional a los
// puntos de verdad (no fija por puesto -- si el 2° y el 3° están muy
// cerca en puntos, tienen que verse casi igual de altos; si el 1° les
// saca mucha diferencia, tiene que notarse). Anima de 0 a su altura real
// igual que las barras de la lista de abajo (misma `animar`/`barrasListas`).
const ALTURA_MAX_PODIO_PX = 96;
const MEDALLAS = [
  { color: "#d4af37", texto: "#3a2c05" }, // 1°
  { color: "#b9bfc7", texto: "#2c3136" }, // 2°
  { color: "#c98a4b", texto: "#3a2408" }, // 3°
];

function ColumnaPodio({ jugador, puesto, maxPuntos, animar, onClick, t }) {
  const medalla = MEDALLAS[puesto - 1];
  if (!jugador) return <div className="flex-1" />;
  const alturaPx = Math.round((jugador.puntos_ranking / maxPuntos) * ALTURA_MAX_PODIO_PX);
  return (
    <button type="button" onClick={onClick} className="flex-1 min-w-0 flex flex-col items-center gap-1 cursor-pointer">
      <span className="font-heading font-semibold text-xs truncate max-w-full px-1">{jugador.nombre}</span>
      <span className="text-[11px] text-muted">
        <ContadorNumero valor={jugador.puntos_ranking} /> {t("directorio.pts")}
      </span>
      <div
        className="w-full rounded-t-[14px] flex items-start justify-center pt-2 transition-all duration-700 ease-out"
        style={{ background: medalla.color, height: animar ? `${alturaPx}px` : "0px" }}
      >
        <span className="font-heading font-bold text-xl" style={{ color: medalla.texto }}>
          {puesto}
        </span>
      </div>
    </button>
  );
}

// Directorio de jugadores (US-3.5): lista filtrable y ordenada por ranking
// de puntos (US-3.1), de cualquier jugador activo -- ya no hace falta
// compartir un partido para ver esta vista reducida (resuelve la pregunta
// abierta de privacidad de US-1.4).
export default function DirectorioJugadoresForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroSexo, setFiltroSexo] = useState("");
  // Ranking mensual (se reinicia solo, es el mes calendario actual) vs.
  // histórico (acumulado de por vida) -- 2026-09-13, a pedido del usuario.
  const [periodo, setPeriodo] = useState("mensual");
  // Barras de puntos proporcionales al máximo de la lista, animadas desde
  // 0 (2026-09-13, a pedido del usuario) -- arrancan en 0% y un instante
  // después pasan a su ancho real, para que la transición CSS se vea.
  // Se resetea cada vez que cambia la lista (nueva búsqueda/período), así
  // vuelve a contar de cero en vez de quedar "clavada" en su ancho previo.
  const [barrasListas, setBarrasListas] = useState(false);
  // Ojo: resetear a 0 tiene que pasar DURANTE el render (no en un
  // useEffect aparte) -- si no, hay un frame donde ya se pintó el ancho
  // NUEVO con el `barrasListas` VIEJO (todavía true), y se ve un
  // parpadeo "salta al valor -> vuelve a 0 -> crece" en vez de crecer
  // derecho desde 0. Este patrón (setState en medio del render cuando
  // cambia una dependencia) es el que React recomienda para date así.
  const jugadoresAnteriorRef = useRef(jugadores);
  if (jugadoresAnteriorRef.current !== jugadores) {
    jugadoresAnteriorRef.current = jugadores;
    if (barrasListas) setBarrasListas(false);
  }
  useEffect(() => {
    if (barrasListas) return;
    const id = setTimeout(() => setBarrasListas(true), 50);
    return () => clearTimeout(id);
  }, [barrasListas]);

  useEffect(() => {
    async function verificarSesion() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setVerificandoSesion(false);
    }
    verificarSesion();
  }, [router]);

  useEffect(() => {
    if (verificandoSesion) return;
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificandoSesion, periodo]);

  async function buscar() {
    setCargando(true);
    setError("");

    const { data, error: buscarError } = await supabase.rpc("listar_directorio_jugadores", {
      p_nombre: filtroNombre.trim() === "" ? null : filtroNombre.trim(),
      p_nivel: filtroNivel === "" ? null : Number(filtroNivel),
      p_sexo: filtroSexo === "" ? null : filtroSexo,
      p_periodo: periodo,
    });

    setCargando(false);

    if (buscarError) {
      setError(t("directorio.noSePudoCargar", { mensaje: buscarError.message }));
      return;
    }

    setJugadores(data ?? []);
  }

  function handleSubmit(e) {
    e.preventDefault();
    buscar();
  }

  if (verificandoSesion) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("directorio.cargando")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t("directorio.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("directorio.volver")}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <Subtitulo>{t("directorio.filtros")}</Subtitulo>
        <form onSubmit={handleSubmit} className={`${tarjeta} flex flex-col gap-2`}>
          <input
            type="text"
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
            placeholder={t("directorio.buscarPorNombre")}
            className={inputClass}
          />
          <div className="flex gap-2">
            <select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)} className={`${inputClass} flex-1`}>
              <option value="">{t("directorio.todosLosNiveles")}</option>
              {NIVELES_VALORES.map((n) => (
                <option key={n} value={n}>
                  {etiquetaNivel(n, t)}
                </option>
              ))}
            </select>
            <select value={filtroSexo} onChange={(e) => setFiltroSexo(e.target.value)} className={`${inputClass} flex-1`}>
              <option value="">{t("directorio.todos")}</option>
              <option value="masculino">{t("directorio.masculino")}</option>
              <option value="femenino">{t("directorio.femenino")}</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {cargando && <PelotaLoader />}
            {t("directorio.buscar")}
          </button>
        </form>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex flex-col gap-3">
        <span className="flex items-center gap-1 pl-1">
          <Subtitulo>{t("directorio.ranking")}</Subtitulo>
          <InfoEstadistica
            texto={`${t("directorio.explicacionRanking")} El semanal y el mensual se reinician solos cada semana/mes; el histórico es la suma de toda la vida.`}
          />
        </span>

        <div className="flex bg-bg rounded-full p-1 gap-1 self-start">
          {[
            ["semanal", "Semanal"],
            ["mensual", "Mensual"],
            ["historico", "Histórico"],
          ].map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setPeriodo(valor)}
              className={`font-heading font-semibold text-xs px-3 py-1.5 rounded-full cursor-pointer ${
                periodo === valor ? "bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.12)]" : "text-muted"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {!cargando && jugadores.length === 0 && (
          <div className={`${tarjeta} text-muted text-sm`}>{t("directorio.sinResultados")}</div>
        )}

        {jugadores.length > 0 && (
          <div className={`${tarjeta} flex items-end justify-center gap-3 pt-4`}>
            <ColumnaPodio
              jugador={jugadores[1]}
              puesto={2}
              maxPuntos={jugadores[0]?.puntos_ranking || 1}
              animar={barrasListas}
              onClick={() => router.push(`/jugadores/${jugadores[1].id}`)}
              t={t}
            />
            <ColumnaPodio
              jugador={jugadores[0]}
              puesto={1}
              maxPuntos={jugadores[0]?.puntos_ranking || 1}
              animar={barrasListas}
              onClick={() => router.push(`/jugadores/${jugadores[0].id}`)}
              t={t}
            />
            <ColumnaPodio
              jugador={jugadores[2]}
              puesto={3}
              maxPuntos={jugadores[0]?.puntos_ranking || 1}
              animar={barrasListas}
              onClick={() => router.push(`/jugadores/${jugadores[2].id}`)}
              t={t}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          {jugadores.slice(3).map((j, i) => {
            const maxPuntos = jugadores[0]?.puntos_ranking || 1;
            const pct = Math.round((j.puntos_ranking / maxPuntos) * 100);
            return (
              <button
                key={j.id}
                onClick={() => router.push(`/jugadores/${j.id}`)}
                className={`${tarjeta} lista-item-entra flex items-center gap-3 text-left cursor-pointer w-full`}
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-heading font-semibold text-sm bg-bg text-muted">
                  {i + 4}
                </span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-heading font-semibold truncate">{j.nombre}</span>
                  <span className="text-xs text-muted">
                    {t("directorio.nivelPrefijo")} {etiquetaNivel(j.nivel, t)} · {manoHabilLabel(j.mano_habil, t)} ·{" "}
                    {sexoLabel(j.sexo, t)}
                  </span>
                  <span className="text-xs text-muted">
                    {j.partidos_jugados > 0
                      ? t("directorio.jugadosVictorias", { jugados: j.partidos_jugados, porcentaje: j.porcentaje_victorias })
                      : t("directorio.sinPartidosJugados")}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 w-20">
                  <span className="font-heading font-semibold text-sm text-accent-2-ink whitespace-nowrap">
                    <ContadorNumero valor={j.puntos_ranking} /> {t("directorio.pts")}
                  </span>
                  <div className="w-full h-1.5 rounded-full bg-bg overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-2 transition-all duration-700 ease-out"
                      style={{ width: barrasListas ? `${pct}%` : "0%" }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
