"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { usuarioActual, sinConexion } from "@/lib/marcadorOffline";
import PelotaLoader from "@/components/PelotaLoader";
import Logo from "@/components/Logo";
import DotDigit from "@/components/DotDigit";
import IlustracionCancha from "@/components/IlustracionCancha";
import ContadorNumero from "@/components/ContadorNumero";
import InstalarApp from "@/components/InstalarApp";
import HojaAbajo from "@/components/HojaAbajo";
import { leerPantalla, guardarPantalla } from "@/lib/cachePantalla";
import GuiaPadelito from "@/components/GuiaPadelito";
import { useEnPantalla } from "@/lib/useEnPantalla";
import marcadorStyles from "@/components/Marcador.module.css";
import { IconoMenu, IconoCampana, IconoPelota, IconoCalendario, IconoLupa, IconoTrofeo, IconoMensaje, IconoSobre, IconoRadar, IconoDuo, IconoPin, IconoLista, IconoPersona, IconoLlave, IconoEngranaje, IconoSinConexion, IconoChevron, IconoCorazon, IconoGrupo } from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/config";

function formatearFecha(fechaIso, locale) {
  return new Date(fechaIso).toLocaleString(INTL_LOCALE[locale] ?? "es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function diaYMesCorto(fechaIso, locale) {
  const fecha = new Date(fechaIso);
  const intl = INTL_LOCALE[locale] ?? "es-AR";
  return {
    dia: fecha.toLocaleDateString(intl, { day: "2-digit" }),
    mes: fecha.toLocaleDateString(intl, { month: "short" }).replace(".", "").toUpperCase(),
  };
}

function formatearResultado(setsA, setsB) {
  if (!setsA || !setsB) return "";
  return setsA.map((_, i) => `${setsA[i]}-${setsB[i]}`).join(", ");
}

// Card base + subtítulo de sección -- estilo "claro y ordenado" elegido por
// el usuario (2026-09-12), sin bordes gruesos ni sombras duras, respaldado
// en [[project-padelito-style-guide]]. La tarjeta anterior con
// border-[3px] + shadow offset queda guardada en
// HomeForm.backup-estilo-bordes-gruesos-2026-09-12.js por si se quiere
// volver atrás.
// Fila de acceso del Inicio (rediseño Cartel): ícono, título, descripción
// opcional y flecha, separadas por línea fina.
function FilaAcceso({ Icono, titulo, desc, onClick, contador }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 py-3 border-b border-ink/10 text-left cursor-pointer">
      <span className="w-9 h-9 rounded-[6px] bg-[#154139] text-[#f2c53d] flex items-center justify-center flex-shrink-0">
        <Icono width={18} height={18} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="font-semibold text-sm block">{titulo}</span>
        {desc && <span className="text-xs text-muted block truncate">{desc}</span>}
      </span>
      {contador > 0 && (
        <span className="bg-accent text-accent-ink text-xs font-bold rounded-[6px] px-2 py-0.5 flex-shrink-0">{contador}</span>
      )}
      <IconoChevron width={16} height={16} style={{ transform: "rotate(-90deg)" }} className="text-muted flex-shrink-0" aria-hidden />
    </button>
  );
}

const tarjeta = "bg-surface text-ink rounded-[8px] p-4 border border-ink/10";

function Subtitulo({ children }) {
  return <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">{children}</span>;
}

