"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import Logo from "@/components/Logo";
import DotDigit from "@/components/DotDigit";
import IlustracionCancha from "@/components/IlustracionCancha";
import ContadorNumero from "@/components/ContadorNumero";
import InstalarApp from "@/components/InstalarApp";
import { useEnPantalla } from "@/lib/useEnPantalla";
import marcadorStyles from "@/components/Marcador.module.css";
import {
  IconoMenu,
  IconoCampana,
  IconoPelota,
  IconoCalendario,
  IconoLupa,
  IconoTrofeo,
  IconoCarrito,
  IconoMensaje,
  IconoSobre,
  IconoRadar,
  IconoDuo,
  IconoPin,
  IconoLista,
  IconoPersona,
  IconoLlave,
  IconoSinConexion,
  IconoEngranaje,
} from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

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
const tarjeta = "bg-surface text-ink rounded-[18px] p-4 shadow-[0_1px_3px_rgba(20,38,31,0.08)]";

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
        {mostrarCartel && <span className={marcadorStyles.miniCartelSet}>🏆 Set ganado</span>}
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
  const [refPadelShop, visiblePadelShop] = useEnPantalla();
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

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // A pedido del usuario (2026-09-06): la app ahora arranca por
        // "Elegí tu deporte" (sin sesión), no directo al login -- ver
        // ElegirDeporteForm.js.
        router.replace("/elegir-deporte");
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

  if (!perfil) return null;

  return (
    <div className="w-full max-w-md flex flex-col gap-4 pb-10">
      <InstalarApp />

      {/* 1. Saludo + ranking */}
      <div className={`${tarjeta} flex items-center justify-between`}>
        <button onClick={() => router.push("/perfil")} className="flex items-center gap-3 text-left cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-bg overflow-hidden flex items-center justify-center flex-shrink-0">
            {perfil.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Logo size={26} />
            )}
          </div>
          <div>
            <span className="font-heading text-lg font-semibold block">
              {t("home.saludo", { nombre: perfil.nombre.split(" ")[0] })}
            </span>
            <span className="text-muted text-sm">{t("home.puntosRanking", { puntos: perfil.puntos_ranking })}</span>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/menu")}
            className="w-9 h-9 rounded-full bg-bg flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label={t("home.verTodo")}
            title={t("home.verTodo")}
          >
            <IconoMenu />
          </button>
          <button
            onClick={() => router.push("/configuracion")}
            className="w-9 h-9 rounded-full bg-bg flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label={t("home.configuracion")}
            title={t("home.configuracion")}
          >
            <IconoEngranaje />
          </button>
          <button
            onClick={handleAbrirNotificaciones}
            className="relative w-9 h-9 rounded-full bg-bg flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label={t("home.notificaciones")}
          >
            <IconoCampana />
            {noLeidas > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-heading font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </button>
        </div>
      </div>

      {mostrarNotificaciones && (
        <div className={`${tarjeta} flex flex-col gap-2`}>
          <div className="flex items-center justify-between">
            <span className="font-heading font-semibold text-sm">{t("home.notificaciones")}</span>
            <div className="flex items-center gap-2">
              {noLeidas > 0 && (
                <button onClick={handleMarcarTodasLeidas} className="text-xs text-muted underline">
                  {t("home.marcarTodasLeidas")}
                </button>
              )}
              <button onClick={() => setMostrarNotificaciones(false)} className="text-xs text-muted">
                {t("home.cerrar")}
              </button>
            </div>
          </div>
          {notificaciones.length === 0 && (
            <span className="text-sm text-muted">{t("home.sinNotificaciones")}</span>
          )}
          {notificaciones.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClickNotificacion(n)}
              className={`text-left rounded-[12px] p-2 flex flex-col gap-0.5 cursor-pointer ${
                n.leida ? "bg-bg" : "bg-accent/20"
              }`}
            >
              <span className="text-sm">{n.mensaje}</span>
              <span className="text-xs text-muted">{new Date(n.creado_en).toLocaleString("es-AR")}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* 2. Próximo partido -- con el chip de fecha tipo "calendario", como
          en la referencia que trajo el usuario. */}
      <div className={`${tarjeta} flex items-center gap-3`}>
        {resumen?.proximo_partido ? (
          (() => {
            const { dia, mes } = diaYMesCorto(resumen.proximo_partido.fecha_hora, locale);
            return (
              <button
                onClick={() => router.push(`/partido/${resumen.proximo_partido.partido_id}`)}
                className="flex items-center gap-3 text-left cursor-pointer w-full"
              >
                <div className="w-11 h-11 rounded-[12px] bg-accent text-accent-ink flex flex-col items-center justify-center flex-shrink-0 leading-none">
                  <span className="text-[10px] font-heading font-bold">{mes}</span>
                  <span className="text-sm font-heading font-bold">{dia}</span>
                </div>
                <div>
                  <span className="font-heading font-semibold text-sm block">{t("home.tuProximoPartido")}</span>
                  <span className="text-muted text-sm">
                    {formatearFecha(resumen.proximo_partido.fecha_hora, locale)} · {resumen.proximo_partido.cancha}
                  </span>
                </div>
              </button>
            );
          })()
        ) : (
          <div>
            <span className="font-heading font-semibold text-sm block mb-1">{t("home.tuProximoPartido")}</span>
            <span className="text-sm text-muted">{t("home.sinProximoPartido")}</span>
          </div>
        )}
      </div>

      {/* 3. Invitaciones pendientes */}
      {resumen?.invitaciones_pendientes > 0 && (
        <button
          onClick={() => router.push("/invitaciones")}
          className="font-heading font-semibold text-sm px-4 py-3 rounded-[16px] bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer text-left flex items-center gap-2"
        >
          <IconoCampana />
          {t(resumen.invitaciones_pendientes > 1 ? "home.invitacionPendientePlur" : "home.invitacionPendienteSing", {
            n: resumen.invitaciones_pendientes,
          })}
        </button>
      )}

      {/* 4. Sección "Jugar" -- Marcadorcito como hero + las dos acciones
          más frecuentes debajo. */}
      <div className="flex flex-col gap-3">
        <Subtitulo>{t("home.jugar")}</Subtitulo>

        <button
          onClick={() => router.push("/marcador-libre")}
          className="font-heading font-bold text-xl px-6 py-6 rounded-[20px] bg-accent text-accent-ink border-2 border-outline shadow-[0_2px_6px_rgba(20,38,31,0.12)] cursor-pointer flex items-center gap-4 text-left relative overflow-hidden"
        >
          <ContenidoMarcadorcitoDemo />
        </button>

        <div className="flex gap-3">
          <button
            onClick={irACrearPartido}
            className="tarjeta-pelota-loop flex-[2] font-heading font-semibold text-sm px-4 py-4 rounded-[16px] bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer flex items-center justify-center gap-2"
          >
            <span className={`icono-calendario-anim ${animandoCrear ? "anim-activa" : ""}`}><IconoCalendario /></span>{" "}
            {t("home.crearPartido")}
          </button>
          <button
            onClick={irAPartidosAbiertos}
            className="flex-1 font-heading font-semibold text-sm px-4 py-4 rounded-[16px] bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="icono-lupa-loop">
              <span className={`icono-lupa-anim ${animandoAbiertos ? "anim-activa" : ""}`}><IconoLupa /></span>
            </span>{" "}
            {t("home.abiertos")}
          </button>
        </div>
      </div>

      {/* 5. Último partido jugado */}
      <div className={tarjeta}>
        <span className="font-heading font-semibold text-sm block mb-1">{t("home.ultimoPartidoJugado")}</span>
        {resumen?.ultimo_partido ? (
          <span className="text-sm text-muted flex items-center gap-1.5">
            {resumen.ultimo_partido.gano && (
              <span className="icono-trofeo-festejo">
                <IconoTrofeo width={15} height={15} />
              </span>
            )}
            {resumen.ultimo_partido.gano ? t("home.ganaste") : t("home.perdiste")} {t("home.vs")}{" "}
            {resumen.ultimo_partido.rival_nombres} (
            {formatearResultado(resumen.ultimo_partido.sets_a, resumen.ultimo_partido.sets_b)})
          </span>
        ) : (
          <span className="text-sm text-muted">{t("home.noJugasteNinguno")}</span>
        )}
      </div>

      {/* 6/7/8. Racha, posición, estadística rápida */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={handleVerHistorial} className={`${tarjeta} text-center cursor-pointer`}>
          <span className="font-heading text-xl font-semibold block">
            <ContadorNumero valor={resumen?.racha_actual ?? 0} />
          </span>
          <span className="text-xs text-muted">{t("home.rachaGanada")}</span>
        </button>
        <button onClick={() => router.push("/jugadores")} className={`${tarjeta} text-center cursor-pointer`}>
          <span className="font-heading text-xl font-semibold block">
            {resumen?.posicion_ranking ? <ContadorNumero valor={resumen.posicion_ranking} prefijo="#" /> : "#-"}
          </span>
          <span className="text-xs text-muted">
            {t("home.deRanking", { total: resumen?.total_jugadores ?? "-" })}
          </span>
        </button>
        <button onClick={handleVerHistorial} className={`${tarjeta} text-center cursor-pointer`}>
          <span className="font-heading text-xl font-semibold block">
            <ContadorNumero valor={resumen?.porcentaje_victorias ?? 0} sufijo="%" />
          </span>
          <span className="text-xs text-muted">{t("home.jugadosSufijo", { n: resumen?.partidos_jugados ?? 0 })}</span>
        </button>
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
              <div key={h.partido_id} className="bg-bg rounded-[12px] p-2 flex flex-col gap-0.5">
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

      {/* 9. Espacio de publicidad + cancha recomendada */}
      <div className="bg-accent/15 rounded-[16px] p-4 flex items-center gap-3 relative overflow-hidden">
        <span className="absolute top-1.5 right-2 text-[10px] uppercase tracking-wide text-muted font-heading font-semibold">
          {t("home.auspiciadoEjemplo")}
        </span>
        <span ref={refPadelShop} className={`icono-pop ${visiblePadelShop ? "visible" : ""}`}>
          <IconoCarrito width={26} height={26} />
        </span>
        <div className="flex flex-col text-ink">
          <span className="font-heading font-semibold text-sm">Padel Pro Shop Mendoza</span>
          <span className="text-sm text-muted">20% OFF en paletas esta semana con el código PADELAPP</span>
        </div>
      </div>
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

      {/* 11. Resto de accesos, en secciones agrupadas -- tarjetas claras con
          tinte de color (accent-2/accent-3) en vez de bloques sólidos con
          borde grueso. */}
      <div className="flex flex-col gap-3">
        <Subtitulo>{t("home.comunidad")}</Subtitulo>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => router.push("/jugadores")}
            className={`${tarjeta} flex items-center gap-3 text-left`}
          >
            <div
              ref={refJugadores}
              className={`icono-pop icono-trofeo-loop ${visibleJugadores ? "visible" : ""} w-10 h-10 rounded-full bg-accent-2/20 flex items-center justify-center flex-shrink-0`}
            >
              <IconoTrofeo />
            </div>
            <div className="min-w-0">
              <span className="font-heading font-semibold text-sm block">{t("home.jugadoresTitulo")}</span>
              <span className="text-xs text-muted block truncate">{t("home.jugadoresDesc")}</span>
            </div>
          </button>
          <button
            onClick={() => router.push("/mensajes")}
            className={`${tarjeta} flex items-center gap-3 text-left`}
          >
            <div
              ref={refMensajes}
              className={`icono-pop icono-mensaje-loop ${visibleMensajes ? "visible" : ""} w-10 h-10 rounded-full bg-accent-2/20 flex items-center justify-center flex-shrink-0`}
              style={{ animationDelay: "60ms" }}
            >
              <IconoMensaje />
            </div>
            <div className="min-w-0">
              <span className="font-heading font-semibold text-sm block">{t("home.mensajesTitulo")}</span>
              <span className="text-xs text-muted block truncate">{t("home.mensajesDesc")}</span>
            </div>
          </button>
          <button
            onClick={() => router.push("/invitaciones")}
            className={`${tarjeta} flex items-center gap-3 text-left relative col-span-2`}
          >
            <div
              ref={refInvitaciones}
              className={`icono-pop icono-sobre-loop ${visibleInvitaciones ? "visible" : ""} w-10 h-10 rounded-full bg-accent-2/20 flex items-center justify-center flex-shrink-0`}
              style={{ animationDelay: "120ms" }}
            >
              <IconoSobre />
            </div>
            <div className="min-w-0">
              <span className="font-heading font-semibold text-sm block">{t("home.invitacionesTitulo")}</span>
              <span className="text-xs text-muted block truncate">{t("home.invitacionesDesc")}</span>
            </div>
            {resumen?.invitaciones_pendientes > 0 && (
              <span className="ml-auto bg-accent text-accent-ink text-xs font-heading font-semibold rounded-full px-2 py-0.5 flex-shrink-0">
                {resumen.invitaciones_pendientes}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Subtitulo>{t("home.matchmaking")}</Subtitulo>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/disponibilidad")}
            className="flex-1 font-heading font-semibold text-sm px-4 py-3 rounded-[14px] bg-accent-2/15 border border-accent-2 text-ink shadow-[0_1px_3px_rgba(20,38,31,0.06)] cursor-pointer flex items-center justify-center gap-2"
          >
            <IconoRadar /> {t("home.disponibilidad")}
          </button>
          <button
            onClick={() => router.push("/companero-fijo")}
            className="flex-1 font-heading font-semibold text-sm px-4 py-3 rounded-[14px] bg-accent-2/15 border border-accent-2 text-ink shadow-[0_1px_3px_rgba(20,38,31,0.06)] cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="icono-duo-loop"><IconoDuo /></span> {t("home.companeroFijo")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Subtitulo>{t("home.recursos")}</Subtitulo>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/canchas")}
            className="flex-[2] font-heading font-semibold text-sm px-4 py-3 rounded-[20px] bg-accent-3/15 border border-accent-3 text-ink shadow-[0_1px_3px_rgba(20,38,31,0.06)] cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="icono-pin-loop"><IconoPin /></span> {t("home.canchas")}
          </button>
          <button
            onClick={() => router.push("/mis-partidos")}
            className="flex-1 font-heading font-semibold text-sm px-4 py-3 rounded-[20px] bg-accent-3/15 border border-accent-3 text-ink shadow-[0_1px_3px_rgba(20,38,31,0.06)] cursor-pointer flex items-center justify-center gap-2"
          >
            <IconoLista /> {t("home.misPartidos")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Subtitulo>{t("home.cuenta")}</Subtitulo>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/perfil")}
            className="flex-1 font-heading font-semibold text-sm px-4 py-3 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="icono-persona-corre"><IconoPersona /></span> {t("home.miPerfil")}
          </button>
          <button
            onClick={() => setMostrarMas((v) => !v)}
            className="font-heading font-semibold text-sm px-4 py-3 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
          >
            {mostrarMas ? t("home.menos") : t("home.mas")}
          </button>
        </div>

        {mostrarMas && (
          <div className="flex flex-col gap-2 pl-1">
            {perfil.es_superusuario && (
              <button
                onClick={() => router.push("/admin/canchas")}
                className="text-left font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink cursor-pointer flex items-center gap-2"
              >
                <IconoLlave width={16} height={16} /> {t("home.adminCanchas")}
              </button>
            )}
            <button
              onClick={() => router.push("/elegir-deporte")}
              className="text-left font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink cursor-pointer flex items-center gap-2"
            >
              <IconoPelota width={16} height={16} /> {t("home.cambiarDeporte")}
            </button>
          </div>
        )}
      </div>

      {/* 11.b Próximamente (US-5.1) */}
      <div className={`${tarjeta} flex flex-col gap-2`}>
        <span className="font-heading font-semibold text-sm">{t("home.seViene")}</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { Icono: IconoCalendario, clave: "reservarCancha" },
            { Icono: IconoSinConexion, clave: "modoSinConexion" },
          ].map((item) => (
            <button
              key={item.clave}
              onClick={() => setProximamenteTocado(t(`home.${item.clave}`))}
              className="relative font-heading font-semibold text-xs px-3 py-3 rounded-[12px] bg-bg text-muted cursor-pointer text-left opacity-70 flex items-center gap-2"
            >
              <span className="absolute -top-2 -right-1 bg-accent text-accent-ink text-[9px] px-1.5 py-0.5 rounded-full">
                {t("home.proximamente")}
              </span>
              <item.Icono width={16} height={16} className="icono-pulso-suave" /> {t(`home.${item.clave}`)}
            </button>
          ))}
        </div>
        {proximamenteTocado && (
          <span className="text-xs text-muted">{t("home.enDesarrollo", { texto: proximamenteTocado })}</span>
        )}
      </div>

      {/* 12. Pie de página */}
      <p className="text-center text-xs text-muted pt-4">{t("home.footer")}</p>
    </div>
  );
}
