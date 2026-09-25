"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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
      } = await supabase.auth.getUser();
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
          className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer self-start"
        >
          {t("admin.volver")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t("admin.titulo")}</h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("admin.volver")}
        </button>
      </div>

      {editandoId ? (
        <form
          onSubmit={handleGuardar}
          className="bg-surface shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[16px] p-4 flex flex-col gap-2"
        >
          <span className="font-heading font-semibold text-sm">
            {editandoId === "nueva" ? t("admin.nuevaCancha") : t("admin.editarCancha")}
          </span>
          <input
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder={t("admin.nombre")}
            required
            className="rounded-xl bg-bg px-3 py-2 text-sm"
          />
          <input
            value={form.direccion}
            onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            placeholder={t("admin.direccion")}
            className="rounded-xl bg-bg px-3 py-2 text-sm"
          />
          <input
            value={form.zona}
            onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
            placeholder={t("admin.zona")}
            className="rounded-xl bg-bg px-3 py-2 text-sm"
          />
          <select
            value={form.provincia}
            onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))}
            className="rounded-xl bg-bg px-3 py-2 text-sm"
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
            className="rounded-xl bg-bg px-3 py-2 text-sm"
          />
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            placeholder={t("admin.descripcion")}
            rows={2}
            className="rounded-xl bg-bg px-3 py-2 text-sm"
          />
          <input
            value={form.valores}
            onChange={(e) => setForm((f) => ({ ...f, valores: e.target.value }))}
            placeholder={t("admin.valoresPlaceholder")}
            className="rounded-xl bg-bg px-3 py-2 text-sm"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
            >
              {guardando && <PelotaLoader />}
              {t("admin.guardar")}
            </button>
            <button
              type="button"
              onClick={() => setEditandoId(null)}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-ink border-2 border-outline cursor-pointer"
            >
              {t("admin.cancelar")}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={comenzarAlta}
          className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer self-start"
        >
          + {t("admin.nuevaCancha")}
        </button>
      )}

      <div className="flex flex-col gap-2">
        {canchas.map((c) => (
          <button
            key={c.id}
            onClick={() => comenzarEdicion(c)}
            className="text-left bg-surface text-ink border-2 border-outline rounded-[14px] p-3 flex flex-col cursor-pointer"
          >
            <span className="font-heading font-semibold text-sm">{c.nombre}</span>
            <span className="text-xs text-muted">{c.zona} · {c.provincia}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
