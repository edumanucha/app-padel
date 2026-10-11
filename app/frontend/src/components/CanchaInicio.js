"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { leerPantalla, guardarPantalla } from "@/lib/cachePantalla";
import HojaAbajo from "@/components/HojaAbajo";
import PelotaLoader from "@/components/PelotaLoader";
import CampoCancha from "@/components/CampoCancha";

// La cancha del Inicio (D-48, 2026-10-11, MEJ-025 "Me falta uno"): siempre
// está debajo de Marcadorcito y Crear partido, y cambia según lo que pasa
// (maqueta aprobada: docs/maquetas/maquetas-cancha-siempre.html):
//   1. A tu próximo partido le falta gente  -> "Te falta 1" + Buscar jugador
//   2. Alguien de tus grupos busca jugador   -> "A Juli le falta 1" + Me sumo
//   3. No pasa nada                          -> Estoy disponible / Me falta gente
//   4. Avisaste que estás disponible         -> te ves en la cancha esperando
// Los pedidos y el "disponible" los ven solo tus grupos (SQL 100), más el
// link para WhatsApp (/p/<id>).

const VERDE = "bg-[#154139] text-[#eaf4f0]";
const etiqueta = "text-[10.5px] font-bold uppercase tracking-[0.12em]";
const primerNombre = (s) => String(s ?? "").trim().split(/\s+/)[0] || "";
const dosDigitos = (n) => String(n).padStart(2, "0");
const fmtMin = (m) => `${dosDigitos(Math.floor(m / 60))}:${dosDigitos(m % 60)}`;

function esHoy(fecha) {
  return new Date(fecha).toDateString() === new Date().toDateString();
}
function esManana(fecha) {
  const m = new Date();
  m.setDate(m.getDate() + 1);
  return new Date(fecha).toDateString() === m.toDateString();
}

// "hoy 20:00", "mañana, hora a definir", "18/10 19:30"
export function textoCuando(fechaIso, horaADefinir, t) {
  const f = new Date(fechaIso);
  const dia = esHoy(f) ? t("faltaUno.cuandoHoy") : esManana(f) ? t("faltaUno.cuandoManana") : `${dosDigitos(f.getDate())}/${dosDigitos(f.getMonth() + 1)}`;
  return horaADefinir ? `${dia}, ${t("faltaUno.horaADefinir")}` : `${dia} ${dosDigitos(f.getHours())}:${dosDigitos(f.getMinutes())}`;
}

export function textoCategorias(min, max) {
  if (!min) return "";
  return !max || max === min ? `${min}ª` : `${min}ª-${max}ª`;
}

