"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import AvatarUpload from "@/components/AvatarUpload";
import Logo from "@/components/Logo";
import BarraEstadistica from "@/components/BarraEstadistica";
import Toggle from "@/components/Toggle";
import { calcularResumenEstadisticas, calcularPuntosRanking } from "@/lib/estadisticasMarcadorcito";
import {
  IconoTelefono,
  IconoPersona,
  IconoMapa,
  IconoPin,
  IconoMano,
  IconoPelota,
  IconoCampana,
  IconoMensaje,
  IconoOjo,
  IconoOjoTachado,
  IconoTrofeo,
  IconoChevron,
} from "@/components/Icons";
import { useLocale } from "@/i18n/LocaleContext";
import { INTL_LOCALE } from "@/i18n/translations";

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

const inputClass =
  "rounded-xl bg-bg px-3 py-2 text-ink";

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

  const [perfilInactivo, setPerfilInactivo] = useState(null);
  const [reactivando, setReactivando] = useState(false);
  const [errorReactivacion, setErrorReactivacion] = useState("");

  const [partidosStats, setPartidosStats] = useState(null);
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
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // Sin sesión activa: redirigimos al login en vez de mostrar esta
        // pantalla (US-1.5 -- no se debe ver contenido protegido sin sesión).
        router.replace("/login");
        return;
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

      // Estadísticas de Marcadorcito (2026-09-13): no bloquea el resto del
      // perfil -- si tarda o falla, el resto de la pantalla ya se ve.
      cargarEstadisticas(user.id);
    }

    async function cargarEstadisticas(jugadorId) {
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
      <div className="w-full max-w-md bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold">
          {t("verPerfil.cuentaDadaDeBaja")}
        </h1>
        <p className="text-muted text-sm">{t("verPerfil.preguntaReactivar")}</p>

        {errorReactivacion && (
          <p className="text-red-600 text-sm">{errorReactivacion}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleReactivar}
            disabled={reactivando}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {reactivando && <PelotaLoader />}
            {reactivando ? t("verPerfil.reactivando") : t("verPerfil.reactivarCuenta")}
          </button>
          <button
            type="button"
            onClick={handleCancelarReactivacion}
            disabled={reactivando}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60"
          >
            {t("verPerfil.cancelar")}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6">
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
        className="w-full max-w-md bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-4"
      >
        <h1 className="font-heading text-2xl font-semibold">{t("verPerfil.editarPerfil")}</h1>

        <AvatarUpload
          userId={perfil.id}
          avatarUrl={perfil.avatar_url}
          onUploaded={async (url) => {
            setPerfil((prev) => ({ ...prev, avatar_url: url }));
            await supabase.from("perfiles").update({ avatar_url: url }).eq("id", perfil.id);
          }}
        />

        <label className="flex flex-col gap-1">
          <span className="font-heading text-sm">{t("verPerfil.nombre")}</span>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-heading text-sm">{t("verPerfil.telefono")}</span>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-heading text-sm">{t("verPerfil.sexo")}</span>
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
          <span className="font-heading text-sm">{t("verPerfil.provincia")}</span>
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
          <span className="font-heading text-sm">{t("verPerfil.zona")}</span>
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
          <span className="font-heading text-sm">{t("verPerfil.nivelDeJuego")}</span>
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
          <span className="font-heading text-sm">{t("verPerfil.manoHabil")}</span>
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
          <span className="font-heading text-sm">{t("verPerfil.posicion")}</span>
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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={guardando || !formularioEdicionCompleto}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {guardando && <PelotaLoader />}
            {guardando ? t("verPerfil.guardando") : t("verPerfil.guardarCambios")}
          </button>
          <button
            type="button"
            onClick={cancelarEdicion}
            disabled={guardando}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60"
          >
            {t("verPerfil.cancelar")}
          </button>
        </div>
      </form>
    );
  }

  if (mostrarConfirmacionBaja) {
    return (
      <div className="w-full max-w-md bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold">{t("verPerfil.confirmarBajaTitulo")}</h1>
        <p className="text-muted text-sm">{t("verPerfil.confirmarBajaTexto")}</p>

        {errorBaja && <p className="text-red-600 text-sm">{errorBaja}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleDarBaja}
            disabled={dandoBaja}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-red-600 text-white border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {dandoBaja && <PelotaLoader />}
            {dandoBaja ? t("verPerfil.dandoDeBaja") : t("verPerfil.siDarDeBaja")}
          </button>
          <button
            type="button"
            onClick={() => setMostrarConfirmacionBaja(false)}
            disabled={dandoBaja}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60"
          >
            {t("verPerfil.cancelar")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t("verPerfil.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("verPerfil.volver")}
        </button>
      </div>

      {/* Tarjeta "hero": identidad + nivel/ranking, mismo estilo de tarjeta
          suelta sobre el fondo que ya usa el Home (2026-09-13, a pedido del
          usuario: "el perfil parece de otro lugar, hacelo parecido al
          estilo del Home") -- antes todo esto vivía adentro de una sola
          tarjeta gigante, distinto al resto de la app. */}
      <div className={tarjeta}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-16 h-16 rounded-full bg-bg overflow-hidden flex items-center justify-center flex-shrink-0">
            {perfil.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Logo size={32} />
            )}
          </div>
          <span className="font-heading text-xl font-semibold">{perfil.nombre}</span>
        </div>

        {/* Nivel (como estrellas -- 1ª es la categoría más alta, así que se
            invierte para que "más estrellas" siga significando "mejor
            nivel") + ranking, los dos datos que más le importan a un
            jugador. */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg rounded-[16px] p-3 flex flex-col gap-1">
            <span className="text-xs text-muted uppercase tracking-wide">
              {t("perfilJugador.nivelTemplate", { etiqueta: etiquetaNivel(perfil.nivel, t) })}
            </span>
            <span
              className="flex flex-wrap gap-0.5 text-base leading-none overflow-hidden"
              aria-label={t("verPerfil.estrellasAriaLabel", { n: 8 - perfil.nivel })}
            >
              {Array.from({ length: 8 - perfil.nivel }).map((_, i) => (
                <span key={`llena-${i}`} className="estrella-llena-entra" style={{ animationDelay: `${i * 130}ms` }}>
                  ⭐
                </span>
              ))}
              {Array.from({ length: perfil.nivel - 1 }).map((_, i) => (
                <span key={`vacia-${i}`}>☆</span>
              ))}
            </span>
          </div>
          <button
            type="button"
            onClick={irAEstadisticas}
            className="bg-bg rounded-[16px] p-3 flex flex-col gap-1 text-left cursor-pointer"
          >
            <span className="text-xs text-muted uppercase tracking-wide">{t("perfilJugador.ranking")}</span>
            <span className="font-heading text-lg font-semibold flex items-center gap-1.5">
              <IconoTrofeo width={16} height={16} />
              {perfil.puntos_ranking > 0 ? t("verPerfil.puntosPts", { puntos: perfil.puntos_ranking }) : t("perfilJugador.sinPartidos")}
            </span>
          </button>
        </div>
      </div>

      <div ref={estadisticasRef} className="flex flex-col gap-3">
        {/* Tarjeta acordeón, colapsada por defecto (2026-09-13, a pedido
            del usuario, sobre un mockup con 2 alternativas -- eligió esta:
            todo el título es tocable, como los items del menú). */}
        <button
          type="button"
          onClick={() => setMostrarEstadisticas((v) => !v)}
          className={`w-full text-left flex items-center justify-between gap-2 cursor-pointer ${tarjeta}`}
        >
          <span className="font-heading font-semibold text-sm">{t("estadisticas.titulo")}</span>
          <IconoChevron
            width={18}
            height={18}
            className={`transition-transform flex-shrink-0 ${mostrarEstadisticas ? "rotate-180" : ""}`}
          />
        </button>

        {mostrarEstadisticas &&
          (cargandoEstadisticas ? (
            <div className={`${tarjeta} flex items-center gap-2 text-muted text-sm`}>
              <PelotaLoader />
              {t("estadisticas.cargando")}
            </div>
          ) : !partidosStats ? (
            <div className={`${tarjeta} text-sm text-muted`}>{t("estadisticas.sinPartidos")}</div>
          ) : (
            <div className={tarjeta}>
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
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="flex flex-col">
                        <span className="font-heading text-lg font-semibold">{r.partidos}</span>
                        <span className="text-xs text-muted">{t("estadisticas.partidosConDatos")}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-heading text-lg font-semibold">{r.duracionPromedioMin} min</span>
                        <span className="text-xs text-muted">{t("estadisticas.duracionPromedio")}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-heading text-lg font-semibold">{r.rachaMaxima}</span>
                        <span className="text-xs text-muted">{t("estadisticas.rachaMaxima")}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
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
                className="font-heading font-semibold text-sm text-accent-2-ink underline cursor-pointer self-start mt-3"
              >
                {mostrarPartidosStats ? t("estadisticas.verMenosPartidos") : t("estadisticas.verMasPartidos")}
              </button>

              {mostrarPartidosStats && (
                <div className="flex flex-col mt-2 -mx-4 border-t border-bg">
                  {partidosStats.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => router.push(`/partido/${p.id}/estadisticas`)}
                      className="lista-item-entra w-full text-left flex items-center justify-between gap-2 cursor-pointer px-4 py-3 border-b border-bg"
                      style={{ animationDelay: `${i * 35}ms` }}
                    >
                      <span className="flex flex-col">
                        <span className="text-sm font-heading font-semibold">
                          {new Date(p.fechaHora).toLocaleDateString(INTL_LOCALE[locale] ?? "es-AR")} · {p.cancha}
                        </span>
                        {p.puntosRankingGanados !== null && (
                          <span className="text-xs font-heading font-semibold text-[#16a34a]">
                            +{p.puntosRankingGanados} pts de ranking
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            p.gane ? "bg-[#22c55e]/20 text-[#16a34a]" : "bg-[#ef4444]/20 text-[#dc2626]"
                          }`}
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

      <div className="flex flex-col gap-3">
        <Subtitulo>{t("verPerfil.datos")}</Subtitulo>
        <div className={`${tarjeta} grid grid-cols-2 gap-2`}>
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
      <div className="flex flex-col gap-3">
        <Subtitulo>{t("verPerfil.privacidad")}</Subtitulo>
        <div className={`${tarjeta} flex flex-col gap-3`}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-heading font-semibold text-sm flex items-center gap-2">
              <IconoCampana width={16} height={16} />
              {perfil.notificaciones_activas ? t("verPerfil.notifActivadas") : t("verPerfil.notifDesactivadas")}
            </span>
            <Toggle checked={perfil.notificaciones_activas} onChange={handleToggleNotificaciones} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="font-heading font-semibold text-sm flex items-center gap-2">
              {perfil.mostrar_telefono ? <IconoOjo width={16} height={16} /> : <IconoOjoTachado width={16} height={16} />}
              {perfil.mostrar_telefono ? t("verPerfil.telVisible") : t("verPerfil.telOculto")}
            </span>
            <Toggle checked={perfil.mostrar_telefono} onChange={handleToggleTelefono} />
          </div>

          {perfil.mostrar_telefono && (
            <div className="flex items-center justify-between gap-2">
              <span className="font-heading font-semibold text-sm flex items-center gap-2">
                {perfil.mostrar_whatsapp ? <IconoMensaje width={16} height={16} /> : <IconoOjoTachado width={16} height={16} />}
                {perfil.mostrar_whatsapp ? t("verPerfil.wspVisible") : t("verPerfil.wspOculto")}
              </span>
              <Toggle checked={perfil.mostrar_whatsapp} onChange={handleToggleWhatsapp} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Subtitulo>{t("home.cuenta")}</Subtitulo>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={comenzarEdicion}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
          >
            {t("verPerfil.editar")}
          </button>
          <button
            onClick={handleCerrarSesion}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
          >
            {t("verPerfil.cerrarSesion")}
          </button>
        </div>

        <button
          onClick={() => setMostrarConfirmacionBaja(true)}
          className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-red-600 shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer self-start"
        >
          {t("verPerfil.darDeBajaCuenta")}
        </button>
      </div>
    </div>
  );
}

const tarjeta = "bg-surface text-ink rounded-[18px] p-4 shadow-[0_1px_3px_rgba(20,38,31,0.08)]";

function Subtitulo({ children }) {
  return <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">{children}</span>;
}

function Campo({ icono, etiqueta, valor }) {
  return (
    <div className="bg-bg shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[14px] p-2.5 flex flex-col gap-0.5">
      <span className="font-heading text-xs text-muted flex items-center gap-1">
        {icono && <span aria-hidden="true" className="flex items-center">{icono}</span>} {etiqueta}
      </span>
      <span className="text-sm font-heading font-semibold">{valor}</span>
    </div>
  );
}
