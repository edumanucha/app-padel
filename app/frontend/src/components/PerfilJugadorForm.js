"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import Logo from "@/components/Logo";
import { IconoMensaje, IconoTrofeo, IconoPersona, IconoMano, IconoPelota, IconoBandera, IconoDuo, IconoChevron, IconoPulgar, IconoEstrella } from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

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

// Perfil reducido de otro jugador (US-1.4 + US-3.5): mismos datos que ya
// se ven en el Directorio, sin teléfono ni otros datos de contacto -- eso
// solo se habilita compartiendo un partido y confirmando (US-2.6).
export default function PerfilJugadorForm({ jugadorId }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [jugador, setJugador] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [misPartidosAbiertos, setMisPartidosAbiertos] = useState([]);
  const [partidoElegido, setPartidoElegido] = useState("");
  const [invitando, setInvitando] = useState(false);
  const [mensajeInvitar, setMensajeInvitar] = useState("");
  const [partidosRanking, setPartidosRanking] = useState([]);
  const [mostrarPartidosRanking, setMostrarPartidosRanking] = useState(false);

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("ver_perfil_jugador", { p_id: jugadorId });
      setCargando(false);

      if (rpcError) {
        setError(t("perfilJugador.noSePudoCargar", { mensaje: rpcError.message }));
        return;
      }
      setJugador(data?.[0] ?? null);

      const { data: partidosRankingData } = await supabase.rpc("listar_partidos_ranking_jugador", { p_id: jugadorId });
      setPartidosRanking(partidosRankingData ?? []);

      // US-3.5: invitar a este jugador a uno de mis partidos abiertos con
      // lugar, mismo mecanismo de invitación que US-2.3 (InvitarJugadorForm).
      const { data: partidos } = await supabase
        .from("partidos")
        .select("id, fecha_hora, cancha, cantidad_jugadores, lugares_ocupados")
        .eq("organizador_id", user.id)
        .eq("estado", "abierto")
        .order("fecha_hora", { ascending: true });
      const conLugar = (partidos ?? []).filter((p) => p.lugares_ocupados < p.cantidad_jugadores);
      setMisPartidosAbiertos(conLugar);
      if (conLugar.length > 0) setPartidoElegido(conLugar[0].id);
    }
    cargar();
  }, [jugadorId, router]);

  // US-7.1: marcar/desmarcar como frecuente -- para que aparezca primero
  // al buscar a quién invitar (ver InvitarJugadorForm.js).
  async function handleToggleFrecuente() {
    const {
      data: { user },
    } = await usuarioRapido();
    if (!user) return;

    if (jugador.es_frecuente) {
      await supabase
        .from("jugadores_frecuentes")
        .delete()
        .eq("jugador_id", user.id)
        .eq("frecuente_id", jugadorId);
    } else {
      await supabase.from("jugadores_frecuentes").insert({ jugador_id: user.id, frecuente_id: jugadorId });
    }
    setJugador((j) => ({ ...j, es_frecuente: !j.es_frecuente }));
  }

  // Kudos por partido (2026-09-13, a pedido del usuario): toggle simple --
  // si ya le di, lo saco (unique constraint compuesta en kudos_partido
  // hace de "ya existe" natural, así que insert/delete directo sin RPC).
  async function handleToggleKudos(partidoId) {
    const {
      data: { user },
    } = await usuarioRapido();
    if (!user) return;

    const fila = partidosRanking.find((p) => p.partido_id === partidoId);
    const yaDi = fila?.ya_di_kudos;

    setPartidosRanking((filas) =>
      filas.map((p) =>
        p.partido_id === partidoId
          ? { ...p, ya_di_kudos: !yaDi, kudos_count: p.kudos_count + (yaDi ? -1 : 1) }
          : p
      )
    );

    if (yaDi) {
      await supabase
        .from("kudos_partido")
        .delete()
        .match({ partido_id: partidoId, jugador_id: jugadorId, de_jugador_id: user.id });
    } else {
      await supabase
        .from("kudos_partido")
        .insert({ partido_id: partidoId, jugador_id: jugadorId, de_jugador_id: user.id });
    }
  }

  async function handleInvitar() {
    if (!partidoElegido) return;
    setInvitando(true);
    setMensajeInvitar("");

    const { error: invitarError } = await supabase
      .from("partido_jugadores")
      .insert({ partido_id: partidoElegido, jugador_id: jugadorId, estado: "invitado" });

    setInvitando(false);

    if (invitarError) {
      setMensajeInvitar(t("perfilJugador.noSePudoInvitar", { mensaje: invitarError.message }));
      return;
    }
    setMensajeInvitar(t("perfilJugador.invitacionEnviada"));
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("perfilJugador.cargando")}</p>
      </div>
    );
  }

  // Rediseño Cartel (2026-10-01): sin tarjeta de fondo. Nombre grande,
  // números grandes con divisores, el "con / contra / compatibilidad" como
  // protagonista en verde tablero y el botón de invitar como único amarillo.
  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("perfilJugador.titulo")}</h1>
        <button
          onClick={() => router.push("/jugadores")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("perfilJugador.volver")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {jugador && (
        <>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full border border-ink/10 bg-bg overflow-hidden flex items-center justify-center flex-shrink-0">
              {jugador.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={jugador.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Logo size={32} />
              )}
            </div>
            <span className="font-titulo font-black uppercase text-[2.6rem] leading-[0.9] flex-1 min-w-0 break-words">
              {jugador.nombre}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleToggleFrecuente}
                title={jugador.es_frecuente ? t("perfilJugador.desmarcarFrecuente") : t("perfilJugador.marcarFrecuente")}
                className="w-9 h-9 flex items-center justify-center text-xl cursor-pointer"
              >
                <IconoEstrella llena={jugador.es_frecuente} className="ico text-accent" aria-hidden />
              </button>
              <button
                onClick={() => router.push(`/mensajes/${jugadorId}`)}
                title={t("perfilJugador.enviarMensaje")}
                className="w-9 h-9 flex items-center justify-center rounded-[6px] border border-ink/15 text-ink cursor-pointer"
              >
                <IconoMensaje width={16} height={16} />
              </button>
            </div>
          </div>

          {/* Números grandes con divisores, como en el Inicio. */}
          <div className="grid grid-cols-3">
            <div className="flex flex-col py-1 min-w-0">
              <span className="font-titulo font-black text-[2.4rem] leading-none flex items-center gap-1">
                <IconoTrofeo width={18} height={18} aria-hidden />
                {jugador.puntos_ranking}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                {t("perfilJugador.ranking")} · {t("directorio.pts")}
              </span>
            </div>
            <div className="flex flex-col py-1 pl-3 border-l border-ink/15 min-w-0">
              <span className="font-titulo font-black text-[2.4rem] leading-none">
                {t("directorio.opcionNivelGenerica", { n: jugador.nivel })}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                {t("perfilJugador.nivelTemplate", { etiqueta: etiquetaNivel(jugador.nivel, t) })}
              </span>
              <span className="flex flex-wrap gap-0.5 text-[11px] leading-none overflow-hidden mt-1">
                {Array.from({ length: 8 - jugador.nivel }).map((_, i) => (
                  <IconoEstrella key={`llena-${i}`} llena className="ico text-accent" aria-hidden />
                ))}
                {Array.from({ length: jugador.nivel - 1 }).map((_, i) => (
                  <IconoEstrella key={`vacia-${i}`} className="ico text-muted" aria-hidden />
                ))}
              </span>
            </div>
            <div className="flex flex-col py-1 pl-3 border-l border-ink/15 min-w-0">
              <span className="font-titulo font-black text-[2.4rem] leading-none">{jugador.partidos_jugados}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                {jugador.partidos_jugados > 0
                  ? t("perfilJugador.partidosVictorias", { jugados: jugador.partidos_jugados, porcentaje: jugador.porcentaje_victorias })
                  : t("perfilJugador.sinPartidos")}
              </span>
            </div>
          </div>

          {/* La protagonista: cuánto jugaste con/contra esta persona. */}
          {(jugador.veces_con > 0 || jugador.veces_contra > 0) && (
            <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-4 flex flex-col gap-2">
              {jugador.compatibilidad_pct != null && (
                <span className="font-titulo font-extrabold uppercase text-[1.7rem] leading-none flex items-center gap-2">
                  <IconoDuo width={22} height={22} aria-hidden /> {t("perfilJugador.compatibilidad", { pct: jugador.compatibilidad_pct })}
                </span>
              )}
              {jugador.veces_con > 0 && <span className="text-sm text-[#c4dad3]">{t("perfilJugador.vecesCon", { n: jugador.veces_con })}</span>}
              {jugador.veces_contra > 0 && <span className="text-sm text-[#c4dad3]">{t("perfilJugador.vecesContra", { n: jugador.veces_contra })}</span>}
            </div>
          )}

          {/* Datos secundarios como filas con línea, no cajitas. */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2 py-2 border-b border-ink/10 text-sm">
              <span className="text-muted flex items-center gap-1.5">
                <IconoPersona width={14} height={14} /> {t("perfilJugador.sexo")}
              </span>
              <span className="font-semibold">{sexoLabel(jugador.sexo, t)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 py-2 border-b border-ink/10 text-sm">
              <span className="text-muted flex items-center gap-1.5">
                <IconoMano width={14} height={14} /> {t("perfilJugador.manoHabil")}
              </span>
              <span className="font-semibold">{manoHabilLabel(jugador.mano_habil, t)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 py-2 border-b border-ink/10 text-sm">
              <span className="text-muted flex items-center gap-1.5">
                <IconoPelota width={14} height={14} /> {t("perfilJugador.posicion")}
              </span>
              <span className="font-semibold">{jugador.posicion === "reves" ? t("companero.reves") : t("companero.drive")}</span>
            </div>
            {jugador.no_shows > 0 && (
              <div className="flex items-center justify-between gap-2 py-2 border-b border-ink/10 text-sm">
                <span className="text-muted flex items-center gap-1.5">
                  <IconoBandera width={14} height={14} /> {t("perfilJugador.noShows")}
                </span>
                <span className="font-semibold">{jugador.no_shows}</span>
              </div>
            )}
          </div>

          {partidosRanking.length > 0 && (
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setMostrarPartidosRanking((v) => !v)}
                className="w-full text-left flex items-center justify-between gap-2 cursor-pointer py-2 border-b border-ink/10"
              >
                <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                  Partidos y puntos de ranking
                </span>
                <IconoChevron
                  width={16}
                  height={16}
                  className={`transition-transform flex-shrink-0 ${mostrarPartidosRanking ? "rotate-180" : ""}`}
                />
              </button>

              {mostrarPartidosRanking && (
                <div className="flex flex-col">
                  {partidosRanking.map((p, i) => (
                    <div
                      key={p.partido_id}
                      className="lista-item-entra flex items-center justify-between gap-2 text-sm py-2 border-b border-ink/10"
                      style={{ animationDelay: `${i * 35}ms` }}
                    >
                      <span className="text-muted">
                        {new Date(p.fecha_hora).toLocaleDateString(INTL_LOCALE[locale] ?? "es-AR")} · {p.cancha}
                      </span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-titulo font-black text-xl leading-none">+{p.puntos_ranking} pts</span>
                        <button
                          type="button"
                          onClick={() => handleToggleKudos(p.partido_id)}
                          title="Felicitar este partido"
                          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-[6px] cursor-pointer ${ p.ya_di_kudos ? "bg-accent-2 text-accent-2-ink" : "border border-ink/15 text-muted" }`}
                        >
                          <IconoPulgar width={13} height={13} />
                          {p.kudos_count > 0 ? p.kudos_count : ""}
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted">{t("perfilJugador.telefonoAviso")}</p>

          {/* Invitar: el único botón amarillo de la pantalla. */}
          {misPartidosAbiertos.length > 0 && (
            <div className="flex flex-col gap-2 pt-3 border-t border-ink/10">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("perfilJugador.invitarAUno")}</span>
              <select
                value={partidoElegido}
                onChange={(e) => setPartidoElegido(e.target.value)}
                className="rounded-[6px] bg-bg border border-ink/15 px-3 py-2 text-sm text-ink"
              >
                {misPartidosAbiertos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {new Date(p.fecha_hora).toLocaleString(INTL_LOCALE[locale] ?? "es-AR")} · {p.cancha}
                  </option>
                ))}
              </select>
              <button
                onClick={handleInvitar}
                disabled={invitando}
                className="font-titulo font-black uppercase text-[1.4rem] leading-none px-4 py-4 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {invitando && <PelotaLoader />}
                {t("perfilJugador.invitar")}
              </button>
              {mensajeInvitar && <span className="text-xs text-muted">{mensajeInvitar}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
