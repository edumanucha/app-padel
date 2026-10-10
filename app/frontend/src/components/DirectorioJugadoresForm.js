"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { leerPantalla, guardarPantalla } from "@/lib/cachePantalla";
import HojaAbajo from "@/components/HojaAbajo";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";
import ContadorNumero from "@/components/ContadorNumero";
import InfoEstadistica from "@/components/InfoEstadistica";
import TarjetasGruposRanking from "@/components/TarjetasGruposRanking";

import { IconoLupa } from "@/components/Icons";
// Rediseño Cartel (2026-10-01): etiqueta de sección chica, sin tarjetas
// (la lista va con líneas y el podio es la protagonista en verde tablero).
function Subtitulo({ children }) {
  return <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{children}</span>;
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

const inputClass = "rounded-[6px] bg-bg border border-ink/15 px-3 py-2 text-ink text-sm";

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
  // Rediseño Cartel (2026-10-01): dentro del bloque verde tablero, los
  // puntos van en número grande y la barra del 1° en amarillo; la medalla
  // queda como un puntito de color al lado del puesto.
  const esPrimero = puesto === 1;
  return (
    <button type="button" onClick={onClick} className="flex-1 min-w-0 flex flex-col items-center gap-1 cursor-pointer">
      <span className="text-xs font-semibold text-[#c4dad3] truncate max-w-full px-1">{jugador.nombre}</span>
      <span className={`font-numero font-bold leading-none ${esPrimero ? "text-[2.6rem]" : "text-[2.2rem]"}`}>
        <ContadorNumero valor={jugador.puntos_ranking} />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8fb6ae]">{t("directorio.pts")}</span>
      <div
        className={`w-full rounded-t-[6px] flex items-start justify-center pt-2 transition-all duration-700 ease-out overflow-hidden ${ esPrimero ? "bg-accent text-accent-ink" : "bg-[#0f2e29] text-[#eaf4f0]" }`}
        style={{ height: animar ? `${alturaPx}px` : "0px" }}
      >
        <span className="font-numero font-bold text-2xl leading-none flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: medalla.color }} aria-hidden />
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
  const [userId, setUserId] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroSexo, setFiltroSexo] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const cantidadFiltros = [filtroNombre.trim(), filtroNivel, filtroSexo].filter((v) => v !== "").length;
  // Ranking mensual (se reinicia solo, es el mes calendario actual) vs.
  // histórico (acumulado de por vida) -- 2026-09-13, a pedido del usuario.
  const [periodo, setPeriodo] = useState("mensual");
  // Selector Global / grupo (2026-10-03): con un grupo elegido, el ranking pasa a ser
  // solo entre sus miembros (ranking_grupo, 069_grupos_de_amigos.sql).
  const [grupos, setGrupos] = useState([]);
  const [grupoSel, setGrupoSel] = useState("global");
  const [gruposCargados, setGruposCargados] = useState(false);
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
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      setVerificandoSesion(false);
    }
    verificarSesion();
  }, [router]);

  useEffect(() => {
    if (verificandoSesion) return;
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificandoSesion, periodo, grupoSel]);

  // Mis grupos, para el selector (si la persona no está en ninguno, no se muestra).
  useEffect(() => {
    if (verificandoSesion) return;
    supabase.rpc("mis_grupos").then(({ data, error: errGrupos }) => {
      setGrupos(data ?? []);
      // Si la RPC falla no se muestran ni las tarjetas ni el cartel de "armá tu grupo".
      setGruposCargados(!errGrupos);
    });
  }, [verificandoSesion]);

  function elegirGrupo(id) {
    setGrupoSel(id);
    if (id !== "global" && periodo === "semanal") setPeriodo("mensual");
  }

  // `filtros`: opcional, para buscar con valores que todavía no llegaron
  // al estado (por ejemplo, recién limpiados).
  async function buscar(filtros) {
    const nombre = (filtros?.nombre ?? filtroNombre).trim();
    const nivel = filtros?.nivel ?? filtroNivel;
    const sexo = filtros?.sexo ?? filtroSexo;
    setError("");
    // Copia de la última vez (2026-09-30, optimización): solo para la
    // lista sin filtros, que es la que se ve al entrar.
    const enGrupo = grupoSel !== "global";
    const sinFiltros = enGrupo || (nombre === "" && nivel === "" && sexo === "");
    const claveCopia = enGrupo ? `jugadores_grupo_${grupoSel}_${periodo}` : `jugadores_${periodo}`;
    const copia = sinFiltros ? leerPantalla(claveCopia, userId) : null;
    if (copia) {
      setJugadores(copia);
      setCargando(false);
    } else {
      setCargando(true);
    }

    let data;
    let buscarError;
    if (enGrupo) {
      const r = await supabase.rpc("ranking_grupo", { p_grupo: grupoSel, p_periodo: periodo === "mensual" ? "mes" : "siempre" });
      buscarError = r.error;
      data = (r.data ?? []).map((x) => ({
        id: x.jugador_id,
        nombre: x.nombre,
        puntos_ranking: x.puntos,
        partidos_jugados: x.pj,
        porcentaje_victorias: x.pj > 0 ? Math.round((100 * x.pg) / x.pj) : 0,
        pg: x.pg,
        pp: x.pp,
        esGrupo: true,
      }));
    } else {
      ({ data, error: buscarError } = await supabase.rpc("listar_directorio_jugadores", {
        p_nombre: nombre === "" ? null : nombre,
        p_nivel: nivel === "" ? null : Number(nivel),
        p_sexo: sexo === "" ? null : sexo,
        p_periodo: periodo,
      }));
    }

    setCargando(false);

    if (buscarError) {
      setError(t("directorio.noSePudoCargar", { mensaje: buscarError.message }));
      return;
    }

    setJugadores(data ?? []);
    if (sinFiltros) guardarPantalla(claveCopia, userId, data ?? []);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setMostrarFiltros(false);
    buscar();
  }

  function limpiarFiltros() {
    setFiltroNombre("");
    setFiltroNivel("");
    setFiltroSexo("");
    setMostrarFiltros(false);
    buscar({ nombre: "", nivel: "", sexo: "" });
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
    <div className="w-full max-w-md flex flex-col gap-4 pantalla-grilla">
      <div className="flex items-center justify-between col-completa">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("directorio.titulo")}</h1>
        <div className="flex items-center gap-2">
        {grupoSel === "global" && (
        <button
          onClick={() => setMostrarFiltros(true)}
          className={`text-sm font-semibold px-3 py-1.5 rounded-[6px] border cursor-pointer ${ cantidadFiltros > 0 ? "bg-ink text-bg border-ink" : "border-ink/15 text-ink" }`}
        >
          <IconoLupa className="ico" aria-hidden /> {t("directorio.filtros")}
          {cantidadFiltros > 0 ? ` (${cantidadFiltros})` : ""}
        </button>
        )}
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("directorio.volver")}
        </button>
        </div>
      </div>

      {/* Filtros en hoja de abajo (2026-10-01, mismo estilo que las Opciones
          del Marcadorcito, a pedido del usuario): se abren con el botón
          "Filtros" de arriba y la lista del ranking queda con más lugar. */}
      {mostrarFiltros && (
        <HojaAbajo titulo={t("directorio.filtros")} onCerrar={() => setMostrarFiltros(false)} textoCerrar="✕">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
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
            {cantidadFiltros > 0 && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="text-sm font-semibold px-4 py-2 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
              >
                {t("directorio.limpiarFiltros")}
              </button>
            )}
            <button
              type="submit"
              disabled={cargando}
              className="font-titulo font-black uppercase text-xl px-4 py-3 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {cargando && <PelotaLoader />}
              {t("directorio.buscar")}
            </button>
          </form>
        </HojaAbajo>
      )}

      {error && <p className="text-red-600 text-sm col-completa">{error}</p>}

      <div className="flex flex-col gap-3">
        {/* D-32 (opción B): tarjetas de grupo con tu puesto en cada uno; sin
            grupos, cartel para armar el primero. */}
        {gruposCargados && (
          <TarjetasGruposRanking
            grupos={grupos}
            grupoSel={grupoSel}
            onElegir={elegirGrupo}
            periodo={periodo}
            userId={userId}
            t={t}
            router={router}
          />
        )}
        <span className="flex items-center gap-1">
          <Subtitulo>{t("directorio.ranking")}</Subtitulo>
          <InfoEstadistica
            texto={`${t("directorio.explicacionRanking")} El semanal y el mensual se reinician solos cada semana/mes; el histórico es la suma de toda la vida.`}
          />
        </span>

        {/* Rediseño Cartel (2026-10-01): el período va como pestañas con
            línea abajo, no como píldora. */}
        <div className="flex border-b border-ink/10">
          {(grupoSel === "global"
            ? [
                ["semanal", "Semanal"],
                ["mensual", "Mensual"],
                ["historico", "Histórico"],
              ]
            : [
                ["mensual", t("grupos.esteMes")],
                ["historico", t("grupos.siempre")],
              ]
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setPeriodo(valor)}
              className={`font-titulo font-extrabold uppercase text-lg leading-none px-3 pt-1 pb-2 -mb-px border-b-2 cursor-pointer ${ periodo === valor ? "border-ink text-ink" : "border-transparent text-muted" }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {grupoSel !== "global" && (
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("grupos.reglaPartidos")}</span>
        )}

        {!cargando && jugadores.length === 0 && (
          <div className="text-muted text-sm py-2">{t("directorio.sinResultados")}</div>
        )}

        {/* Rediseño Cartel (2026-10-01): el podio es la protagonista, en
            verde tablero con los puntos en números grandes. */}
        {jugadores.length > 0 && (
          <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] flex items-end justify-center gap-3 px-4 pt-4 overflow-hidden">
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

        {/* Rediseño Cartel (2026-10-01): del 4° para abajo, filas con línea
            (sin tarjetas), puesto y puntos en font-titulo. */}
        <div className="flex flex-col">
          {jugadores.slice(3).map((j, i) => {
            const maxPuntos = jugadores[0]?.puntos_ranking || 1;
            const pct = Math.round((j.puntos_ranking / maxPuntos) * 100);
            return (
              <button
                key={j.id}
                onClick={() => router.push(`/jugadores/${j.id}`)}
                className="lista-item-entra flex items-center gap-3 text-left cursor-pointer w-full py-3 border-b border-ink/10"
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <span className="w-9 flex-shrink-0 font-numero font-bold text-[1.75rem] leading-none text-muted">
                  {i + 4}
                </span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold truncate">{j.nombre}</span>
                  {j.esGrupo ? (
                    <span className="text-xs text-muted">
                      {j.partidos_jugados > 0 ? t("grupos.ganadosPerdidos", { g: j.pg, p: j.pp }) : t("directorio.sinPartidosJugados")}
                    </span>
                  ) : (
                    <>
                      <span className="text-xs text-muted">
                        {t("directorio.nivelPrefijo")} {etiquetaNivel(j.nivel, t)} · {manoHabilLabel(j.mano_habil, t)} ·{" "}
                        {sexoLabel(j.sexo, t)}
                      </span>
                      <span className="text-xs text-muted">
                        {j.partidos_jugados > 0
                          ? t("directorio.jugadosVictorias", { jugados: j.partidos_jugados, porcentaje: j.porcentaje_victorias })
                          : t("directorio.sinPartidosJugados")}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 w-20">
                  <span className="whitespace-nowrap flex items-baseline gap-1">
                    <span className="font-numero font-bold text-[1.75rem] leading-none">
                      <ContadorNumero valor={j.puntos_ranking} />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{t("directorio.pts")}</span>
                  </span>
                  <div className="w-full h-1 bg-ink/10 overflow-hidden">
                    <div
                      className="h-full bg-ink transition-all duration-700 ease-out"
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