// Mini demo animada del marcador en la card "Marcadorcito" del Home
// (2026-09-13, a pedido del usuario: "que se cambie ponele que vaya 5-4
// y que cambie a 6-4 y que se vea el cartel de set ganado" -- antes el
// 6-3 quedaba fijo y estático). Repite el ciclo en loop mientras la
// card está montada; respeta prefers-reduced-motion mostrando el
// resultado final fijo, sin animar.
function ContenidoMarcadorcitoDemo() {
  const { t } = useLocale();
  const [marcador, setMarcador] = useState(["5", "4"]);
  const [mostrarCartel, setMostrarCartel] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMarcador(["6", "4"]);
      return;
    }
    let cancelado = false;
    const timeouts = [];
    function ciclo() {
      if (cancelado) return;
      setMarcador(["5", "4"]);
      setMostrarCartel(false);
      timeouts.push(setTimeout(() => !cancelado && setMarcador(["6", "4"]), 1400));
      timeouts.push(setTimeout(() => !cancelado && setMostrarCartel(true), 1700));
      timeouts.push(setTimeout(() => !cancelado && setMostrarCartel(false), 3100));
      timeouts.push(setTimeout(ciclo, 4800));
    }
    ciclo();
    return () => {
      cancelado = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <>
      <IlustracionCancha className="absolute -right-6 -bottom-8 w-36 h-36 opacity-[0.12] pointer-events-none" />
      <div
        className={`${marcadorStyles.miniPreview} relative z-10 flex items-center gap-2 px-3 py-2 rounded-[10px] flex-shrink-0`}
        style={{ background: "#0c2320" }}
      >
        <DotDigit valor={marcador[0]} />
        <span className="text-lg text-white">-</span>
        <DotDigit valor={marcador[1]} />
        {mostrarCartel && <span className={marcadorStyles.miniCartelSet}>Set ganado</span>}
      </div>
      <div className="relative z-10">
        <span className="flex items-center gap-1.5">
          <IconoPelota /> {t("nav.marcadorcito")}
        </span>
        <span className="font-body font-normal text-xs opacity-80 leading-snug block">
          {t("home.marcadorcitoDesc")}
        </span>
      </div>
    </>
  );
}

