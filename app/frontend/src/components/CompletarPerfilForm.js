"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

// Provincia (2026-09-05): se agrega ahora para dejar el terreno preparado
// para cuando el directorio de canchas cubra más de una provincia -- por
// ahora `zona` y las canchas sembradas siguen siendo solo de Mendoza.
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
const OTRA_ZONA_VALOR = "otra_zona";

// Niveles 1 a 7. Se aclara "(máxima)" y "(mínima)" en los extremos porque
// en pádel la categoría 1ª es la MÁS ALTA -- al revés de lo intuitivo
// (donde uno esperaría que 1 sea "el más bajo"). Ver estado-tecnico-proyecto.md.
const NIVELES_VALORES = [1, 2, 3, 4, 5, 6, 7];

function etiquetaNivel(n, t) {
  if (n === 1) return t("directorio.opcionNivelMaxima");
  if (n === 7) return t("directorio.opcionNivelMinima");
  return t("directorio.opcionNivelGenerica", { n });
}

const inputClass =
  "rounded-xl bg-bg px-3 py-2 text-ink";

// Formulario de "completar perfil" (US-1.2): se muestra la primera vez que
// alguien inicia sesión y todavía no tiene una fila en la tabla `perfiles`.
// Recién cuando se envía CON TODOS los campos obligatorios completos se
// inserta la fila -- por eso "existe la fila" ya significa "perfil completo",
// sin necesitar una columna aparte para marcarlo.
export default function CompletarPerfilForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sexo, setSexo] = useState("");
  const [provincia, setProvincia] = useState("mendoza");
  const [zona, setZona] = useState("");
  const [nivel, setNivel] = useState("");
  const [manoHabil, setManoHabil] = useState("");
  const [posicion, setPosicion] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  // Chequeo de sesion al entrar a la pantalla (no solo al enviar el
  // formulario) -- sin sesion activa, redirigimos al login en vez de
  // mostrar este formulario (US-1.5, mismo criterio que VerPerfilForm.js).
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

  // Boton deshabilitado hasta que los 7 campos obligatorios esten
  // completos (la validacion de formato del telefono sigue haciendose
  // recien al enviar, no bloquea el boton).
  const formularioCompleto =
    nombre.trim() !== "" &&
    telefono.trim() !== "" &&
    sexo !== "" &&
    provincia !== "" &&
    zona !== "" &&
    nivel !== "" &&
    manoHabil !== "" &&
    posicion !== "";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Necesitamos saber quién es el usuario logueado -- el id de la fila en
    // `perfiles` tiene que ser exactamente el mismo id que su usuario en
    // auth.users (así lo definimos en el esquema, y así lo exige RLS).
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(t("completarPerfil.sinSesion"));
      return;
    }

    setCargando(true);

    const { error: insertError } = await supabase.from("perfiles").insert({
      id: user.id,
      nombre,
      telefono,
      sexo,
      provincia,
      zona,
      nivel: Number(nivel),
      mano_habil: manoHabil,
      posicion,
    });

    setCargando(false);

    if (insertError) {
      // Código 23505 = violación de unicidad -- ya existía una fila con
      // este id (o sea, este usuario ya había completado su perfil antes).
      if (insertError.code === "23505") {
        setError(t("completarPerfil.perfilYaExistia"));
      } else {
        setError(t("completarPerfil.noSePudoGuardar", { mensaje: insertError.message }));
      }
      return;
    }

    router.push("/");
  }

  if (verificandoSesion) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("completarPerfil.cargando")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-4"
    >
      <h1 className="font-heading text-2xl font-semibold">{t("completarPerfil.titulo")}</h1>
      <p className="text-muted text-sm">{t("completarPerfil.subtitulo")}</p>

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("completarPerfil.nombre")}</span>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("completarPerfil.telefono")}</span>
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          required
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("completarPerfil.sexo")}</span>
        <select
          value={sexo}
          onChange={(e) => setSexo(e.target.value)}
          required
          className={inputClass}
        >
          <option value="" disabled>
            {t("completarPerfil.elegiUnaOpcion")}
          </option>
          <option value="masculino">{t("directorio.masculino")}</option>
          <option value="femenino">{t("directorio.femenino")}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("completarPerfil.provincia")}</span>
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
        <span className="font-heading text-sm">{t("completarPerfil.zona")}</span>
        <select
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          required
          className={inputClass}
        >
          <option value="" disabled>
            {t("completarPerfil.elegiUnaOpcion")}
          </option>
          {ZONAS.map((z) => (
            <option key={z.valor} value={z.valor}>
              {z.etiqueta}
            </option>
          ))}
          <option value={OTRA_ZONA_VALOR}>{t("completarPerfil.otraZona")}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("completarPerfil.nivelDeJuego")}</span>
        <select
          value={nivel}
          onChange={(e) => setNivel(e.target.value)}
          required
          className={inputClass}
        >
          <option value="" disabled>
            {t("completarPerfil.elegiUnaOpcion")}
          </option>
          {NIVELES_VALORES.map((n) => (
            <option key={n} value={n}>
              {etiquetaNivel(n, t)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("completarPerfil.manoHabil")}</span>
        <select
          value={manoHabil}
          onChange={(e) => setManoHabil(e.target.value)}
          required
          className={inputClass}
        >
          <option value="" disabled>
            {t("completarPerfil.elegiUnaOpcion")}
          </option>
          <option value="diestro">{t("directorio.diestro")}</option>
          <option value="zurdo">{t("directorio.zurdo")}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("completarPerfil.posicion")}</span>
        <select
          value={posicion}
          onChange={(e) => setPosicion(e.target.value)}
          required
          className={inputClass}
        >
          <option value="" disabled>
            {t("completarPerfil.elegiUnaOpcion")}
          </option>
          <option value="drive">{t("companero.drive")}</option>
          <option value="reves">{t("companero.reves")}</option>
        </select>
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={cargando || !formularioCompleto}
        className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {cargando && <PelotaLoader />}
        {cargando ? t("completarPerfil.guardando") : t("completarPerfil.guardarPerfil")}
      </button>
    </form>
  );
}
