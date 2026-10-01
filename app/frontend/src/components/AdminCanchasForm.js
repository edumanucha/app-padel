"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

const PROVINCIAS = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco",
  "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
].map((nombre) => ({ valor: nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_"), etiqueta: nombre }));

const VACIO = { nombre: "", direccion: "", zona: "", telefono: "", descripcion: "", valores: "", provincia: "mendoza" };

// US-9.2: panel de administración de canchas -- solo superusuario (mismo
// rol de US-2.9, no uno nuevo). Sin esto, la única forma de cargar/editar
// una cancha era un INSERT/UPDATE manual por SQL.
export default function AdminCanchasForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [esSuperusuario, setEsSuperusuario] = useState(false);
  const [canchas, setCanchas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await usuarioRapido();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: perfil } = await supabase.from("perfiles").select("es_superusuario").eq("id", user.id).single();
      setEsSuperusuario(!!perfil?.es_superusuario);

      await recargar();
      setCargando(false);
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function recargar() {
    const { data } = await supabase.from("canchas").select("*").order("nombre", { ascending: true });
    setCanchas(data ?? []);
  }

  function comenzarEdicion(c) {
    setEditandoId(c.id);
    setForm({
      nombre: c.nombre ?? "",
      direccion: c.direccion ?? "",
      zona: c.zona ?? "",
      telefono: c.telefono ?? "",
      descripcion: c.descripcion ?? "",
      valores: c.valores ?? "",
      provincia: c.provincia ?? "mendoza",
    });
  }

  function comenzarAlta() {
    setEditandoId("nueva");
    setForm(VACIO);
  }

  async function handleGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");

    const payload = {
      nombre: form.nombre.trim(),
      direccion: form.direccion.trim() || null,
      zona: form.zona.trim() || null,
      telefono: form.telefono.trim() || null,
      descripcion: form.descripcion.trim() || null,
      valores: form.valores.trim() || null,
      provincia: form.provincia,
    };

    const { error: guardarError } =
      editandoId === "nueva"
        ? await supabase.from("canchas").insert(payload)
        : await supabase.from("canchas").update(payload).eq("id", editandoId);

    setGuardando(false);

    if (guardarError) {
      setError(t("admin.noSePudoGuardar", { mensaje: guardarError.message }));
      return;
    }

    setEditandoId(null);
    setForm(VACIO);
    recargar();
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-muted">
        <PelotaLoader />
        <p>{t("admin.cargando")}</p>
      </div>
    );
  }

  if (!esSuperusuario) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4">
        <p className="text-red-600 text-sm">{t("admin.soloAdmins")}</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer self-start"
        >
          {t("admin.volver")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]">{t("admin.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
        >
          {t("admin.volver")}
        </button>
      </div>

      {editandoId ? (
        <form
          onSubmit={handleGuardar}
          className="bg-surface border border-ink/10 rounded-[8px] p-4 flex flex-col gap-2"
        >
          <span className="font-titulo font-extrabold uppercase text-2xl leading-none mb-1">
            {editandoId === "nueva" ? t("admin.nuevaCancha") : t("admin.editarCancha")}
          </span>
          <input
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder={t("admin.nombre")}
            required
            className="rounded-[6px] bg-bg border border-ink/15 px-3 py-2 text-sm text-ink"
          />
          <input
            value={form.direccion}
            onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            placeholder={t("admin.direccion")}
            className="rounded-[6px] bg-bg border border-ink/15 px-3 py-2 text-sm text-ink"
          />
          <input
            value={form.zona}
            onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
            placeholder={t("admin.zona")}
            className="rounded-[6px] bg-bg border border-ink/15 px-3 py-2 text-sm text-ink"
          />
          <select
            value={form.provincia}
            onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))}
            className="rounded-[6px] bg-bg border border-ink/15 px-3 py-2 text-sm text-ink"
          >
            {PROVINCIAS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.etiqueta}
              </option>
            ))}
          </select>
          <input
            value={form.telefono}
            onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            placeholder={t("admin.telefono")}
            className="rounded-[6px] bg-bg border border-ink/15 px-3 py-2 text-sm text-ink"
          />
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            placeholder={t("admin.descripcion")}
            rows={2}
            className="rounded-[6px] bg-bg border border-ink/15 px-3 py-2 text-sm text-ink"
          />
          <input
            value={form.valores}
            onChange={(e) => setForm((f) => ({ ...f, valores: e.target.value }))}
            placeholder={t("admin.valoresPlaceholder")}
            className="rounded-[6px] bg-bg border border-ink/15 px-3 py-2 text-sm text-ink"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="font-titulo font-black uppercase text-lg px-4 py-2 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
            >
              {guardando && <PelotaLoader />}
              {t("admin.guardar")}
            </button>
            <button
              type="button"
              onClick={() => setEditandoId(null)}
              className="text-sm font-semibold px-4 py-2 rounded-[6px] border border-ink/15 text-ink cursor-pointer"
            >
              {t("admin.cancelar")}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={comenzarAlta}
          className="font-titulo font-black uppercase text-xl px-4 py-3 rounded-[6px] bg-accent text-accent-ink cursor-pointer"
        >
          + {t("admin.nuevaCancha")}
        </button>
      )}

      {/* Rediseño Cartel (2026-10-01): las canchas van como filas con línea
          abajo, sin cajas; nombre en negrita y zona/provincia como etiqueta. */}
      <div className="flex flex-col border-t border-ink/10">
        {canchas.map((c) => (
          <button
            key={c.id}
            onClick={() => comenzarEdicion(c)}
            className="text-left text-ink border-b border-ink/10 py-3 flex flex-col gap-0.5 cursor-pointer"
          >
            <span className="font-bold text-[15px] leading-tight">{c.nombre}</span>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{c.zona} · {c.provincia}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
