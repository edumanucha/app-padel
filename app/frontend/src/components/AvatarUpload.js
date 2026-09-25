"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";

// Avatar de perfil (opcional, no es uno de los 7 campos obligatorios de
// US-1.2): sube la imagen al bucket público "avatars" de Supabase Storage,
// dentro de una carpeta propia (<user_id>/avatar.<ext>) -- las políticas de
// storage.objects (014_avatar_perfil.sql) solo dejan subir/reemplazar
// dentro de la propia carpeta. onUploaded recibe la URL pública final.
export default function AvatarUpload({ userId, avatarUrl, onUploaded, size = 84 }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSubiendo(true);

    const extension = file.name.split(".").pop();
    const ruta = `${userId}/avatar.${extension}`;

    const { error: subirError } = await supabase.storage
      .from("avatars")
      .upload(ruta, file, { upsert: true });

    if (subirError) {
      setSubiendo(false);
      setError(`No se pudo subir la imagen: ${subirError.message}`);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(ruta);
    // Cache-busting: el nombre de archivo es siempre el mismo (upsert), así
    // que sin esto el navegador podría seguir mostrando la imagen vieja.
    const urlConVersion = `${data.publicUrl}?v=${Date.now()}`;

    setSubiendo(false);
    onUploaded(urlConVersion);
  }

  return (
    <div className="flex items-center gap-3">
      <div
        style={{ width: size, height: size }}
        className="rounded-full shadow-[0_1px_3px_rgba(20,38,31,0.08)] bg-bg overflow-hidden flex items-center justify-center flex-shrink-0"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <Logo size={size * 0.6} />
        )}
      </div>
      <label className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer inline-flex items-center gap-2">
        {subiendo ? "Subiendo..." : "Cambiar foto"}
        <input type="file" accept="image/*" onChange={handleFile} disabled={subiendo} className="hidden" />
      </label>
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
