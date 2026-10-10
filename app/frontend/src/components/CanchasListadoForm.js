"use client";

import ConPelota from "@/components/ConPelota";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";
import { PROVINCIAS, ORDEN_REGIONES, regionDe } from "@/lib/zonasPorProvincia";

// `descripcion` guarda de todo (canchas, amenities, horario) porque así se
// extrajo de la fuente real (atcsports.io) -- en pantalla SOLO mostramos
// la cantidad de canchas (2026-09-13, a pedido del usuario: "no te dije
// que pongas todos esos datos, solo... la cantidad de canchas"), el resto
// queda guardado por si se usa después.
function cantidadCanchas(descripcion) {
  return descripcion?.match(/^\d+ canchas?/)?.[0] ?? null;
}

const sinTildes = (s) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Cuenta por clave y ordena de más a menos clubes (y por nombre si empatan).
function contar(lista, clave) {
  const cuentas = new Map();
  for (const c of lista) {
    const k = clave(c);
    if (k) cuentas.set(k, (cuentas.get(k) ?? 0) + 1);
  }
  return [...cuentas.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
}

function Pastilla({ activa, onClick, texto, cantidad, region = false }) {
  const colores = region
    ? activa
      ? "bg-[#154139] text-[#eaf4f0] border-[#154139]"
      : "border-[#154139] text-[#154139]"
    : activa
      ? "bg-ink text-bg border-ink"
      : "border-ink text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`flex-shrink-0 rounded-full border-[1.5px] px-3 py-1 text-[13px] font-semibold cursor-pointer whitespace-nowrap ${colores}`}
    >
      {texto}
      <span className={`font-numero font-bold ml-1.5 ${activa && !region ? "text-accent" : "opacity-70"}`}>{cantidad}</span>
    </button>
  );
}

