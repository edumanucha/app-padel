"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { mensajeErrorGrupo } from "@/lib/gruposErrores";
import PelotaLoader from "@/components/PelotaLoader";
import HojaAbajo from "@/components/HojaAbajo";
import { useLocale } from "@/i18n/LocaleContext";

const TABS = ["ranking", "cara", "miembros"];

// Un grupo (2026-10-03, maqueta aprobada): ranking del grupo (este mes o
// siempre), cara a cara con cada compañero y rival, y miembros con las
// opciones de invitar (link de WhatsApp o jugadores de Padelito), salirse y,
// para el admin, sacar gente o borrar el grupo. Solo cuentan los partidos
// con 3 o más jugadores del grupo (regla en 069_grupos_de_amigos.sql).
export default function GrupoForm({ grupoId }) {
  const router = useRouter();
  const { t } = useLocale();
  const [yoId, setYoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState(null);
  const [tab, setTab] = useState("ranking");
  const [periodo, setPeriodo] = useState("mes");
  const [ranking, setRanking] = useState(null);
  const [cara, setCara] = useState(null);
  const [miembros, setMiembros] = useState(null);
  const [error, setError] = useState("");
  const [confirmar, setConfirmar] = useState(null); // { tipo: "salir" | "eliminar" | "sacar", jugador? }
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState(null);
  const [invitados, setInvitados] = useState([]);
  const [copiado, setCopiado] = useState(false);

  const cargarDatos = useCallback(async () => {
    const { data } = await supabase.rpc("datos_grupo", { p_grupo: grupoId });
    setDatos(data?.[0] ?? null);
    setCargando(false);
  }, [grupoId]);

  useEffect(() => {
    async function iniciar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }
      setYoId(user.id);
      cargarDatos();
    }
    iniciar();
  }, [router, cargarDatos]);

  const cargarMiembros = useCallback(async () => {
    const { data } = await supabase.rpc("miembros_grupo", { p_grupo: grupoId });
    setMiembros(data ?? []);
  }, [grupoId]);

  // Carga lo de la pestaña abierta.
  useEffect(() => {
    if (!datos) return;
    async function cargarTab() {
      if (tab === "ranking") {
        const { data } = await supabase.rpc("ranking_grupo", { p_grupo: grupoId, p_periodo: periodo });
        setRanking(data ?? []);
      } else if (tab === "cara") {
        const { data } = await supabase.rpc("cara_a_cara_grupo", { p_grupo: grupoId });
        setCara(data ?? []);
      } else {
        cargarMiembros();
      }
    }
    cargarTab();
  }, [datos, tab, periodo, grupoId, cargarMiembros]);

  async function ejecutarConfirmacion() {
    const c = confirmar;
    setConfirmar(null);
    setError("");
    let rpcError = null;
    if (c.tipo === "salir") ({ error: rpcError } = await supabase.rpc("salir_del_grupo", { p_grupo: grupoId }));
    if (c.tipo === "eliminar") ({ error: rpcError } = await supabase.rpc("eliminar_grupo", { p_grupo: grupoId }));
    if (c.tipo === "sacar") ({ error: rpcError } = await supabase.rpc("sacar_del_grupo", { p_grupo: grupoId, p_jugador: c.jugador.jugador_id }));
    if (rpcError) {
      setError(mensajeErrorGrupo(rpcError, t));
      return;
    }
    if (c.tipo === "sacar") {
      cargarMiembros();
      cargarDatos();
    } else {
      router.replace("/grupos");
    }
  }

  const link = datos?.codigo && typeof window !== "undefined" ? `${window.location.origin}/g/${datos.codigo}` : "";

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // sin permiso para copiar: el link queda visible para copiarlo a mano
    }
  }

  async function buscarJugadores(e) {
    e.preventDefault();
    setError("");
    const { data, error: rpcError } = await supabase.rpc("buscar_jugadores", { p_termino: termino.trim() });
    if (rpcError) {
      setError(t("grupos.errGenerico"));
      return;
    }
    const yaMiembros = new Set((miembros ?? []).map((m) => m.jugador_id));
    setResultados((data ?? []).filter((j) => !yaMiembros.has(j.id)));
  }

  async function invitar(jugadorId) {
    setError("");
    const { error: rpcError } = await supabase.rpc("invitar_a_grupo", { p_grupo: grupoId, p_jugador: jugadorId });
    if (rpcError) {
      setError(mensajeErrorGrupo(rpcError, t));
      return;
    }
    setInvitados((prev) => [...prev, jugadorId]);
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("grupos.cargando")}</p>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("grupos.titulo")}</h1>
          <button onClick={() => router.push("/grupos")} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">
            {t("grupos.volver")}
          </button>
        </div>
        <p className="text-sm text-muted border-y border-ink/10 py-3">{t("grupos.noEncontrado")}</p>
      </div>
    );
  }

  const nombreTab = { ranking: t("grupos.tabRanking"), cara: t("grupos.tabCara"), miembros: t("grupos.tabMiembros") };

  return (
    <div className="w-full max-w-md flex flex-col gap-4 text-ink">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95] min-w-0 break-words">{datos.nombre}</h1>
        <button
          onClick={() => router.push("/grupos")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer flex-shrink-0"
        >
          {t("grupos.volver")}
        </button>
      </div>

      <div className="grid grid-cols-3 border-b-2 border-ink" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`font-titulo font-extrabold uppercase text-base py-2.5 cursor-pointer border-b-4 -mb-0.5 ${
              tab === id ? "border-accent text-ink" : "border-transparent text-muted"
            }`}
          >
            {nombreTab[id]}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#dc2626]">
          {error}
        </p>
      )}

      {tab === "ranking" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            {[
              ["mes", t("grupos.esteMes")],
              ["siempre", t("grupos.siempre")],
            ].map(([id, texto]) => (
              <button
                key={id}
                onClick={() => setPeriodo(id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-[6px] border cursor-pointer ${
                  periodo === id ? "bg-ink text-bg border-ink" : "border-ink/15"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("grupos.reglaPartidos")}</span>
          {ranking === null ? (
            <PelotaLoader />
          ) : (
            <div className="flex flex-col border-t border-ink/10">
              {ranking.map((r, i) => {
                const soyYo = r.jugador_id === yoId;
                return (
                  <div
                    key={r.jugador_id}
                    className={`grid grid-cols-[1.6rem_1fr_auto_auto] items-center gap-3 py-2.5 border-b border-ink/10 ${soyYo ? "bg-accent/25 -mx-2 px-2 rounded-[4px]" : ""}`}
                  >
                    <span className="font-numero font-bold text-sm text-muted">{i + 1}</span>
                    <span className="font-semibold truncate">{soyYo ? t("grupos.vos", { nombre: r.nombre }) : r.nombre}</span>
                    <span className="text-xs text-muted">
                      {r.pg}-{r.pp}
                    </span>
                    <span className="font-numero font-bold min-w-[2.6rem] text-right">{r.puntos}</span>
                  </div>
                );
              })}
              {ranking.every((r) => r.pj === 0) && <p className="text-sm text-muted pt-3">{t("grupos.sinPartidos")}</p>}
            </div>
          )}
        </div>
      )}

      {tab === "cara" && <CaraACara cara={cara} t={t} />}

      {tab === "miembros" && (
        <div className="flex flex-col gap-5">
          {datos.es_admin && datos.codigo && (
            <div className="flex flex-col gap-3">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">
                {t("grupos.invitarTitulo")}
              </span>
              <div className="rounded-[8px] border border-ink/15 p-3 flex flex-col gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("grupos.linkTitulo")}</span>
                <span className="font-numero text-xs bg-bg rounded-[6px] px-2.5 py-2 break-all">{link}</span>
                <div className="flex gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(t("grupos.mensajeWhatsapp", { nombre: datos.nombre, link }))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center rounded-[6px] bg-accent text-accent-ink font-titulo font-black uppercase text-lg py-2 cursor-pointer"
                  >
                    {t("grupos.whatsapp")}
                  </a>
                  <button onClick={copiarLink} className="text-sm font-semibold px-3 rounded-[6px] border border-ink/15 cursor-pointer">
                    {copiado ? t("grupos.copiado") : t("grupos.copiar")}
                  </button>
                </div>
              </div>

              <form onSubmit={buscarJugadores} className="flex gap-2">
                <input
                  id="buscar-jugador-grupo"
                  value={termino}
                  onChange={(e) => setTermino(e.target.value)}
                  placeholder={t("grupos.buscarJugador")}
                  className="flex-1 min-w-0 rounded-[6px] border border-ink/20 bg-bg px-3 py-2 text-sm"
                />
                <button type="submit" disabled={termino.trim().length < 2} className="text-sm font-semibold px-3 rounded-[6px] border border-ink/15 cursor-pointer disabled:opacity-50">
                  {t("grupos.buscar")}
                </button>
              </form>
              {resultados && resultados.length === 0 && <p className="text-sm text-muted">{t("grupos.sinResultados")}</p>}
              {resultados?.map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-3 py-2 border-b border-ink/10">
                  <span className="font-semibold">{j.nombre}</span>
                  {invitados.includes(j.id) ? (
                    <span className="text-xs text-muted">{t("grupos.invitado")}</span>
                  ) : (
                    <button onClick={() => invitar(j.id)} className="text-sm font-bold px-3 py-1 rounded-[6px] bg-accent text-accent-ink cursor-pointer">
                      {t("grupos.invitar")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">
              {t("grupos.miembrosTitulo", { n: datos.miembros })}
            </span>
            {miembros === null ? (
              <PelotaLoader />
            ) : (
              miembros.map((m) => (
                <div key={m.jugador_id} className="flex items-center justify-between gap-3 py-3 border-b border-ink/10">
                  <span className="font-semibold min-w-0 truncate">
                    {m.jugador_id === yoId ? t("grupos.vos", { nombre: m.nombre }) : m.nombre}
                    {m.es_admin && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.1em] bg-ink text-bg px-1.5 py-0.5 rounded-[4px]">
                        {t("grupos.admin")}
                      </span>
                    )}
                  </span>
                  {datos.es_admin && m.jugador_id !== yoId && (
                    <button
                      onClick={() => setConfirmar({ tipo: "sacar", jugador: m })}
                      className="text-xs font-semibold text-[#dc2626] px-2 py-1 cursor-pointer"
                    >
                      {t("grupos.sacar")}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={() => setConfirmar({ tipo: "salir" })} className="w-full rounded-[6px] border border-ink/15 font-semibold py-2.5 cursor-pointer">
              {t("grupos.salir")}
            </button>
            {datos.es_admin && (
              <button onClick={() => setConfirmar({ tipo: "eliminar" })} className="w-full text-sm font-semibold text-[#dc2626] py-2 cursor-pointer">
                {t("grupos.eliminar")}
              </button>
            )}
          </div>
        </div>
      )}

      {confirmar && (
        <HojaAbajo
          titulo={
            confirmar.tipo === "salir"
              ? t("grupos.salirTitulo", { nombre: datos.nombre })
              : confirmar.tipo === "eliminar"
                ? t("grupos.eliminarTitulo", { nombre: datos.nombre })
                : t("grupos.sacar")
          }
          onCerrar={() => setConfirmar(null)}
          textoCerrar={`${t("grupos.cancelar")} ✕`}
        >
          <p className="text-sm text-muted">
            {confirmar.tipo === "salir" ? t("grupos.salirTexto") : confirmar.tipo === "eliminar" ? t("grupos.eliminarTexto") : confirmar.jugador.nombre}
          </p>
          <button onClick={ejecutarConfirmacion} className="rounded-[6px] bg-[#dc2626] text-white font-titulo font-black uppercase text-xl py-2.5 cursor-pointer">
            {confirmar.tipo === "salir" ? t("grupos.salirConfirmar") : confirmar.tipo === "eliminar" ? t("grupos.eliminarConfirmar") : t("grupos.sacar")}
          </button>
        </HojaAbajo>
      )}
    </div>
  );
}

// Cara a cara: un cartel con "tu rival del grupo" y, debajo, cada jugador con
// cuántos ganan juntos y cuántos le ganaste enfrentados.
function CaraACara({ cara, t }) {
  if (cara === null) return <PelotaLoader />;
  if (cara.length === 0) return <p className="text-sm text-muted border-y border-ink/10 py-3">{t("grupos.sinPartidos")}</p>;

  const conContra = cara.filter((f) => f.pj_contra >= 1);
  const base = conContra.filter((f) => f.pj_contra >= 2);
  const lista = base.length > 0 ? base : conContra;
  const rival = [...lista].sort((a, b) => a.pg_contra / a.pj_contra - b.pg_contra / b.pj_contra || b.pj_contra - a.pj_contra)[0];
  const frase = rival
    ? rival.pg_contra / rival.pj_contra < 0.5
      ? t("grupos.teViene", { nombre: rival.nombre })
      : rival.pg_contra / rival.pj_contra > 0.5
        ? t("grupos.leVenis", { nombre: rival.nombre })
        : t("grupos.parejo", { nombre: rival.nombre })
    : null;

  return (
    <div className="flex flex-col gap-4">
      {rival && (
        <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-4 flex flex-col gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">{t("grupos.rivalTitulo")}</span>
          <span className="font-titulo font-extrabold uppercase text-[1.7rem] leading-none">{frase}</span>
          <span className="font-numero font-bold text-xl">
            {t("grupos.deN", { g: rival.pg_contra, n: rival.pj_contra })} · {Math.round((100 * rival.pg_contra) / rival.pj_contra)}%
          </span>
        </div>
      )}
      <div className="flex flex-col border-t border-ink/10">
        {cara.map((f) => {
          const pct = f.pj_contra > 0 ? Math.round((100 * f.pg_contra) / f.pj_contra) : null;
          return (
            <div key={f.jugador_id} className="flex flex-col gap-1.5 py-3 border-b border-ink/10">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{f.nombre}</span>
                {pct !== null && (
                  <span className={`font-numero font-bold text-sm ${pct > 50 ? "text-[#16a34a]" : pct < 50 ? "text-[#dc2626]" : ""}`}>
                    {t("grupos.deN", { g: f.pg_contra, n: f.pj_contra })}
                  </span>
                )}
              </div>
              {pct !== null && (
                <div className="flex h-2 rounded-[2px] overflow-hidden bg-ink/10">
                  <span className="bg-[#16a34a]" style={{ width: `${pct}%` }} />
                  <span className="bg-[#dc2626]" style={{ width: `${100 - pct}%` }} />
                </div>
              )}
              {f.pj_juntos > 0 && <span className="text-xs text-muted">{t("grupos.juntos", { g: f.pg_juntos, n: f.pj_juntos })}</span>}
              {f.pj_contra > 0 && (
                <span className="text-xs text-muted">{t("grupos.enfrentados", { a: f.pg_contra, b: f.pj_contra - f.pg_contra })}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