export default function HomeForm() {
  const router = useRouter();
  // Demora chica antes de navegar (2026-09-13, a pedido del usuario: en
  // celular no hay hover, así que sin esto el ícono animado de estos 2
  // botones ni se alcanza a ver antes de cambiar de pantalla).
  const [animandoCrear, setAnimandoCrear] = useState(false);
  const [animandoAbiertos, setAnimandoAbiertos] = useState(false);
  function irACrearPartido() {
    setAnimandoCrear(true);
    setTimeout(() => router.push("/crear-partido"), 180);
  }
  function irAPartidosAbiertos() {
    setAnimandoAbiertos(true);
    setTimeout(() => router.push("/partidos"), 180);
  }

  // Animación de entrada al aparecer en pantalla (no hover/tap -- ver
  // useEnPantalla.js) para las tarjetas que no navegan con un delay propio.
  const [refJugadores, visibleJugadores] = useEnPantalla();
  const [refMensajes, visibleMensajes] = useEnPantalla();
  const [refInvitaciones, visibleInvitaciones] = useEnPantalla();
  const [refTip, visibleTip] = useEnPantalla();

  const { locale, t } = useLocale();
  const [perfil, setPerfil] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [tipPadel, setTipPadel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [historial, setHistorial] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [error, setError] = useState("");
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [proximamenteTocado, setProximamenteTocado] = useState(null);
  const [mostrarMas, setMostrarMas] = useState(false);
  const [partidoEnCurso, setPartidoEnCurso] = useState(null);
  const [homeSinSenal, setHomeSinSenal] = useState(false);

  // "Volver al partido" (2026-09-30, pedido del usuario): el Marcadorcito
  // guarda en el celu el id del partido mientras está en juego. Se confirma
  // contra la base que siga sin terminar antes de mostrar el cartel.
  useEffect(() => {
    let id = null;
    try {
      id = localStorage.getItem("marcadorcito_en_curso");
    } catch {
      return;
    }
    if (!id) return;
    if (sinConexion()) {
      Promise.resolve().then(() => setPartidoEnCurso(id));
      return;
    }
    supabase
      .from("resultados_partido")
      .select("finalizado")
      .eq("partido_id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        // Error (ej. se cortó la señal) o partido creado sin señal que
        // todavía no se subió: se muestra igual, no se borra.
        if (error || !data) {
          setPartidoEnCurso(id);
        } else if (!data.finalizado) {
          setPartidoEnCurso(id);
        } else {
          try {
            localStorage.removeItem("marcadorcito_en_curso");
          } catch {
            // nada
          }
        }
      });
  }, []);

  useEffect(() => {
    async function cargar() {
      // Sin señal (2026-09-30): no se puede cargar el resumen, pero sí
      // jugar con el Marcadorcito -- se muestra una pantalla simple.
      if (sinConexion()) {
        const guardado = await usuarioActual();
        if (guardado) {
          setHomeSinSenal(true);
          setCargando(false);
          return;
        }
      }
      const user = await usuarioActual();

      if (!user) {
        // Sin sesión: directo al login (2026-10-03, a pedido del usuario: la app
        // se enfoca solo en pádel, se sacó "Elegí tu deporte").
        if (sinConexion()) window.location.replace("/offline");
        else router.replace("/login");
        return;
      }

      // US-6.7: si venía de "compartir partido" y tuvo que loguearse
      // primero, lo mandamos de vuelta a esa vista pública en vez de
      // quedarse en el Home.
      const volverA = sessionStorage.getItem("volverA");
      if (volverA) {
        sessionStorage.removeItem("volverA");
        router.replace(volverA);
        return;
      }

      // Copia de la última vez (2026-09-30, optimización): se muestra al
      // toque y los datos de abajo la reemplazan cuando llegan.
      const copia = leerPantalla("home", user.id);
      if (copia) {
        setPerfil(copia.perfil);
        setResumen(copia.resumen);
        setNotificaciones(copia.notificaciones ?? []);
        setCargando(false);
      }

      const { data: perfilData, error: perfilError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (perfilError) {
        setError(`No se pudo cargar tu perfil: ${perfilError.message}`);
        setCargando(false);
        return;
      }

      if (!perfilData) {
        router.replace("/completar-perfil");
        return;
      }

      if (!perfilData.activo) {
        router.replace("/perfil");
        return;
      }

      setPerfil(perfilData);

      fetch("/api/tip-padel")
        .then((r) => (r.ok ? r.json() : null))
        .then(setTipPadel)
        .catch(() => setTipPadel(null));

      // En paralelo (2026-09-13, arreglo de performance): ninguna de las
      // dos depende de la otra, antes iban una atrás de la otra sumando
      // una vuelta de red extra a cada carga del Home.
      const [{ data: resumenData, error: resumenError }, { data: notifData }] = await Promise.all([
        supabase.rpc("resumen_home"),
        supabase.rpc("listar_notificaciones"),
      ]);

      if (resumenError) {
        setError(`No se pudo cargar el resumen: ${resumenError.message}`);
      } else {
        setResumen(resumenData);
      }
      setNotificaciones(notifData ?? []);
      if (!resumenError) {
        guardarPantalla("home", user.id, {
          perfil: perfilData,
          resumen: resumenData,
          notificaciones: notifData ?? [],
        });
      }

      setCargando(false);
    }

    cargar();
  }, [router]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  async function handleAbrirNotificaciones() {
    setMostrarNotificaciones((v) => !v);
  }

  async function handleMarcarTodasLeidas() {
    await supabase.rpc("marcar_todas_notificaciones_leidas");
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  }

  async function handleClickNotificacion(n) {
    if (!n.leida) {
      await supabase.from("notificaciones").update({ leida: true }).eq("id", n.id);
      setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    }
    if (n.tipo === "mensaje_nuevo") {
      router.push("/mensajes");
    } else if (n.partido_id) {
      router.push(`/partido/${n.partido_id}`);
    }
  }

  async function handleVerHistorial() {
    setMostrarHistorial((v) => !v);
    if (historial !== null) return; // ya se cargó una vez, no repetir
    setCargandoHistorial(true);
    const { data, error: historialError } = await supabase.rpc("mi_historial_partidos");
    setCargandoHistorial(false);
    if (historialError) {
      setError(`No se pudo cargar el historial: ${historialError.message}`);
      return;
    }
    setHistorial(data ?? []);
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("home.cargando")}</p>
      </div>
    );
  }

  if (homeSinSenal) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4 pb-10">
        <div className="bg-surface text-ink rounded-[8px] p-5 border border-ink/10 flex flex-col gap-3">
          <h1 className="font-titulo text-3xl font-black uppercase leading-[0.95]"><IconoSinConexion className="ico" aria-hidden /> Estás sin señal</h1>
          <p className="text-sm text-muted">
            Igual podés llevar el marcador de un partido. Todo queda guardado en el celu y se sube solo cuando vuelva la
            conexión.
          </p>
          {partidoEnCurso && (
            <button
              onClick={() => router.push(`/partido/${partidoEnCurso}/marcador`)}
              className="font-heading font-semibold px-4 py-3 rounded-[6px] bg-accent text-accent-ink cursor-pointer"
            >
              Volver al partido en juego
            </button>
          )}
          <button
            onClick={() => router.push("/marcador-libre")}
            className={`font-heading font-semibold px-4 py-3 rounded-[6px] cursor-pointer ${ partidoEnCurso ? "bg-bg text-ink" : "bg-accent text-accent-ink" }`}
          >
            Jugar un partido nuevo
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-muted underline cursor-pointer self-center"
          >
            Ya tengo señal, recargar
          </button>
        </div>
      </div>
    );
  }

  if (!perfil) return null;

  return (
    <div className="w-full max-w-md flex flex-col gap-4 pb-10 pantalla-tablero">
      <div className="col-completa">
        <InstalarApp variante="franja" />
      </div>
      <GuiaPadelito />

      {partidoEnCurso && (
        <button
          onClick={() => router.push(`/partido/${partidoEnCurso}/marcador`)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[8px] bg-accent text-accent-ink border border-ink/10 cursor-pointer text-left col-completa"
        >
          <span className="flex flex-col">
            <span className="font-heading font-semibold">Tenés un partido en juego</span>
            <span className="text-sm opacity-80">Los puntos quedaron guardados</span>
          </span>
          <span className="font-heading font-semibold text-sm whitespace-nowrap">Volver al partido →</span>
        </button>
      )}

      {/* 1. Saludo (rediseño paso C, estilo "Cartel de estadio", 2026-10-01):
          sin tarjeta -- el saludo es un título grande, arriba el puesto y
          los puntos como etiqueta, y los íconos sueltos a la derecha. */}
      <div data-guia="saludo" className="flex items-start justify-between gap-3 col-completa pt-1">
        <button onClick={() => router.push("/perfil")} className="flex items-center gap-3 text-left cursor-pointer min-w-0">
          {perfil.avatar_url && (
            <div className="w-12 h-12 rounded-full bg-bg overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted block">
              {resumen?.posicion_ranking
                ? t("home.puestoYPuntos", { puesto: resumen.posicion_ranking, total: resumen.total_jugadores ?? "-", puntos: perfil.puntos_ranking })
                : t("home.puntosRanking", { puntos: perfil.puntos_ranking })}
            </span>
            <span className="font-titulo font-black uppercase text-[2.6rem] lg:text-7xl leading-[0.9] block mt-1">
              {t("home.saludo", { nombre: perfil.nombre.split(" ")[0] })}
            </span>
          </div>
        </button>
        <div className="flex items-center gap-1 text-ink pt-1">
          <button
            onClick={handleAbrirNotificaciones}
            className="relative w-9 h-9 flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label={t("home.notificaciones")}
          >
            <IconoCampana />
            {noLeidas > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-semibold rounded-full w-[18px] h-[18px] flex items-center justify-center">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </button>
          <button
            onClick={() => router.push("/configuracion")}
            className="w-9 h-9 flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label={t("home.configuracion")}
            title={t("home.configuracion")}
          >
            <IconoEngranaje />
          </button>
          <button
            onClick={() => router.push("/menu")}
            className="w-9 h-9 flex lg:hidden items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label={t("home.verTodo")}
            title={t("home.verTodo")}
          >
            <IconoMenu />
          </button>
        </div>
      </div>

      {/* Notificaciones en hoja de abajo (2026-10-01, mismo estilo que las
          Opciones del Marcadorcito, a pedido del usuario). */}
      {mostrarNotificaciones && (
        <HojaAbajo
          titulo={t("home.notificaciones")}
          onCerrar={() => setMostrarNotificaciones(false)}
          textoCerrar={t("home.cerrar")}
        >
          {noLeidas > 0 && (
            <button onClick={handleMarcarTodasLeidas} className="self-end text-xs text-muted underline cursor-pointer -mt-2">
              {t("home.marcarTodasLeidas")}
            </button>
          )}
          {notificaciones.length === 0 && (
            <span className="text-sm text-muted">{t("home.sinNotificaciones")}</span>
          )}
          {notificaciones.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClickNotificacion(n)}
              className={`text-left rounded-[6px] p-2 flex flex-col gap-0.5 cursor-pointer ${ n.leida ? "bg-bg" : "bg-accent/20" }`}
            >
              <span className="text-sm">{n.mensaje}</span>
              <span className="text-xs text-muted">{new Date(n.creado_en).toLocaleString("es-AR")}</span>
            </button>
          ))}
        </HojaAbajo>
      )}

      {error && <p className="text-red-600 text-sm col-completa">{error}</p>}

      {/* En la compu (opción C elegida por el usuario, 2026-09-30): lo
          principal ocupa dos tercios y los accesos van en la columna de la
          derecha. En el celu son dos bloques uno debajo del otro. */}
      <div className="home-principal flex flex-col gap-4">
      {/* 2. Próximo partido -- la protagonista del Inicio (rediseño paso C):
          bloque verde tablero con la fecha en amarillo, como un cartel. */}
      {resumen?.proximo_partido ? (
        (() => {
          const fecha = new Date(resumen.proximo_partido.fecha_hora);
          const intl = INTL_LOCALE[locale] ?? "es-AR";
          const diaSemana = fecha.toLocaleDateString(intl, { weekday: "short" }).replace(".", "");
          const hora = fecha.toLocaleTimeString(intl, { hour: "2-digit", minute: "2-digit", hour12: false });
          const { dia, mes } = diaYMesCorto(resumen.proximo_partido.fecha_hora, locale);
          return (
            <button
              data-guia="proximo"
              onClick={() => router.push(`/partido/${resumen.proximo_partido.partido_id}`)}
              className="flex text-left cursor-pointer rounded-[6px] overflow-hidden bg-[#154139] text-[#eaf4f0]"
            >
              <span className="bg-accent text-accent-ink flex flex-col items-center justify-center px-3 py-3 lg:px-6 lg:py-6 min-w-[72px] lg:min-w-[110px] font-titulo font-extrabold uppercase tracking-wide leading-none">
                <span className="text-sm">{diaSemana}</span>
                <span className="font-numero text-5xl lg:text-7xl font-bold leading-[0.9]">{dia}</span>
                <span className="text-sm">{mes}</span>
              </span>
              <span className="flex flex-col justify-center gap-1 px-4 py-3 min-w-0">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">
                  {t("home.tuProximoPartido")} · {hora}
                </span>
                <span className="font-titulo font-extrabold uppercase text-[1.7rem] lg:text-5xl leading-none truncate">
                  {resumen.proximo_partido.cancha}
                </span>
                <span className="text-xs text-[#c4dad3]">{formatearFecha(resumen.proximo_partido.fecha_hora, locale)}</span>
              </span>
            </button>
          );
        })()
      ) : (
        <div data-guia="proximo" className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-4 flex flex-col gap-1">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">{t("home.tuProximoPartido")}</span>
          <span className="text-sm">{t("home.sinProximoPartido")}</span>
        </div>
      )}

      {/* 4. Jugar: el Marcadorcito es el ÚNICO botón amarillo del Inicio;
          crear y abiertos van como fila con líneas, más livianos. */}
      <button
        data-guia="marcador"
        onClick={() => router.push("/marcador-libre")}
        className="flex items-center justify-between gap-3 rounded-[6px] bg-accent text-accent-ink px-4 py-4 cursor-pointer text-left"
      >
        <span className="flex flex-col">
          <span className="font-titulo font-black uppercase text-[1.75rem] leading-none">{t("home.abrirMarcadorcito")}</span>
          <span className="text-xs opacity-80 mt-1">{t("home.marcadorcitoCorto")}</span>
        </span>
        <IconoChevron width={24} height={24} style={{ transform: "rotate(-90deg)" }} aria-hidden />
      </button>

      <div data-guia="jugar" className="grid grid-cols-2 border-y-2 border-ink">
        <button
          onClick={irACrearPartido}
          className="flex items-center justify-center gap-2 py-3 font-semibold text-sm cursor-pointer"
        >
          <IconoCalendario width={18} height={18} aria-hidden /> {t("home.crearPartido")}
        </button>
        <button
          onClick={irAPartidosAbiertos}
          className="flex items-center justify-center gap-2 py-3 font-semibold text-sm cursor-pointer border-l-2 border-ink"
        >
          <IconoLupa width={18} height={18} aria-hidden /> {t("home.abiertos")}
        </button>
      </div>

      {/* 3. Invitaciones pendientes: una línea, no un bloque amarillo. */}
      {resumen?.invitaciones_pendientes > 0 && (
        <button
          onClick={() => router.push("/invitaciones")}
          className="flex items-center gap-2 text-sm font-semibold text-accent-2-ink cursor-pointer -mt-1"
        >
          <IconoSobre width={17} height={17} aria-hidden />
          {t(resumen.invitaciones_pendientes > 1 ? "home.invitacionPendientePlur" : "home.invitacionPendienteSing", {
            n: resumen.invitaciones_pendientes,
          })}
          <IconoChevron width={14} height={14} style={{ transform: "rotate(-90deg)" }} aria-hidden />
        </button>
      )}

      {/* 6/7/8. Números grandes con líneas divisorias, sin tarjetas. */}
      <div data-guia="numeros" className="grid grid-cols-3">
        <button onClick={handleVerHistorial} className="flex flex-col text-left cursor-pointer py-1">
          <span className="font-numero font-bold text-[2.6rem] lg:text-6xl leading-none">
            <ContadorNumero valor={resumen?.racha_actual ?? 0} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{t("home.rachaGanada")}</span>
        </button>
        <button onClick={() => router.push("/jugadores")} className="flex flex-col text-left cursor-pointer py-1 pl-3 border-l border-ink/15">
          <span className="font-numero font-bold text-[2.6rem] lg:text-6xl leading-none">
            {resumen?.posicion_ranking ? <ContadorNumero valor={resumen.posicion_ranking} prefijo="#" /> : "#-"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            {t("home.deRanking", { total: resumen?.total_jugadores ?? "-" })}
          </span>
        </button>
        <button onClick={handleVerHistorial} className="flex flex-col text-left cursor-pointer py-1 pl-3 border-l border-ink/15">
          <span className="font-numero font-bold text-[2.6rem] lg:text-6xl leading-none">
            <ContadorNumero valor={resumen?.porcentaje_victorias ?? 0} sufijo="%" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            {t("home.jugadosSufijo", { n: resumen?.partidos_jugados ?? 0 })}
          </span>
        </button>
      </div>

      {/* 5. Último partido jugado: etiqueta + una línea. */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{t("home.ultimoPartidoJugado")}</span>
        {resumen?.ultimo_partido ? (
          <span className="text-sm">
            <b>{resumen.ultimo_partido.gano ? t("home.ganaste") : t("home.perdiste")}</b>{" "}
            {formatearResultado(resumen.ultimo_partido.sets_a, resumen.ultimo_partido.sets_b)} {t("home.vs")}{" "}
            {resumen.ultimo_partido.rival_nombres}
          </span>
        ) : (
          <span className="text-sm text-muted">{t("home.noJugasteNinguno")}</span>
        )}
      </div>

      {mostrarHistorial && (
        <div className={`${tarjeta} flex flex-col gap-2`}>
          <div className="flex items-center justify-between">
            <span className="font-heading font-semibold text-sm">{t("home.tusPartidosJugados")}</span>
            <button onClick={() => setMostrarHistorial(false)} className="text-xs text-muted">
              {t("home.cerrar")}
            </button>
          </div>
          {cargandoHistorial && <PelotaLoader />}
          {!cargandoHistorial && historial?.length === 0 && (
            <span className="text-sm text-muted">{t("home.noJugasteNinguno")}</span>
          )}
          {!cargandoHistorial &&
            historial?.map((h) => (
              <div key={h.partido_id} className="bg-bg rounded-[6px] p-2 flex flex-col gap-0.5">
                <span className="text-xs text-muted">
                  {new Date(h.fecha_hora).toLocaleDateString(INTL_LOCALE[locale] ?? "es-AR")} · {h.cancha}
                </span>
                <span className="text-sm flex items-center gap-1.5">
                  {h.gano && <IconoTrofeo width={14} height={14} />}
                  {h.gano ? t("home.ganaste") : t("home.perdiste")} {t("home.vs")} {h.rival_nombres} (
                  {formatearResultado(h.sets_a, h.sets_b)})
                </span>
              </div>
            ))}
        </div>
      )}

      {/* 10. Tip de pádel real -- reemplaza el tip fijo que escribíamos
          nosotros (2026-09-12, a pedido del usuario: "quiero que
          empecemos a poner algo real"). Es el título real del último
          artículo de un blog de pádel + link "Leer más" -- no copiamos
          el cuerpo del artículo (derechos de autor ajenos), ver
          /api/tip-padel/route.js. Si el sitio externo no responde, la
          tarjeta simplemente no aparece. */}
      {tipPadel && (
        <div ref={refTip} className={`${tarjeta} tarjeta-entra ${visibleTip ? "visible" : ""}`}>
          <span className="font-heading font-semibold text-sm block mb-1">{t("home.tipDePadel")}</span>
          <span className="text-sm text-muted block mb-2">{tipPadel.titulo}</span>
          <a
            href={tipPadel.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-heading font-semibold text-accent-2-ink underline"
          >
            {t("home.leerMas")} ({tipPadel.fuente}) ↗
          </a>
        </div>
      )}
      </div>

      <div className="home-lateral flex flex-col gap-4">
      {/* El espacio de publicidad de ejemplo ("Padel Pro Shop Mendoza") se sacó el
         2026-10-03, a pedido del usuario, hasta decidir qué poner (promos de canchas,
         consejos propios, etc.). Mercado Libre quedó descartado: no es monotributista. */}
      {/* 11. Resto de accesos (rediseño Cartel, 2026-10-01): filas con
          línea, como el Menú, en vez de cajas de colores. */}
      <div data-guia="comunidad" className="flex flex-col">
        <Subtitulo>{t("home.comunidad")}</Subtitulo>
        <div className="flex flex-col border-t-2 border-ink mt-2">
          <FilaAcceso Icono={IconoTrofeo} titulo={t("home.jugadoresTitulo")} desc={t("home.jugadoresDesc")} onClick={() => router.push("/jugadores")} />
          <FilaAcceso Icono={IconoGrupo} titulo={t("home.gruposTitulo")} desc={t("home.gruposDesc")} onClick={() => router.push("/grupos")} />
          <FilaAcceso Icono={IconoMensaje} titulo={t("home.mensajesTitulo")} desc={t("home.mensajesDesc")} onClick={() => router.push("/mensajes")} />
          <FilaAcceso
            Icono={IconoSobre}
            titulo={t("home.invitacionesTitulo")}
            desc={t("home.invitacionesDesc")}
            onClick={() => router.push("/invitaciones")}
            contador={resumen?.invitaciones_pendientes}
          />
        </div>
      </div>

      <div className="flex flex-col">
        <Subtitulo>{t("home.matchmaking")}</Subtitulo>
        <div className="flex flex-col border-t-2 border-ink mt-2">
          <FilaAcceso Icono={IconoRadar} titulo={t("home.disponibilidad")} onClick={() => router.push("/disponibilidad")} />
          <FilaAcceso Icono={IconoDuo} titulo={t("home.companeroFijo")} onClick={() => router.push("/companero-fijo")} />
        </div>
      </div>

      <div className="flex flex-col">
        <Subtitulo>{t("home.recursos")}</Subtitulo>
        <div className="flex flex-col border-t-2 border-ink mt-2">
          <FilaAcceso Icono={IconoPin} titulo={t("home.canchas")} onClick={() => router.push("/canchas")} />
          <FilaAcceso Icono={IconoLista} titulo={t("home.misPartidos")} onClick={() => router.push("/mis-partidos")} />
        </div>
      </div>

      <div className="flex flex-col">
        <Subtitulo>{t("home.cuenta")}</Subtitulo>
        <div className="flex flex-col border-t-2 border-ink mt-2">
          <FilaAcceso Icono={IconoPersona} titulo={t("home.miPerfil")} onClick={() => router.push("/perfil")} />
          {perfil.es_superusuario && (
            <FilaAcceso Icono={IconoLlave} titulo={t("home.adminCanchas")} onClick={() => router.push("/admin/canchas")} />
          )}
        </div>
      </div>

      {/* 11.b Próximamente (US-5.1) */}
      <div className="flex flex-col">
        <Subtitulo>{t("home.seViene")}</Subtitulo>
        <div className="flex flex-col border-t-2 border-ink mt-2 opacity-70">
          <FilaAcceso
            Icono={IconoCalendario}
            titulo={t("home.reservarCancha")}
            desc={t("home.proximamente")}
            onClick={() => setProximamenteTocado(t("home.reservarCancha"))}
          />
        </div>
        {proximamenteTocado && (
          <span className="text-xs text-muted mt-2">{t("home.enDesarrollo", { texto: proximamenteTocado })}</span>
        )}
      </div>

      </div>

      {/* 12. Pie de página */}
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted pt-4 col-completa">
        {t("home.footerAntes")}
        <IconoCorazon width={13} height={13} aria-hidden />
        {t("home.footerDespues")}
      </p>
    </div>
  );
}