// US-4.1: listado de canchas, arranca en la provincia del jugador.
// Filtro (2026-10-10, opción B de las maquetas + buscador, a pedido del
// usuario, ahora que hay canchas de todo el país): "cambiar" para ver otra
// provincia, pastillas por localidad con cuántos clubes tiene cada una y un
// buscador por nombre, localidad o dirección. En Buenos Aires (más de 200
// clubes en 135 partidos) primero van las regiones (Zona Norte, Oeste, Sur,
// La Plata, Costa, Interior) y, al elegir una, sus partidos.
export default function CanchasListadoForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [provincia, setProvincia] = useState(null);
  const [canchas, setCanchas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [region, setRegion] = useState(null);
  const [zona, setZona] = useState(null);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    async function cargarPerfil() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: perfil } = await supabase.from("perfiles").select("provincia").eq("id", user.id).maybeSingle();
      setProvincia(perfil?.provincia ?? "mendoza");
    }
    cargarPerfil();
  }, [router]);

  useEffect(() => {
    if (!provincia) return;
    let vivo = true;
    supabase
      .from("canchas")
      .select("id, nombre, zona, direccion, telefono, descripcion")
      .eq("provincia", provincia)
      .order("nombre", { ascending: true })
      .then(({ data, error: canchasError }) => {
        if (!vivo) return;
        if (canchasError) {
          setError(t("canchas.noSePudoCargar", { mensaje: canchasError.message }));
        } else {
          setError("");
          setCanchas(data ?? []);
        }
        setCargando(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provincia]);

  function cambiarProvincia(valor) {
    setCargando(true);
    setProvincia(valor);
    setRegion(null);
    setZona(null);
    setTexto("");
  }

  const conRegiones = provincia === "buenos_aires";

  const buscadas = useMemo(() => {
    const q = sinTildes(texto.trim());
    if (!q) return canchas;
    return canchas.filter((c) => sinTildes(`${c.nombre} ${c.zona} ${c.direccion}`).includes(q));
  }, [canchas, texto]);

  const regiones = conRegiones
    ? contar(buscadas, (c) => regionDe(c.zona)).sort((a, b) => ORDEN_REGIONES.indexOf(a[0]) - ORDEN_REGIONES.indexOf(b[0]))
    : [];
  const enRegion = region ? buscadas.filter((c) => regionDe(c.zona) === region) : buscadas;
  // En Buenos Aires los partidos aparecen recién al elegir una región.
  const zonas = !conRegiones || region ? contar(enRegion, (c) => c.zona) : [];
  const lista = zona ? enRegion.filter((c) => c.zona === zona) : enRegion;
  const lugar = zona ?? region;
  const cuenta = lugar
    ? t(lista.length === 1 ? "canchas.unClubEn" : "canchas.nClubesEn", { n: lista.length, zona: lugar })
    : t(lista.length === 1 ? "canchas.unClub" : "canchas.nClubes", { n: lista.length });
  const nombreProvincia = PROVINCIAS.find((p) => p.valor === provincia)?.etiqueta ?? "";

  if (cargando && canchas.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("canchas.cargando")}</p>
      </div>
    );
  }

  return (
    // Rediseño Cartel (2026-10-01): las canchas van como filas con línea
    // abajo (sin tarjetas), el nombre en letra de cartel y la zona como
    // etiqueta chica arriba. En la compu siguen en dos columnas.
    <div className="w-full max-w-md flex flex-col pantalla-grilla">
      <div className="flex items-center justify-between col-completa mb-4">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{t("canchas.titulo")}</ConPelota></h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("canchas.volver")}
        </button>
      </div>

      <div className="col-completa flex flex-col gap-2.5 mb-2 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-titulo font-black uppercase text-[1.7rem] leading-none">{nombreProvincia}</span>
          {/* El select va encima de "cambiar", invisible: se abre la lista
              nativa del celu sin armar una hoja aparte. */}
          <label className="relative text-sm font-semibold underline cursor-pointer">
            {t("canchas.cambiar")}
            <select
              value={provincia ?? ""}
              onChange={(e) => cambiarProvincia(e.target.value)}
              aria-label={t("canchas.provincia")}
              className="absolute inset-0 opacity-0 cursor-pointer"
            >
              {PROVINCIAS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </label>
        </div>

        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("canchas.buscar")}
          className="rounded-[6px] border border-ink/20 bg-surface px-3 py-2 text-ink"
        />

        {regiones.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
            {regiones.map(([r, n]) => (
              <Pastilla
                key={r}
                region
                activa={region === r}
                texto={r}
                cantidad={n}
                onClick={() => {
                  setRegion(region === r ? null : r);
                  setZona(null);
                }}
              />
            ))}
          </div>
        )}

        {zonas.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
            <Pastilla activa={zona === null} texto={t("canchas.todas")} cantidad={enRegion.length} onClick={() => setZona(null)} />
            {zonas.map(([z, n]) => (
              <Pastilla key={z} activa={zona === z} texto={z} cantidad={n} onClick={() => setZona(zona === z ? null : z)} />
            ))}
          </div>
        )}

        <span className="text-xs text-muted">{cuenta}</span>
      </div>

      {error && <p className="text-red-600 text-sm col-completa mb-3">{error}</p>}

      {lista.length === 0 && (
        <p className="text-sm text-muted border-y border-ink/10 py-4 col-completa">
          {canchas.length === 0 ? t("canchas.sinCanchas") : t("canchas.sinResultados")}
        </p>
      )}

      {lista.map((c) => (
        <button
          key={c.id}
          onClick={() => router.push(`/canchas/${c.id}`)}
          className="text-left text-ink border-b border-ink/10 py-3 flex items-center justify-between gap-3 cursor-pointer"
        >
          <span className="flex flex-col gap-0.5 min-w-0">
            {c.zona && (
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{c.zona}</span>
            )}
            <span className="font-titulo font-extrabold uppercase text-2xl leading-none">{c.nombre}</span>
            {c.direccion && <span className="text-sm text-muted">{c.direccion}</span>}
            {c.telefono && <span className="text-sm text-muted">{c.telefono}</span>}
          </span>
          {cantidadCanchas(c.descripcion) && (
            <span className="text-xs font-semibold text-muted whitespace-nowrap flex-shrink-0">{cantidadCanchas(c.descripcion)}</span>
          )}
        </button>
      ))}
    </div>
  );
}
