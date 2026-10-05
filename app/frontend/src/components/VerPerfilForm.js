"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { leerPantalla, guardarPantalla } from "@/lib/cachePantalla";
import HojaAbajo from "@/components/HojaAbajo";
import PelotaLoader from "@/components/PelotaLoader";
import AvatarUpload from "@/components/AvatarUpload";
import Logo from "@/components/Logo";
import InstalarApp from "@/components/InstalarApp";
import DestacadosPerfil from "@/components/DestacadosPerfil";
import { calcularDestacados } from "@/lib/destacadosPerfil";
import BarraEstadistica from "@/components/BarraEstadistica";
import Toggle from "@/components/Toggle";
import { calcularResumenEstadisticas, calcularPuntosRanking } from "@/lib/estadisticasMarcadorcito";
import { IconoTelefono, IconoPersona, IconoMapa, IconoPin, IconoMano, IconoPelota, IconoCampana, IconoMensaje, IconoOjo, IconoOjoTachado, IconoTrofeo, IconoChevron, IconoEstrella } from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/config";

const PROVINCIAS = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco",
  "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
].map((nombre) => ({ valor: nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_"), etiqueta: nombre }));

const ZONAS = [
  { valor: "ciudad_de_mendoza", etiqueta: "Ciudad de Mendoza" },
  { valor: "godoy_cruz", etiqueta: "Godoy Cruz" },
  { valor: "guaymallen", etiqueta: "Guaymallén" },
  { valor: "las_heras", etiqueta: "Las Heras" },
  { valor: "lujan_de_cuyo", etiqueta: "Luján de Cuyo" },
  { valor: "maipu", etiqueta: "Maipú" },
];

const NIVELES_VALORES = [1, 2, 3, 4, 5, 6, 7];

function etiquetaNivel(n, t) {
  if (n === 1) return t("directorio.opcionNivelMaxima");
  if (n === 7) return t("directorio.opcionNivelMinima");
  return t("directorio.opcionNivelGenerica", { n });
}

function zonaLabel(valor, t) {
  const z = ZONAS.find((z) => z.valor === valor);
  if (z) return z.etiqueta;
  if (valor === "otra_zona") return t("completarPerfil.otraZona");
  return valor;
}

function etiquetaDe(opciones, valor) {
  return opciones.find((o) => o.valor === valor)?.etiqueta ?? valor;
}

// Rediseño Cartel (2026-10-01): campos con esquina casi recta y línea fina,
// etiqueta chica en mayúscula arriba de cada uno.
const inputClass =
  "rounded-[6px] bg-surface border border-ink/15 px-3 py-2.5 text-ink";
const etiquetaCampo = "text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted";

// Pantalla de "ver mi perfil" (US-1.3) con modo edición (US-1.4). Trae la
// fila de `perfiles` del usuario logueado; por defecto se muestra en modo
// solo lectura, y el botón "Editar" la pasa a un formulario editable que
// hace UPDATE sobre esa misma fila (a diferencia de "completar perfil",
// que hace INSERT porque la fila todavía no existe).
export default function VerPerfilForm() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [modoEdicion, setModoEdicion] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sexo, setSexo] = useState("");
  const [provincia, setProvincia] = useState("");
  const [zona, setZona] = useState("");
  const [nivel, setNivel] = useState("");
  const [manoHabil, setManoHabil] = useState("");
  const [posicion, setPosicion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState("");

  const [mostrarConfirmacionBaja, setMostrarConfirmacionBaja] = useState(false);
  const [dandoBaja, setDandoBaja] = useState(false);
  const [errorBaja, setErrorBaja] = useState("");
  // Eliminar la cuenta de verdad (2026-10-05, SQL 081): hoja con confirmación escrita.
  const [mostrarEliminar, setMostrarEliminar] = useState(false);
  const [textoEliminar, setTextoEliminar] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");

  const [perfilInactivo, setPerfilInactivo] = useState(null);
  const [reactivando, setReactivando] = useState(false);
  const [errorReactivacion, setErrorReactivacion] = useState("");

  const [partidosStats, setPartidosStats] = useState(null);
  // Destacados "Cara a cara" (2026-10-02): null hasta que llegan, o si no
  // hay partidos terminados (o la RPC 068 todavía no se corrió).
  const [destacados, setDestacados] = useState(null);
  const [cargandoEstadisticas, setCargandoEstadisticas] = useState(true);
  const [mostrarPartidosStats, setMostrarPartidosStats] = useState(false);
  // Colapsado por defecto (2026-09-13, a pedido del usuario: "que
  // estadísticas se vea como un desplegable porque si no ocupa mucho el
  // perfil") -- toda la sección arranca cerrada, como una tarjeta
  // acordeón (opción elegida sobre un mockup con 2 alternativas).
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false);
  const estadisticasRef = useRef(null);

  // Tocar el tile de "Ranking" lleva directo al resumen de puntos ganados
  // POR PARTIDO (2026-09-13, a pedido del usuario: "no debería abrir el de
  // estadísticas [genéricas], debería mostrar los puntos ganados en cada
  // partido") -- abre el acordeón Y la lista de partidos de una, en vez de
  // dejar que el usuario tenga que buscarla y tocarla aparte.
  function irAEstadisticas() {
    setMostrarEstadisticas(true);
    setMostrarPartidosStats(true);
    requestAnimationFrame(() => estadisticasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  // Boton "Guardar cambios" deshabilitado hasta que los 7 campos
  // obligatorios del modo edicion esten completos.
  const formularioEdicionCompleto =
    nombre.trim() !== "" &&
    telefono.trim() !== "" &&
    sexo !== "" &&
    zona !== "" &&
    nivel !== "" &&
    manoHabil !== "" &&
    posicion !== "";

  useEffect(() => {
    async function cargarPerfil() {
      const {
        data: { user },
        error: userError,
      } = await usuarioRapido();

      if (userError || !user) {
        // Sin sesión activa: redirigimos al login en vez de mostrar esta
        // pantalla (US-1.5 -- no se debe ver contenido protegido sin sesión).
        router.replace("/login");
        return;
      }

      // Copia de la última vez (2026-09-30): se ve al toque mientras se
      // piden los datos nuevos.
      const copia = leerPantalla("perfil", user.id);
      if (copia) {
        setPerfil(copia.perfil);
        if (copia.partidosStats !== undefined) {
          setPartidosStats(copia.partidosStats);
          setCargandoEstadisticas(false);
        }
        if (copia.destacados !== undefined) setDestacados(copia.destacados);
        setCargando(false);
      }

      // RLS ("Ver mi propio perfil") ya garantiza que esto solo puede
      // devolver la fila de este usuario, aunque el filtro de abajo
      // tuviera un error -- es una segunda capa de seguridad, no la única.
      const { data, error: perfilError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (perfilError) {
        setError(t("verPerfil.noSePudoCargar", { mensaje: perfilError.message }));
        setCargando(false);
        return;
      }

      if (!data) {
        // No debería pasar (completar el perfil es obligatorio antes de
        // usar el resto de la app), pero por las dudas no mostramos una
        // pantalla vacía o rota: mandamos a completarlo.
        router.replace("/completar-perfil");
        return;
      }

      if (data.activo === false) {
        // US-1.6: cuenta dada de baja -- no se muestra el perfil directo,
        // se pregunta primero si quiere reactivarla (decisión de diseño:
        // la reactivación no es automática por loguearse de nuevo).
        setPerfilInactivo(data);
        setCargando(false);
        return;
      }

      setPerfil(data);
      setCargando(false);
      guardarPantalla("perfil", user.id, { ...(leerPantalla("perfil", user.id) ?? {}), perfil: data });

      // Estadísticas de Marcadorcito (2026-09-13): no bloquea el resto del
      // perfil -- si tarda o falla, el resto de la pantalla ya se ve.
      cargarEstadisticas(user.id);
    }

    // Destacados del perfil (2026-10-02): nombres de compañeros y rivales
    // vía RPC (la RLS de perfiles no deja leerlos directo). Si la RPC no
    // existe todavía, simplemente no se muestran.
    async function cargarDestacados(jugadorId) {
      const { data, error } = await supabase.rpc("mis_cruces_partidos");
      if (error) return;
      const d = calcularDestacados(data);
      setDestacados(d);
      guardarPantalla("perfil", jugadorId, { ...(leerPantalla("perfil", jugadorId) ?? {}), destacados: d });
    }

    async function cargarEstadisticas(jugadorId) {
      cargarDestacados(jugadorId);
      const { data: misFilas } = await supabase
        .from("partido_jugadores")
        .select("partido_id, equipo")
        .eq("jugador_id", jugadorId)
        .not("equipo", "is", null);

      const idsPartidos = (misFilas ?? []).map((f) => f.partido_id);

      if (idsPartidos.length === 0) {
        setCargandoEstadisticas(false);
        return;
      }

      const equipoPorPartido = Object.fromEntries((misFilas ?? []).map((f) => [f.partido_id, f.equipo]));

      // Un solo pedido: partido (fecha/cancha) + resultado (para saber si
      // gané) + estadísticas, todo junto -- para poder listar cada
      // partido por separado y dejarlo seleccionable (2026-09-13, a
      // pedido del usuario), no solo el resumen sumado.
      const { data: partidosData } = await supabase
        .from("partidos")
        .select("id, fecha_hora, cancha, resultados_partido(ganador, estado), estadisticas_partido(*)")
        .in("id", idsPartidos)
        .order("fecha_hora", { ascending: false });

      // Ojo: como partido_id es la PRIMARY KEY de ambas tablas hijas,
      // PostgREST las trae como OBJETO (relación 1 a 1), no como array
      // -- a diferencia del embed típico "uno a muchos".
      const partidosConStats = (partidosData ?? [])
        .filter((p) => p.estadisticas_partido)
        .map((p) => {
          const miEquipo = equipoPorPartido[p.id];
          const gane = p.resultados_partido?.ganador === miEquipo;
          return {
            id: p.id,
            fechaHora: p.fecha_hora,
            cancha: p.cancha,
            miEquipo,
            gane,
            stats: p.estadisticas_partido,
            puntosRankingGanados: calcularPuntosRanking(p.resultados_partido?.estado, miEquipo, gane),
          };
        });

      setPartidosStats(partidosConStats.length > 0 ? partidosConStats : null);
      setCargandoEstadisticas(false);
      guardarPantalla("perfil", jugadorId, {
        ...(leerPantalla("perfil", jugadorId) ?? {}),
        partidosStats: partidosConStats.length > 0 ? partidosConStats : null,
      });
    }

    cargarPerfil();
  }, [router]);

  function comenzarEdicion() {
    // Prellenamos los campos editables con los valores actuales -- recién
    // acá, al entrar en modo edición (no todo el tiempo), porque en modo
    // lectura no hace falta tener ese estado duplicado.
    setNombre(perfil.nombre);
    setTelefono(perfil.telefono);
    setSexo(perfil.sexo);
    setProvincia(perfil.provincia);
    setZona(perfil.zona);
    setNivel(String(perfil.nivel));
    setManoHabil(perfil.mano_habil);
    setPosicion(perfil.posicion);
    setErrorGuardado("");
    setModoEdicion(true);
  }

  function cancelarEdicion() {
    setModoEdicion(false);
    setErrorGuardado("");
  }

  async function handleCerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // US-3.4: apagar/prender notificaciones sin tener que dar de baja la
  // cuenta (mismo criterio de aceptación que "salir de un partido" -- tiene
  // que ser igual de fácil optar por no recibirlas).
  async function handleToggleNotificaciones() {
    const nuevoValor = !perfil.notificaciones_activas;
    setPerfil((p) => ({ ...p, notificaciones_activas: nuevoValor }));
    await supabase.from("perfiles").update({ notificaciones_activas: nuevoValor }).eq("id", perfil.id);
  }

  // A pedido del usuario (2026-09-06): el botón de WhatsApp junto al
  // teléfono de un partido compartido pasa a ser opt-in (por defecto
  // apagado) -- WhatsApp expone más datos (foto, estado) que un número
  // suelto, y no todos quieren eso visible para cualquier confirmado.
  async function handleToggleWhatsapp() {
    const nuevoValor = !perfil.mostrar_whatsapp;
    setPerfil((p) => ({ ...p, mostrar_whatsapp: nuevoValor }));
    await supabase.from("perfiles").update({ mostrar_whatsapp: nuevoValor }).eq("id", perfil.id);
  }

  // A pedido del usuario (2026-09-12): el teléfono se mostraba siempre a
  // los demás jugadores de un partido en cuanto confirmabas asistencia,
  // sin que la persona pudiera elegir -- pasa a ser opt-in, por defecto
  // apagado (mismo criterio que mostrar_whatsapp).
  async function handleToggleTelefono() {
    const nuevoValor = !perfil.mostrar_telefono;
    setPerfil((p) => ({ ...p, mostrar_telefono: nuevoValor, mostrar_whatsapp: nuevoValor ? p.mostrar_whatsapp : false }));
    await supabase
      .from("perfiles")
      .update({ mostrar_telefono: nuevoValor, ...(nuevoValor ? {} : { mostrar_whatsapp: false }) })
      .eq("id", perfil.id);
  }

  // US-1.6: da de baja la cuenta (baja lógica, nunca DELETE real -- la
  // tabla `perfiles` ni siquiera tiene permiso de DELETE en Supabase).
  async function handleDarBaja() {
    setErrorBaja("");
    setDandoBaja(true);

    const { error: bajaError } = await supabase
      .from("perfiles")
      .update({ activo: false, dado_de_baja_en: new Date().toISOString() })
      .eq("id", perfil.id);

    setDandoBaja(false);

    if (bajaError) {
      setErrorBaja(t("verPerfil.noSePudoDarBaja", { mensaje: bajaError.message }));
      return;
    }

    // La cuenta ya no está activa -- cerramos la sesión (US-1.5) y
    // volvemos al login.
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Borra los datos personales y deja los partidos como "Jugador eliminado".
  // No se puede deshacer. Primero se borran las fotos del perfil y después se
  // llama a la base (eliminar_mi_cuenta, SQL 081); al final se cierra la sesión.
  async function handleEliminarCuenta() {
    setErrorEliminar("");
    if (textoEliminar.trim().toUpperCase() !== "ELIMINAR") {
      setErrorEliminar("Escribí ELIMINAR para confirmar.");
      return;
    }
    setEliminando(true);
    try {
      const { data: archivos } = await supabase.storage.from("avatars").list(perfil.id);
      if (archivos?.length) {
        await supabase.storage.from("avatars").remove(archivos.map((a) => `${perfil.id}/${a.name}`));
      }
    } catch {
      // Si la foto no se pudo borrar, igual se sigue: el perfil ya no la muestra.
    }
    const { error: rpcError } = await supabase.rpc("eliminar_mi_cuenta", { p_confirmacion: "ELIMINAR" });
    if (rpcError) {
      setEliminando(false);
      setErrorEliminar("No se pudo eliminar la cuenta. Probá de nuevo en un rato.");
      return;
    }
    try {
      await supabase.auth.signOut();
      Object.keys(localStorage)
        .filter((k) => k.startsWith("marcadorcito_") || k.startsWith("sb-"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // nada
    }
    window.location.replace("/");
  }

  // US-1.6 (paso 2): reactivar una cuenta que estaba dada de baja.
  async function handleReactivar() {
    setErrorReactivacion("");
    setReactivando(true);

    const { data, error: reactivarError } = await supabase
      .from("perfiles")
      .update({ activo: true, dado_de_baja_en: null })
      .eq("id", perfilInactivo.id)
      .select()
      .single();

    setReactivando(false);

    if (reactivarError) {
      setErrorReactivacion(t("verPerfil.noSePudoReactivar", { mensaje: reactivarError.message }));
      return;
    }

    setPerfil(data);
    setPerfilInactivo(null);
  }

  async function handleCancelarReactivacion() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleGuardar(e) {
    e.preventDefault();
    setErrorGuardado("");

    setGuardando(true);

    const { data, error: updateError } = await supabase
      .from("perfiles")
      .update({
        nombre,
        telefono,
        sexo,
        provincia,
        zona,
        nivel: Number(nivel),
        mano_habil: manoHabil,
        posicion,
      })
      .eq("id", perfil.id)
      .select()
      .single();

    setGuardando(false);

    if (updateError) {
      setErrorGuardado(t("verPerfil.noSePudoGuardar", { mensaje: updateError.message }));
      return;
    }

    setPerfil(data);
    setModoEdicion(false);
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("verPerfil.cargando")}</p>
      </div>
    );
  }

  if (perfilInactivo) {
    return (
      // Rediseño Cartel (2026-10-01): sin tarjeta; reactivar es el único
      // botón amarillo y cancelar va liviano, con contorno fino.
      <div className="w-full max-w-md text-ink flex flex-col gap-4">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">
          {t("verPerfil.cuentaDadaDeBaja")}
        </h1>
        <p className="text-muted text-[15px] leading-relaxed pb-4 border-b border-ink/10">{t("verPerfil.preguntaReactivar")}</p>

        {errorReactivacion && (
          <p className="text-red-600 text-sm">{errorReactivacion}</p>
        )}

        <button
          onClick={handleReactivar}
          disabled={reactivando}
          className="w-full font-titulo font-black uppercase text-[1.6rem] leading-none px-4 py-4 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {reactivando && <PelotaLoader />}
          {reactivando ? t("verPerfil.reactivando") : t("verPerfil.reactivarCuenta")}
        </button>
        <button
          type="button"
          onClick={handleCancelarReactivacion}
          disabled={reactivando}
          className="w-full text-sm font-semibold px-4 py-3 rounded-[6px] border border-ink/15 text-ink cursor-pointer disabled:opacity-60"
        >
          {t("verPerfil.cancelar")}
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md bg-surface text-ink border border-ink/10 rounded-[8px] p-6">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!perfil) {
    // Se está redirigiendo a /completar-perfil; no hay nada que mostrar acá.
    return null;
  }

  if (modoEdicion) {
    return (
      <form
        onSubmit={handleGuardar}
        className="w-full max-w-md text-ink flex flex-col gap-4"
      >
        {/* Rediseño Cartel (2026-10-01): sin tarjeta contenedora; título con
            línea gruesa abajo, guardar es el único botón amarillo. */}
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95] pb-3 border-b-2 border-ink">{t("verPerfil.editarPerfil")}</h1>

        <AvatarUpload
          userId={perfil.id}
          avatarUrl={perfil.avatar_url}
          onUploaded={async (url) => {
            setPerfil((prev) => ({ ...prev, avatar_url: url }));
            await supabase.from("perfiles").update({ avatar_url: url }).eq("id", perfil.id);
          }}
        />

        <label className="flex flex-col gap-1">
          <span className={etiquetaCampo}>{t("verPerfil.nombre")}</span>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={etiquetaCampo}>{t("verPerfil.telefono")}</span>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={etiquetaCampo}>{t("verPerfil.sexo")}</span>
          <select
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            required
            className={inputClass}
          >
            <option value="masculino">{t("directorio.masculino")}</option>
            <option value="femenino">{t("directorio.femenino")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={etiquetaCampo}>{t("verPerfil.provincia")}</span>
          <select
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
            required
            className={inputClass}
          >
            {PROVINCIAS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.etiqueta}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={etiquetaCampo}>{t("verPerfil.zona")}</span>
          <select
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            required
            className={inputClass}
          >
            {ZONAS.map((z) => (
              <option key={z.valor} value={z.valor}>
                {z.etiqueta}
              </option>
            ))}
            <option value="otra_zona">{t("completarPerfil.otraZona")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={etiquetaCampo}>{t("verPerfil.nivelDeJuego")}</span>
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            required
            className={inputClass}
          >
            {NIVELES_VALORES.map((n) => (
              <option key={n} value={n}>
                {etiquetaNivel(n, t)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={etiquetaCampo}>{t("verPerfil.manoHabil")}</span>
          <select
            value={manoHabil}
            onChange={(e) => setManoHabil(e.target.value)}
            required
            className={inputClass}
          >
            <option value="diestro">{t("directorio.diestro")}</option>
            <option value="zurdo">{t("directorio.zurdo")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={etiquetaCampo}>{t("verPerfil.posicion")}</span>
          <select
            value={posicion}
            onChange={(e) => setPosicion(e.target.value)}
            required
            className={inputClass}
          >
            <option value="drive">{t("companero.drive")}</option>
            <option value="reves">{t("companero.reves")}</option>
          </select>
        </label>

        {errorGuardado && (
          <p className="text-red-600 text-sm">{errorGuardado}</p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="submit"
            disabled={guardando || !formularioEdicionCompleto}
            className="w-full font-titulo font-black uppercase text-[1.6rem] leading-none px-4 py-4 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {guardando && <PelotaLoader />}
            {guardando ? t("verPerfil.guardando") : t("verPerfil.guardarCambios")}
          </button>
          <button
            type="button"
            onClick={cancelarEdicion}
            disabled={guardando}
            className="w-full text-sm font-semibold px-4 py-3 rounded-[6px] border border-ink/15 text-ink cursor-pointer disabled:opacity-60"
          >
            {t("verPerfil.cancelar")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-6 pantalla-mosaico text-ink">
      <div className="flex items-center justify-between gap-3 col-completa">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("verPerfil.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("verPerfil.volver")}
        </button>
      </div>

      {/* Tarjeta "hero": identidad + nivel/ranking, mismo estilo que el Home
          (2026-09-13, a pedido del usuario: "el perfil parece de otro lugar,
          hacelo parecido al estilo del Home").
          Rediseño Cartel (2026-10-01): pasa a ser la protagonista en verde
          tablero -- nombre grande y los dos números (ranking y nivel) con
          divisor, como el cartel del próximo partido en el Inicio. */}
      <div className="rounded-[6px] bg-[#154139] text-[#eaf4f0] px-4 py-4 flex flex-col gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-16 h-16 rounded-full bg-[#0f2e29] overflow-hidden flex items-center justify-center flex-shrink-0">
            {perfil.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Logo size={32} />
            )}
          </div>
          <span className="font-titulo font-black uppercase text-[2.2rem] leading-[0.9] min-w-0 break-words">{perfil.nombre}</span>
        </div>

        <div className="grid grid-cols-2 border-t border-[#eaf4f0]/15 pt-3">
          <button
            type="button"
            onClick={irAEstadisticas}
            className="flex flex-col gap-1 text-left cursor-pointer"
          >
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae] flex items-center gap-1.5">
              <IconoTrofeo width={13} height={13} aria-hidden />
              {t("perfilJugador.ranking")}
            </span>
            <span className="font-numero font-bold text-[2.6rem] leading-none">{perfil.puntos_ranking ?? 0}</span>
            <span className="text-xs text-[#c4dad3]">
              {perfil.puntos_ranking > 0 ? t("verPerfil.puntosPts", { puntos: perfil.puntos_ranking }) : t("perfilJugador.sinPartidos")}
            </span>
          </button>

          {/* Nivel (como estrellas -- 1ª es la categoría más alta, así que se
              invierte para que "más estrellas" siga significando "mejor
              nivel") + ranking, los dos datos que más le importan a un
              jugador. */}
          <div className="flex flex-col gap-1 pl-3 border-l border-[#eaf4f0]/15 min-w-0">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae]">
              {t("verPerfil.nivelDeJuego")}
            </span>
            <span className="font-numero font-bold text-[2.6rem] leading-none">
              {t("directorio.opcionNivelGenerica", { n: perfil.nivel })}
            </span>
            <span
              className="flex flex-wrap gap-0.5 text-sm leading-none overflow-hidden"
              aria-label={t("verPerfil.estrellasAriaLabel", { n: 8 - perfil.nivel })}
              title={t("perfilJugador.nivelTemplate", { etiqueta: etiquetaNivel(perfil.nivel, t) })}
            >
              {Array.from({ length: 8 - perfil.nivel }).map((_, i) => (
                <span key={`llena-${i}`} className="estrella-llena-entra text-accent" style={{ animationDelay: `${i * 130}ms` }}>
                  <IconoEstrella llena className="ico" aria-hidden />
                </span>
              ))}
              {Array.from({ length: perfil.nivel - 1 }).map((_, i) => (
                <IconoEstrella key={`vacia-${i}`} className="ico text-[#8fb6ae]" aria-hidden />
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* Instalar la app (2026-09-30, opción 2 elegida por el usuario): solo
          aparece si no está instalada. */}
      <InstalarApp variante="boton" />

      <DestacadosPerfil destacados={destacados} />

      <div ref={estadisticasRef} className="flex flex-col">
        {/* Tarjeta acordeón, colapsada por defecto (2026-09-13, a pedido
            del usuario, sobre un mockup con 2 alternativas -- eligió esta:
            todo el título es tocable, como los items del menú).
            Rediseño Cartel (2026-10-01): el acordeón es una fila con línea
            gruesa arriba y abajo, y el contenido va suelto, sin tarjeta. */}
        <button
          type="button"
          onClick={() => setMostrarEstadisticas((v) => !v)}
          className="w-full text-left flex items-center justify-between gap-2 cursor-pointer py-3 border-y-2 border-ink"
        >
          <span className="font-titulo font-extrabold uppercase text-2xl leading-none">{t("estadisticas.titulo")}</span>
          <IconoChevron
            width={20}
            height={20}
            className={`transition-transform flex-shrink-0 ${mostrarEstadisticas ? "rotate-180" : ""}`}
          />
        </button>

        {mostrarEstadisticas &&
          (cargandoEstadisticas ? (
            <div className="flex items-center gap-2 text-muted text-sm py-4 border-b border-ink/10">
              <PelotaLoader />
              {t("estadisticas.cargando")}
            </div>
          ) : !partidosStats ? (
            <div className="text-sm text-muted py-4 border-b border-ink/10">{t("estadisticas.sinPartidos")}</div>
          ) : (
            <div className="flex flex-col pt-4">
              {/* Resumen general, en barras de progreso (2026-09-13, a pedido
                  del usuario, sobre 3 opciones de estilo que se le
                  ofrecieron) -- todo lo parametrizable que guarda
                  estadisticas_partido, agregado sobre todos los partidos.
                  Verde/rojo (2026-09-13: "que lo bueno sobre lo malo se
                  muestre en verde sobre rojo") en lo que es claramente
                  bueno o malo para el jugador -- lo puramente informativo
                  (puntos totales, quién sacó, deuce) queda neutro. */}
              {(() => {
                const r = calcularResumenEstadisticas(partidosStats);
                return (
                  <div className="flex flex-col gap-4">
                    {/* Rediseño Cartel: números grandes con divisores. */}
                    <div className="grid grid-cols-3">
                      <div className="flex flex-col">
                        <span className="font-numero font-bold text-[2.2rem] leading-none">{r.partidos}</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{t("estadisticas.partidosConDatos")}</span>
                      </div>
                      <div className="flex flex-col pl-3 border-l border-ink/15">
                        <span className="font-numero font-bold text-[2.2rem] leading-none">{r.duracionPromedioMin} min</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{t("estadisticas.duracionPromedio")}</span>
                      </div>
                      <div className="flex flex-col pl-3 border-l border-ink/15">
                        <span className="font-numero font-bold text-[2.2rem] leading-none">{r.rachaMaxima}</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{t("estadisticas.rachaMaxima")}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-3 border-t border-ink/10">
                      <BarraEstadistica
                        etiqueta={t("estadisticas.partidosGanadosPct")}
                        valor={r.partidosGanados}
                        total={r.partidos}
                        variante="bien"
                        info={t("estadisticas.partidosGanadosPctInfo")}
                      />
                      <BarraEstadistica
                        etiqueta={t("estadisticas.puntosTotales")}
                        valor={r.sumaPuntosPropios}
                        total={r.sumaPuntosPropios + r.sumaPuntosRival}
                        texto={`${r.promedioPropios} - ${r.promedioRival} ${t("estadisticas.porPartido").toLowerCase()}`}
                        info={t("estadisticas.puntosTotalesInfo")}
                      />
                      <BarraEstadistica
                        etiqueta={t("estadisticas.quiebresConvertidos")}
                        valor={r.quiebresFavor}
                        total={r.quiebresOpFavor}
                        variante="bien"
                        info={t("estadisticas.quiebresConvertidosInfo")}
                      />
                      <BarraEstadistica
                        etiqueta={t("estadisticas.quiebresConcedidos")}
                        valor={r.quiebresContra}
                        total={r.quiebresOpContra}
                        variante="mal"
                        info={t("estadisticas.quiebresConcedidosInfo")}
                      />
                      <BarraEstadistica
                        etiqueta={t("estadisticas.puntosJuegoConvertidos")}
                        valor={r.puntosJuegoFavor}
                        total={r.puntosJuegoOpFavor}
                        variante="bien"
                        info={t("estadisticas.puntosJuegoConvertidosInfo")}
                      />
                      <BarraEstadistica
                        etiqueta={t("estadisticas.puntosJuegoConcedidos")}
                        valor={r.puntosJuegoContra}
                        total={r.puntosJuegoOpContra}
                        variante="mal"
                        info={t("estadisticas.puntosJuegoConcedidosInfo")}
                      />
                      <BarraEstadistica
                        etiqueta={t("estadisticas.vecesSaquePrimero")}
                        valor={r.saquePrimeroCount}
                        total={r.partidos}
                        info={t("estadisticas.vecesSaquePrimeroInfo")}
                      />
                      <BarraEstadistica
                        etiqueta={t("estadisticas.juegosADeuce")}
                        valor={r.juegosADeuce}
                        total={Math.max(r.juegosADeuce, 1)}
                        texto={r.juegosADeuce}
                        info={t("estadisticas.juegosADeuceInfo")}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Lista de partidos, DENTRO de la misma tarjeta que el resumen
                  (2026-09-13, a pedido del usuario). Tocar un partido ya NO
                  despliega el detalle ahí mismo -- lleva a su propia vista
                  (2026-09-13: "que vaya a una nueva vista, ese [expandir
                  inline] quedó horrendo"). */}
              <button
                type="button"
                onClick={() => setMostrarPartidosStats((v) => !v)}
                className="text-sm font-semibold text-accent-2-ink underline cursor-pointer self-start mt-4"
              >
                {mostrarPartidosStats ? t("estadisticas.verMenosPartidos") : t("estadisticas.verMasPartidos")}
              </button>

              {mostrarPartidosStats && (
                <div className="flex flex-col mt-2 border-t border-ink/10">
                  {partidosStats.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => router.push(`/partido/${p.id}/estadisticas`)}
                      className="lista-item-entra w-full text-left flex items-center justify-between gap-2 cursor-pointer py-3 border-b border-ink/10"
                      style={{ animationDelay: `${i * 35}ms` }}
                    >
                      <span className="flex flex-col">
                        <span className="text-sm font-semibold">
                          {new Date(p.fechaHora).toLocaleDateString(INTL_LOCALE[locale] ?? "es-AR")} · {p.cancha}
                        </span>
                        {p.puntosRankingGanados !== null && (
                          <span className="text-xs font-semibold text-[#16a34a]">
                            +{p.puntosRankingGanados} pts de ranking
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-xs font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-[6px] ${ p.gane ? "bg-[#22c55e]/20 text-[#16a34a]" : "bg-[#ef4444]/20 text-[#dc2626]" }`}
                        >
                          {p.gane ? t("home.ganaste") : t("home.perdiste")}
                        </span>
                        <IconoChevron width={16} height={16} className="-rotate-90 text-muted" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Rediseño Cartel (2026-10-01): los datos son filas etiqueta/valor
          con línea fina, en vez de mini-tarjetas en grilla. */}
      <div className="flex flex-col">
        <Subtitulo>{t("verPerfil.datos")}</Subtitulo>
        <div className="flex flex-col border-t-2 border-ink">
          <Campo icono={<IconoTelefono width={14} height={14} />} etiqueta={t("verPerfil.telefono")} valor={perfil.telefono} />
          <Campo icono={<IconoPersona width={14} height={14} />} etiqueta={t("verPerfil.sexo")} valor={perfil.sexo === "masculino" ? t("directorio.masculino") : perfil.sexo === "femenino" ? t("directorio.femenino") : perfil.sexo} />
          <Campo icono={<IconoMapa width={14} height={14} />} etiqueta={t("verPerfil.provincia")} valor={etiquetaDe(PROVINCIAS, perfil.provincia)} />
          <Campo icono={<IconoPin width={14} height={14} />} etiqueta={t("verPerfil.zona")} valor={zonaLabel(perfil.zona, t)} />
          <Campo icono={<IconoMano width={14} height={14} />} etiqueta={t("verPerfil.manoHabil")} valor={perfil.mano_habil === "diestro" ? t("directorio.diestro") : perfil.mano_habil === "zurdo" ? t("directorio.zurdo") : perfil.mano_habil} />
          <Campo icono={<IconoPelota width={14} height={14} />} etiqueta={t("verPerfil.posicion")} valor={perfil.posicion === "reves" ? t("companero.reves") : t("companero.drive")} />
        </div>
      </div>

      {/* El perfil es solo identidad -- el resto de los accesos vive en el
          Home (US-5.3, "/"), para no acumular botones acá (queja real del
          usuario: "el perfil ya tiene muchos botones"). */}
      <div className="flex flex-col">
        <Subtitulo>{t("verPerfil.privacidad")}</Subtitulo>
        <div className="flex flex-col border-t-2 border-ink">
          <div className="flex items-center justify-between gap-2 py-3 border-b border-ink/10">
            <span className="font-semibold text-sm flex items-center gap-2">
              <IconoCampana width={16} height={16} />
              {perfil.notificaciones_activas ? t("verPerfil.notifActivadas") : t("verPerfil.notifDesactivadas")}
            </span>
            <Toggle checked={perfil.notificaciones_activas} onChange={handleToggleNotificaciones} />
          </div>

          <div className="flex items-center justify-between gap-2 py-3 border-b border-ink/10">
            <span className="font-semibold text-sm flex items-center gap-2">
              {perfil.mostrar_telefono ? <IconoOjo width={16} height={16} /> : <IconoOjoTachado width={16} height={16} />}
              {perfil.mostrar_telefono ? t("verPerfil.telVisible") : t("verPerfil.telOculto")}
            </span>
            <Toggle checked={perfil.mostrar_telefono} onChange={handleToggleTelefono} />
          </div>

          {perfil.mostrar_telefono && (
            <div className="flex items-center justify-between gap-2 py-3 border-b border-ink/10">
              <span className="font-semibold text-sm flex items-center gap-2">
                {perfil.mostrar_whatsapp ? <IconoMensaje width={16} height={16} /> : <IconoOjoTachado width={16} height={16} />}
                {perfil.mostrar_whatsapp ? t("verPerfil.wspVisible") : t("verPerfil.wspOculto")}
              </span>
              <Toggle checked={perfil.mostrar_whatsapp} onChange={handleToggleWhatsapp} />
            </div>
          )}
        </div>
      </div>

      {/* Rediseño Cartel (2026-10-01): las acciones de la cuenta son
          livianas -- Editar y Cerrar sesión en una fila con líneas y
          divisor (como "Crear / Abiertos" del Inicio), y Dar de baja como
          botón de texto en rojo. Ninguna compite como botón principal. */}
      <div className="flex flex-col">
        <Subtitulo>{t("home.cuenta")}</Subtitulo>
        <div className="grid grid-cols-2 border-y-2 border-ink">
          <button
            onClick={comenzarEdicion}
            className="flex items-center justify-center gap-2 py-3 font-semibold text-sm cursor-pointer"
          >
            {t("verPerfil.editar")}
          </button>
          <button
            onClick={handleCerrarSesion}
            className="flex items-center justify-center gap-2 py-3 font-semibold text-sm cursor-pointer border-l-2 border-ink"
          >
            {t("verPerfil.cerrarSesion")}
          </button>
        </div>

        <button
          onClick={() => setMostrarConfirmacionBaja(true)}
          className="text-sm font-semibold text-red-600 underline cursor-pointer self-start mt-4"
        >
          {t("verPerfil.darDeBajaCuenta")}
        </button>
        <button
          onClick={() => {
            setTextoEliminar("");
            setErrorEliminar("");
            setMostrarEliminar(true);
          }}
          className="text-sm font-semibold text-red-600 underline cursor-pointer self-start mt-3"
        >
          Eliminar mi cuenta
        </button>
      </div>

      {/* Confirmar la baja en hoja de abajo (2026-10-01, mismo estilo que las
          Opciones del Marcadorcito, a pedido del usuario). Antes reemplazaba
          toda la pantalla del perfil. */}
      {mostrarConfirmacionBaja && (
        <HojaAbajo
          titulo={t("verPerfil.confirmarBajaTitulo")}
          onCerrar={dandoBaja ? undefined : () => setMostrarConfirmacionBaja(false)}
          textoCerrar="✕"
        >
          <p className="text-muted text-sm -mt-1">{t("verPerfil.confirmarBajaTexto")}</p>
          {errorBaja && <p className="text-red-600 text-sm">{errorBaja}</p>}
          <button
            onClick={handleDarBaja}
            disabled={dandoBaja}
            className="rounded-[6px] font-titulo font-black uppercase text-xl leading-none py-3.5 bg-red-600 text-white cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {dandoBaja && <PelotaLoader />}
            {dandoBaja ? t("verPerfil.dandoDeBaja") : t("verPerfil.siDarDeBaja")}
          </button>
          <button
            type="button"
            onClick={() => setMostrarConfirmacionBaja(false)}
            disabled={dandoBaja}
            className="rounded-[6px] font-semibold text-sm py-3 border border-ink/15 text-ink cursor-pointer disabled:opacity-60"
          >
            {t("verPerfil.cancelar")}
          </button>
        </HojaAbajo>
      )}

      {mostrarEliminar && (
        <HojaAbajo titulo="Eliminar mi cuenta" onCerrar={eliminando ? undefined : () => setMostrarEliminar(false)} textoCerrar="✕">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted -mt-1">Esto no se puede deshacer. Si solo querés dejar de aparecer un tiempo, usá “Dar de baja”: se puede reactivar.</p>
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Se borra</span>
              <span>Tu nombre, teléfono, foto, mensajes, notificaciones, disponibilidad, compañeros fijos y tu acceso con Google. Salís de los grupos y de los partidos que todavía no se jugaron.</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Se queda</span>
              <span>Los partidos que ya jugaste, con tu nombre reemplazado por “Jugador eliminado”, para que a los demás no se les rompa el historial. Si creaste un grupo, pasa al miembro más antiguo.</span>
            </div>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Escribí ELIMINAR para confirmar</span>
              <input
                value={textoEliminar}
                onChange={(e) => setTextoEliminar(e.target.value)}
                disabled={eliminando}
                autoCapitalize="characters"
                className="rounded-[6px] bg-transparent border border-ink/15 px-3 py-2 text-ink"
              />
            </label>
            {errorEliminar && (
              <p role="alert" className="text-red-600">
                {errorEliminar}
              </p>
            )}
            <button
              onClick={handleEliminarCuenta}
              disabled={eliminando || textoEliminar.trim().toUpperCase() !== "ELIMINAR"}
              className="rounded-[6px] font-titulo font-black uppercase text-xl leading-none py-3.5 bg-red-600 text-white cursor-pointer disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              {eliminando && <PelotaLoader />}
              {eliminando ? "Eliminando…" : "Eliminar mi cuenta"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarEliminar(false)}
              disabled={eliminando}
              className="rounded-[6px] font-semibold text-sm py-3 border border-ink/15 text-ink cursor-pointer disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </HojaAbajo>
      )}
    </div>
  );
}

// Rediseño Cartel (2026-10-01): etiqueta de sección chica y fila
// etiqueta/valor con línea fina (antes eran mini-tarjetas).
function Subtitulo({ children }) {
  return <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-2">{children}</span>;
}

function Campo({ icono, etiqueta, valor }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-ink/10">
      <span className="text-sm text-muted flex items-center gap-1.5 flex-shrink-0">
        {icono && <span aria-hidden="true" className="flex items-center">{icono}</span>} {etiqueta}
      </span>
      <span className="text-sm font-semibold text-right min-w-0 break-words">{valor}</span>
    </div>
  );
}