// "Mixto · 3ª-4ª · Los del jueves · cancha a definir"
function detallePedido(p, t, conGrupo = true) {
  return [
    p.tipo_partido && t(`faltaUno.${p.tipo_partido}`),
    textoCategorias(p.nivel_min, p.nivel_max),
    conGrupo && p.grupo,
    p.cancha_a_definir ? t("faltaUno.canchaADefinir") : p.cancha,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function textoWhatsapp(p, faltan, t) {
  const extra = [p.tipo_partido && t(`faltaUno.${p.tipo_partido}`), textoCategorias(p.nivel_min, p.nivel_max)].filter(Boolean).join(", ");
  const base = t(faltan > 1 ? "faltaUno.waFaltan" : "faltaUno.waFalta", {
    n: faltan,
    cuando: textoCuando(p.fecha_hora, p.hora_a_definir, t),
  });
  const cancha = p.cancha_a_definir ? "" : ` ${t("faltaUno.waEn", { cancha: p.cancha })}`;
  return `${base}${cancha}${extra ? ` (${extra})` : ""}. ${t("faltaUno.waSumas")}`;
}

function linkPartido(id) {
  return `${window.location.origin}/p/${id}`;
}

// --- La cancha dibujada: 4 lugares, la red amarilla en el medio ---------
function Lugar({ tipo = "jugador", inicial, texto, avatar, onClick }) {
  const circulo = {
    jugador: "bg-[#eaf4f0] text-[#154139]",
    yo: "bg-accent text-accent-ink shadow-[0_0_0_4px_rgba(242,197,61,0.25)]",
    libre: "border-2 border-dashed border-accent text-accent text-xl",
    vacio: "border-2 border-dashed border-[#eaf4f0]/30 text-[#eaf4f0]/40",
    reservado: "bg-[#eaf4f0]/25 text-[#eaf4f0]",
  }[tipo];
  const contenido = (
    <>
      <span className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold overflow-hidden ${circulo}`}>
        {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : inicial}
      </span>
      {texto && (
        <span className={`text-[11.5px] font-bold leading-tight max-w-full truncate ${tipo === "libre" ? "text-accent" : tipo === "vacio" || tipo === "reservado" ? "text-[#eaf4f0]/55" : ""}`}>
          {texto}
        </span>
      )}
    </>
  );
  const clase = "relative z-[1] flex flex-col items-center justify-center gap-1 text-center min-w-0";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${clase} cursor-pointer`}>
      {contenido}
    </button>
  ) : (
    <span className={clase}>{contenido}</span>
  );
}

function Cancha({ lugares }) {
  return (
    <div className="relative grid grid-cols-2 grid-rows-2 gap-2.5 p-2.5 h-[140px] rounded-[6px] border-2 border-[#eaf4f0]/35">
      <span className="absolute left-0 right-0 top-1/2 border-t-[3px] border-accent" aria-hidden />
      <span className="absolute left-1/2 top-[18%] bottom-[18%] border-l-2 border-[#eaf4f0]/25" aria-hidden />
      {lugares.slice(0, 4).map((l, i) => (
        <Lugar key={i} {...l} />
      ))}
    </div>
  );
}

// Lugares de un partido: los que están, los reservados y los libres.
function lugaresDePartido(p, { textoLibre, onLibre, yoId, t }) {
  const lugares = (p.jugadores ?? []).map((j) => ({
    tipo: j.id && j.id === yoId ? "yo" : "jugador",
    inicial: primerNombre(j.nombre).charAt(0).toUpperCase() || "?",
    texto: j.id && j.id === yoId ? t("faltaUno.vos") : primerNombre(j.nombre),
    avatar: j.avatar_url,
  }));
  const reservados = Math.min(p.reservados ?? 0, 4 - lugares.length);
  for (let i = 0; i < reservados; i++) lugares.push({ tipo: "reservado", inicial: "", texto: t("faltaUno.reservado") });
  for (let i = 0; i < p.libres && lugares.length < 4; i++)
    lugares.push({ tipo: "libre", inicial: "+", texto: i === 0 ? textoLibre : "", onClick: onLibre });
  while (lugares.length < 4) lugares.push({ tipo: "vacio", inicial: "", texto: "" });
  return lugares;
}

function Chip({ on, onClick, children, grande }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border-[1.5px] font-semibold cursor-pointer ${grande ? "font-numero font-bold text-lg px-5 py-1" : "text-[13px] px-3 py-1.5"} ${
        on ? "bg-[#154139] border-[#154139] text-[#eaf4f0]" : "border-ink/20 text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Campo({ titulo, extra, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={`${etiqueta} text-muted`}>
        {titulo} {extra && <span className="normal-case tracking-normal font-semibold">{extra}</span>}
      </span>
      {children}
    </div>
  );
}

// Franja de turnos (como al reservar cancha). El primero es un texto ("A
// definir" / "Cualquier hora"); valor null = ese primero.
function Franja({ valor, onCambiar, primero, desdeMin = 0, t }) {
  const turnos = [];
  for (let m = 7 * 60; m <= 23 * 60 + 30; m += 30) if (m > desdeMin) turnos.push(m);
  const momento = (m) => (m < 720 ? t("faltaUno.momManana") : m < 1140 ? t("faltaUno.momTarde") : t("faltaUno.momNoche"));
  const clase = (on) =>
    `flex-none snap-start min-w-[62px] h-[54px] px-2 rounded-[8px] border-[1.5px] flex flex-col items-center justify-center cursor-pointer ${
      on ? "bg-[#154139] border-[#154139] text-[#eaf4f0]" : "border-ink/20"
    }`;
  return (
    <div
      className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      ref={(el) => {
        if (!el || el.dataset.listo) return;
        el.dataset.listo = "1";
        const on = el.querySelector("[data-on='1']");
        if (on) el.scrollLeft = on.offsetLeft - 120;
      }}
    >
      <button type="button" data-on={valor == null ? "1" : "0"} onClick={() => onCambiar(null)} className={clase(valor == null)}>
        <b className="text-[12.5px] font-bold">{primero}</b>
      </button>
      {turnos.map((m) => (
        <button key={m} type="button" data-on={valor === m ? "1" : "0"} onClick={() => onCambiar(m)} className={clase(valor === m)}>
          <b className="font-numero text-[17px] leading-none">{fmtMin(m)}</b>
          <small className={`text-[9px] font-bold uppercase tracking-[0.08em] ${valor === m ? "text-accent" : "text-muted"}`}>{momento(m)}</small>
        </button>
      ))}
    </div>
  );
}

function minutosAhora() {
  const a = new Date();
  return a.getHours() * 60 + a.getMinutes();
}

// --- Hoja: pedir jugador (de un partido tuyo o uno nuevo) ---------------
function HojaPedido({ partido, perfil, t, onCerrar, onPublicado }) {
  const maxFaltan = partido ? Math.min(3, partido.libres) : 3;
  const [faltan, setFaltan] = useState(1);
  const [tipo, setTipo] = useState(partido?.tipo_partido ?? (perfil?.sexo === "femenino" ? "femenino" : perfil?.sexo === "masculino" ? "masculino" : null));
  const [faltaSexo, setFaltaSexo] = useState(null);
  const [cats, setCats] = useState(() => {
    if (partido?.nivel_min) return [partido.nivel_min, partido.nivel_max ?? partido.nivel_min].filter((v, i, a) => a.indexOf(v) === i);
    return perfil?.nivel ? [perfil.nivel] : [];
  });
  const [dia, setDia] = useState("hoy");
  const [otraFecha, setOtraFecha] = useState("");
  const [hora, setHora] = useState(() => (minutosAhora() < 20 * 60 ? 20 * 60 : null));
  const [conCancha, setConCancha] = useState(false);
  const [cancha, setCancha] = useState("");
  const [canchaId, setCanchaId] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  function tocarCategoria(n) {
    setCats((prev) => {
      if (prev.includes(n)) return prev.length > 1 ? prev.filter((x) => x !== n) : prev;
      if (prev.length === 1 && Math.abs(prev[0] - n) === 1) return [prev[0], n].sort((a, b) => a - b);
      return [n];
    });
  }

  function fechaElegida() {
    let base;
    if (dia === "hoy") base = new Date();
    else if (dia === "manana") {
      base = new Date();
      base.setDate(base.getDate() + 1);
    } else {
      if (!otraFecha) return null;
      const [a, m, d] = otraFecha.split("-").map(Number);
      base = new Date(a, m - 1, d);
    }
    const f = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    if (hora == null) f.setHours(23, 59, 0, 0);
    else f.setHours(Math.floor(hora / 60), hora % 60, 0, 0);
    return f;
  }

  async function publicar() {
    setError("");
    let fecha = null;
    if (!partido) {
      fecha = fechaElegida();
      if (!fecha) return setError(t("faltaUno.elegiDia"));
      if (fecha.getTime() <= Date.now()) return setError(t("faltaUno.elegiHoraFutura"));
    }
    setEnviando(true);
    const { data, error: e } = await supabase.rpc("publicar_pedido", {
      p_partido: partido?.id ?? null,
      p_faltan: faltan,
      p_tipo: tipo,
      p_falta_sexo: tipo === "mixto" ? faltaSexo : null,
      p_nivel_min: cats.length ? Math.min(...cats) : null,
      p_nivel_max: cats.length ? Math.max(...cats) : null,
      p_fecha_hora: fecha ? fecha.toISOString() : null,
      p_hora_a_definir: hora == null,
      p_cancha: conCancha ? cancha : null,
      p_cancha_id: conCancha ? canchaId : null,
    });
    setEnviando(false);
    if (e) return setError(t("faltaUno.noSePudo", { mensaje: e.message }));
    onPublicado({
      id: data,
      faltan,
      fecha_hora: partido ? partido.fecha_hora : fecha.toISOString(),
      hora_a_definir: partido ? partido.hora_a_definir : hora == null,
      cancha: partido ? partido.cancha : cancha,
      cancha_a_definir: partido ? partido.cancha_a_definir : !(conCancha && cancha.trim()),
      tipo_partido: tipo,
      nivel_min: cats.length ? Math.min(...cats) : null,
      nivel_max: cats.length ? Math.max(...cats) : null,
    });
  }

  return (
    <HojaAbajo titulo={t(partido ? "faltaUno.buscarJugador" : "faltaUno.meFaltaGente")} onCerrar={onCerrar} textoCerrar={t("faltaUno.cerrar")}>
      {partido && (
        <p className="text-sm text-muted -mt-1">
          {textoCuando(partido.fecha_hora, partido.hora_a_definir, t)} · {partido.cancha_a_definir ? t("faltaUno.canchaADefinir") : partido.cancha}
        </p>
      )}
      <Campo titulo={t("faltaUno.meFalta")}>
        <div className="flex gap-2">
          {[1, 2, 3].filter((n) => n <= maxFaltan).map((n) => (
            <Chip key={n} grande on={faltan === n} onClick={() => setFaltan(n)}>
              {n}
            </Chip>
          ))}
        </div>
      </Campo>
      <Campo titulo={t("faltaUno.partido")}>
        <div className="flex flex-wrap gap-1.5">
          {["femenino", "masculino", "mixto"].map((v) => (
            <Chip key={v} on={tipo === v} onClick={() => setTipo(tipo === v ? null : v)}>
              {t(`faltaUno.${v}`)}
            </Chip>
          ))}
        </div>
        {tipo === "mixto" && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-[13px] text-muted font-semibold">{t("faltaUno.falta")}</span>
            {[
              ["femenino", "faltaUno.unaChica"],
              ["masculino", "faltaUno.unChico"],
              [null, "faltaUno.cualquiera"],
            ].map(([v, k]) => (
              <Chip key={k} on={faltaSexo === v} onClick={() => setFaltaSexo(v)}>
                {t(k)}
              </Chip>
            ))}
          </div>
        )}
      </Campo>
      <Campo titulo={t("faltaUno.categoria")} extra={t("faltaUno.hastaDos")}>
        <div className="grid grid-cols-7 gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => tocarCategoria(n)}
              className={`rounded-full border-[1.5px] py-1.5 text-[13px] font-semibold cursor-pointer ${
                cats.includes(n) ? "bg-[#154139] border-[#154139] text-[#eaf4f0]" : "border-ink/20"
              }`}
            >
              {n}ª
            </button>
          ))}
        </div>
      </Campo>
      {!partido && (
        <>
          <Campo titulo={t("faltaUno.cuando")}>
            <div className="flex flex-wrap gap-1.5">
              {[
                ["hoy", "faltaUno.hoy"],
                ["manana", "faltaUno.manana"],
                ["otro", "faltaUno.otroDia"],
              ].map(([v, k]) => (
                <Chip
                  key={v}
                  on={dia === v}
                  onClick={() => {
                    setDia(v);
                    if (v === "hoy" && hora != null && hora <= minutosAhora()) setHora(null);
                  }}
                >
                  {t(k)}
                </Chip>
              ))}
            </div>
            {dia === "otro" && (
              <input
                type="date"
                value={otraFecha}
                onChange={(e) => setOtraFecha(e.target.value)}
                className="rounded-[6px] bg-transparent border border-ink/15 px-3 py-2 text-ink mt-1"
              />
            )}
            <Franja
              key={dia}
              valor={hora}
              onCambiar={setHora}
              primero={t("faltaUno.aDefinir")}
              desdeMin={dia === "hoy" ? minutosAhora() : 0}
              t={t}
            />
          </Campo>
          {conCancha ? (
            <CampoCancha value={cancha} onChange={setCancha} onElegir={(c) => setCanchaId(c?.id ?? null)} />
          ) : (
            <button type="button" onClick={() => setConCancha(true)} className="text-left text-sm font-semibold cursor-pointer">
              {t("faltaUno.agregarCancha")} <span className="text-muted font-normal">{t("faltaUno.opcional")}</span>
            </button>
          )}
        </>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="button"
        onClick={publicar}
        disabled={enviando}
        className="w-full font-titulo font-black uppercase text-[1.6rem] leading-none px-4 py-3.5 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {enviando && <PelotaLoader />}
        {t("faltaUno.publicar")}
      </button>
      <p className="text-xs text-muted text-center -mt-1">{t("faltaUno.alcance")}</p>
    </HojaAbajo>
  );
}

// --- Hoja: compartir el pedido por WhatsApp -----------------------------
function HojaCompartir({ pedido, t, onCerrar }) {
  const [copiado, setCopiado] = useState(false);
  const texto = textoWhatsapp(pedido, pedido.faltan ?? pedido.libres ?? 1, t);
  const link = linkPartido(pedido.id);
  return (
    <HojaAbajo titulo={t("faltaUno.publicado")} onCerrar={onCerrar} textoCerrar={t("faltaUno.listo")}>
      <p className="text-sm">{t("faltaUno.publicadoTexto")}</p>
      <div className="rounded-[8px] border border-ink/10 bg-bg p-3 text-sm flex flex-col gap-1">
        <span>{texto}</span>
        <span className="text-muted text-xs break-all">{link}</span>
      </div>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${texto}\n${link}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full text-center font-titulo font-black uppercase text-[1.5rem] leading-none px-4 py-3.5 rounded-[6px] bg-accent text-accent-ink"
      >
        {t("faltaUno.compartirWhatsapp")}
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${texto}\n${link}`);
            setCopiado(true);
          } catch {
            setCopiado(false);
          }
        }}
        className="w-full text-sm font-semibold py-2.5 rounded-[6px] border border-ink/15 cursor-pointer"
      >
        {copiado ? t("faltaUno.linkCopiado") : t("faltaUno.copiarLink")}
      </button>
    </HojaAbajo>
  );
}

// --- Hoja: estoy disponible ---------------------------------------------
function HojaDisponible({ t, onCerrar, onListo }) {
  const [desde, setDesde] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  async function confirmar() {
    setEnviando(true);
    const { error: e } = await supabase.rpc("estoy_disponible", { p_desde: desde == null ? null : `${fmtMin(desde)}:00` });
    setEnviando(false);
    if (e) return setError(t("faltaUno.noSePudo", { mensaje: e.message }));
    onListo(desde);
  }
  return (
    <HojaAbajo titulo={t("faltaUno.estoyDisponible")} onCerrar={onCerrar} textoCerrar={t("faltaUno.cerrar")}>
      <Campo titulo={t("faltaUno.hoyDesde")}>
        <Franja valor={desde} onCambiar={setDesde} primero={t("faltaUno.cualquierHora")} desdeMin={minutosAhora() - 30} t={t} />
      </Campo>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="button"
        onClick={confirmar}
        disabled={enviando}
        className="w-full font-titulo font-black uppercase text-[1.6rem] leading-none px-4 py-3.5 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {enviando && <PelotaLoader />}
        {t("faltaUno.estoyDisponible")}
      </button>
      <p className="text-xs text-muted text-center -mt-1">{t("faltaUno.dispAlcance")}</p>
    </HojaAbajo>
  );
}

// --- "Te sumaste": mensaje ya escrito para quien armó --------------------
export function TeSumaste({ datos, t, router, enHoja = true, onCerrar }) {
  const nombre = datos.organizador_nombre || "";
  const [texto, setTexto] = useState(
    () =>
      t("faltaUno.mensajeDefault", { nombre, cuando: textoCuando(datos.fecha_hora, datos.hora_a_definir, t) }) +
      (datos.cancha_a_definir ? ` ${t("faltaUno.mensajeDonde")}` : "")
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  async function mandar() {
    setEnviando(true);
    const { error: e } = await supabase.rpc("enviar_mensaje", { p_destinatario_id: datos.organizador_id, p_contenido: texto.trim() });
    setEnviando(false);
    if (e) return setError(t("faltaUno.noSePudo", { mensaje: e.message }));
    router.push(`/mensajes/${datos.organizador_id}`);
  }
  const contenido = (
    <>
      <p className="text-sm">
        {t(datos.cancha_a_definir ? "faltaUno.escribileDonde" : "faltaUno.escribile", { nombre })}
      </p>
      <label className="flex flex-col gap-1">
        <span className={`${etiqueta} text-muted`}>{t("faltaUno.mensajePara", { nombre })}</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          className="rounded-[6px] bg-transparent border border-ink/15 px-3 py-2 text-ink text-sm"
        />
      </label>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="button"
        onClick={mandar}
        disabled={enviando || !texto.trim()}
        className="w-full font-titulo font-black uppercase text-[1.5rem] leading-none px-4 py-3.5 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {enviando && <PelotaLoader />}
        {t("faltaUno.mandarMensaje")}
      </button>
      <button
        type="button"
        onClick={() => (onCerrar ? onCerrar() : router.push(`/partido/${datos.partido_id}`))}
        className="w-full text-sm font-semibold py-2.5 rounded-[6px] border border-ink/15 cursor-pointer"
      >
        {t("faltaUno.ahoraNo")}
      </button>
    </>
  );
  if (!enHoja) return <div className="flex flex-col gap-3">{contenido}</div>;
  return (
    <HojaAbajo titulo={t("faltaUno.teSumaste")} onCerrar={onCerrar} textoCerrar={t("faltaUno.cerrar")}>
      {contenido}
    </HojaAbajo>
  );
}

// --- La tarjeta -----------------------------------------------------------
export default function CanchaInicio({ perfil, t, router }) {
  const userId = perfil?.id;
  const [datos, setDatos] = useState(() => (userId ? leerPantalla("home_cancha", userId) : null));
  const [hoja, setHoja] = useState(null); // {tipo, ...}
  const [sumando, setSumando] = useState(null);
  const [error, setError] = useState("");

  async function cargar() {
    const { data, error: e } = await supabase.rpc("cancha_inicio");
    if (e || !data) return; // sin el SQL 100 todavía: la cancha queda en "¿Jugamos?"
    setDatos(data);
    guardarPantalla("home_cancha", userId, data);
  }

  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    supabase.rpc("cancha_inicio").then(({ data, error: e }) => {
      if (!vivo || e || !data) return;
      setDatos(data);
      guardarPantalla("home_cancha", userId, data);
    });
    return () => {
      vivo = false;
    };
  }, [userId]);

  const yo = useMemo(
    () => ({ tipo: "yo", inicial: primerNombre(perfil?.nombre).charAt(0).toUpperCase() || "?", texto: t("faltaUno.vos"), avatar: perfil?.avatar_url }),
    [perfil, t]
  );

  async function meSumo(p) {
    setError("");
    setSumando(p.id);
    const { data, error: e } = await supabase.rpc("sumarme_a_partido", { p_partido: p.id });
    setSumando(null);
    if (e) {
      setError(t("faltaUno.noSePudo", { mensaje: e.message }));
      cargar();
      return;
    }
    setHoja({ tipo: "sumaste", datos: data });
    cargar();
  }

  async function yaNo() {
    setDatos((d) => d && { ...d, disponible: false });
    await supabase.rpc("ya_no_disponible");
    cargar();
  }

  async function dejarDeBuscar(p) {
    setDatos((d) => d && { ...d, mi_partido: null });
    await supabase.rpc("dejar_de_buscar", { p_partido: p.id, p_completar: true });
    cargar();
  }

  const mi = datos?.mi_partido;
  const pedidos = datos?.pedidos ?? [];
  const otros = datos?.disponibles ?? [];
  const pedido = pedidos[0];

  let tarjeta;
  if (mi) {
    // 1. A tu partido le falta gente.
    tarjeta = (
      <>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-titulo font-black uppercase text-[1.45rem] leading-[0.92]">
            {t(mi.libres > 1 ? "faltaUno.teFaltan" : "faltaUno.teFalta")} <em className="not-italic text-accent">{mi.libres}</em>
          </span>
          <span className={`${etiqueta} text-[#8fb6ae] text-right`}>{textoCuando(mi.fecha_hora, mi.hora_a_definir, t)}</span>
        </div>
        {mi.busca_jugador && <span className="text-xs text-[#8fb6ae] -mt-1.5">{t("faltaUno.yaAvisamos")}</span>}
        <Cancha
          lugares={lugaresDePartido(mi, {
            yoId: userId,
            t,
            textoLibre: mi.busca_jugador ? t("faltaUno.compartir") : t("faltaUno.buscarJugador"),
            onLibre: () => setHoja(mi.busca_jugador ? { tipo: "compartir", pedido: { ...mi, faltan: mi.libres } } : { tipo: "pedido", partido: mi }),
          })}
        />
        <div className="flex justify-between gap-2 text-xs text-[#8fb6ae]">
          <span className="truncate">{mi.cancha_a_definir ? t("faltaUno.canchaADefinir") : mi.cancha}</span>
          <button type="button" onClick={() => dejarDeBuscar(mi)} className="text-[#eaf4f0] font-bold underline cursor-pointer flex-shrink-0">
            {t("faltaUno.yaEstamos")}
          </button>
        </div>
      </>
    );
  } else if (pedido) {
    // 2. Alguien de tus grupos busca.
    tarjeta = (
      <>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-titulo font-black uppercase text-[1.45rem] leading-[0.92] min-w-0">
            {t(pedido.libres > 1 ? "faltaUno.aLeFaltan" : "faltaUno.aLeFalta", { nombre: pedido.organizador })}{" "}
            <em className="not-italic text-accent">{pedido.libres}</em>
          </span>
          <span className={`${etiqueta} text-[#8fb6ae] text-right flex-shrink-0`}>{textoCuando(pedido.fecha_hora, pedido.hora_a_definir, t)}</span>
        </div>
        <span className="text-xs text-[#8fb6ae] -mt-1.5">{detallePedido(pedido, t)}</span>
        <Cancha
          lugares={lugaresDePartido(pedido, {
            yoId: userId,
            t,
            textoLibre: sumando === pedido.id ? "..." : t("faltaUno.meSumo"),
            onLibre: () => !sumando && meSumo(pedido),
          })}
        />
        {pedidos.length > 1 && (
          <div className="flex justify-between gap-2 text-xs text-[#8fb6ae]">
            <span>{t(pedidos.length > 2 ? "faltaUno.pedidosMas" : "faltaUno.pedidoMas", { n: pedidos.length - 1 })}</span>
            <button type="button" onClick={() => setHoja({ tipo: "todos" })} className="text-[#eaf4f0] font-bold underline cursor-pointer">
              {t("faltaUno.verTodos")}
            </button>
          </div>
        )}
      </>
    );
  } else if (datos?.disponible) {
    // 4. Avisaste que estás disponible.
    const desde = datos.disponible_desde ? String(datos.disponible_desde).slice(0, 5) : null;
    const lugares = [yo, ...otros.slice(0, 3).map((o) => ({ tipo: "jugador", inicial: primerNombre(o.nombre).charAt(0).toUpperCase(), texto: primerNombre(o.nombre), avatar: o.avatar_url }))];
    while (lugares.length < 4) lugares.push({ tipo: "vacio", inicial: "?", texto: "" });
    const nombres = otros.map((o) => primerNombre(o.nombre));
    tarjeta = (
      <>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-titulo font-black uppercase text-[1.45rem] leading-[0.92]">
            {t("faltaUno.estas")} <em className="not-italic text-accent">{t("faltaUno.disponible")}</em>
          </span>
          <span className={`${etiqueta} text-[#8fb6ae] text-right`}>
            {desde ? t("faltaUno.hoyDesdeHora", { hora: desde }) : t("faltaUno.hoyCualquierHora")}
          </span>
        </div>
        <span className="text-xs text-[#8fb6ae] -mt-1.5">{t(datos.tiene_grupo ? "faltaUno.tusGruposTeVen" : "faltaUno.sinGrupo")}</span>
        <Cancha lugares={lugares} />
        {otros.length >= 3 && (
          <button
            type="button"
            onClick={() => router.push("/crear-partido")}
            className="w-full rounded-[6px] bg-accent text-accent-ink font-extrabold text-sm py-2.5 cursor-pointer"
          >
            {t("faltaUno.sonCuatro")}
          </button>
        )}
        <div className="flex justify-between gap-2 text-xs text-[#8fb6ae]">
          <span className="truncate">
            {nombres.length === 0
              ? t("faltaUno.nadieMas")
              : t(nombres.length > 1 ? "faltaUno.tambienDisponibles" : "faltaUno.tambienDisponible", { nombres: nombres.slice(0, 3).join(", ") })}
          </span>
          <button type="button" onClick={yaNo} className="text-[#eaf4f0] font-bold underline cursor-pointer flex-shrink-0">
            {t("faltaUno.yaNo")}
          </button>
        </div>
      </>
    );
  } else {
    // 3. No pasa nada.
    tarjeta = (
      <>
        <span className="font-titulo font-black uppercase text-[1.45rem] leading-[0.92]">{t("faltaUno.jugamos")}</span>
        <Cancha lugares={[yo, { tipo: "vacio", inicial: "?" }, { tipo: "vacio", inicial: "?" }, { tipo: "vacio", inicial: "?" }]} />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setHoja({ tipo: "disponible" })}
            className="rounded-[6px] bg-[#eaf4f0] text-[#154139] font-extrabold text-[13px] py-2.5 cursor-pointer"
          >
            {t("faltaUno.estoyDisponible")}
          </button>
          <button
            type="button"
            onClick={() => setHoja({ tipo: "pedido", partido: null })}
            className="rounded-[6px] border-2 border-[#2c6a5c] text-[#eaf4f0] font-extrabold text-[13px] py-2.5 cursor-pointer"
          >
            {t("faltaUno.meFaltaGente")}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div data-guia="cancha" className={`${VERDE} rounded-[8px] p-3 flex flex-col gap-2.5`}>
        {tarjeta}
        {error && <span className="text-xs text-accent">{error}</span>}
      </div>

      {hoja?.tipo === "pedido" && (
        <HojaPedido
          partido={hoja.partido}
          perfil={perfil}
          t={t}
          onCerrar={() => setHoja(null)}
          onPublicado={(p) => {
            setHoja({ tipo: "compartir", pedido: p });
            cargar();
          }}
        />
      )}
      {hoja?.tipo === "compartir" && <HojaCompartir pedido={hoja.pedido} t={t} onCerrar={() => setHoja(null)} />}
      {hoja?.tipo === "disponible" && (
        <HojaDisponible
          t={t}
          onCerrar={() => setHoja(null)}
          onListo={(desde) => {
            setHoja(null);
            setDatos((d) => ({ ...(d ?? {}), disponible: true, disponible_desde: desde == null ? null : fmtMin(desde) }));
            cargar();
          }}
        />
      )}
      {hoja?.tipo === "sumaste" && <TeSumaste datos={hoja.datos} t={t} router={router} onCerrar={() => setHoja(null)} />}
      {hoja?.tipo === "todos" && (
        <HojaAbajo titulo={t("faltaUno.buscanJugador")} onCerrar={() => setHoja(null)} textoCerrar={t("faltaUno.cerrar")}>
          {pedidos.map((p) => (
            <div key={p.id} className="flex items-center gap-3 border-b border-ink/10 pb-3">
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="font-semibold text-sm">
                  {t(p.libres > 1 ? "faltaUno.aLeFaltan" : "faltaUno.aLeFalta", { nombre: p.organizador })} {p.libres} ·{" "}
                  {textoCuando(p.fecha_hora, p.hora_a_definir, t)}
                </span>
                <span className="text-xs text-muted truncate">{detallePedido(p, t)}</span>
              </span>
              <button
                type="button"
                disabled={!!sumando}
                onClick={() => meSumo(p)}
                className="flex-shrink-0 rounded-[6px] bg-accent text-accent-ink font-extrabold text-sm px-3 py-2 cursor-pointer disabled:opacity-60"
              >
                {sumando === p.id ? "..." : t("faltaUno.meSumo")}
              </button>
            </div>
          ))}
        </HojaAbajo>
      )}
    </>
  );
}
