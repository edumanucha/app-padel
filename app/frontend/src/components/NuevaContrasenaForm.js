"use client";

import ConPelota from "@/components/ConPelota";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

// "Elegí tu nueva contraseña" (2026-10-08, pedido del usuario). Se llega
// desde el link del mail de recuperación (LoginEmailForm → "¿Te olvidaste la
// contraseña?"). Acepta los dos formatos de link:
//  - ?token_hash=...&type=recovery (plantilla de mail de Supabase con
//    {{ .TokenHash }}): funciona aunque el link se abra en otro navegador
//    (por ejemplo, el navegador interno de la app de mail).
//  - ?code=... (link por defecto, flujo PKCE): la librería lo canjea sola,
//    pero solo en el mismo navegador donde se pidió el mail.
export default function NuevaContrasenaForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [estado, setEstado] = useState("verificando"); // verificando | listo | invalido | guardado
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    async function verificar() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      if (tokenHash) {
        const { error: e } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        if (vivo) setEstado(e ? "invalido" : "listo");
        return;
      }
      // Link con ?code=: esperar a que la librería arme la sesión.
      for (let i = 0; i < 10 && vivo; i++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setEstado("listo");
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (vivo) setEstado("invalido");
    }
    verificar();
    return () => {
      vivo = false;
    };
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setError("");
    if (clave.length < 6) {
      setError(t("nuevaClave.muyCorta"));
      return;
    }
    if (clave !== repetir) {
      setError(t("nuevaClave.noCoinciden"));
      return;
    }
    setGuardando(true);
    const { error: e2 } = await supabase.auth.updateUser({ password: clave });
    setGuardando(false);
    if (e2) {
      setError(/different from the old|same/i.test(e2.message) ? t("nuevaClave.igualALaAnterior") : `${t("nuevaClave.noSePudo")} ${e2.message}`);
      return;
    }
    setEstado("guardado");
    setTimeout(() => router.push("/"), 1500);
  }

  const etiqueta = "text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted";
  const campo = "rounded-[6px] border border-ink/15 bg-surface px-3 py-2 text-ink";

  return (
    <div className="w-full max-w-md flex flex-col gap-5 text-ink">
      <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{t("nuevaClave.titulo")}</ConPelota></h1>

      {estado === "verificando" && (
        <p className="text-sm text-muted inline-flex items-center gap-2">
          <PelotaLoader /> {t("nuevaClave.verificando")}
        </p>
      )}

      {estado === "invalido" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed">{t("nuevaClave.linkInvalido")}</p>
          <button onClick={() => router.push("/login")} className="self-start text-sm font-semibold px-3 py-2 rounded-[6px] border border-ink/15 cursor-pointer">
            {t("nuevaClave.volverAlLogin")}
          </button>
        </div>
      )}

      {estado === "guardado" && <p className="text-sm font-semibold">{t("nuevaClave.listo")}</p>}

      {estado === "listo" && (
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <p className="text-sm text-muted">{t("nuevaClave.explicacion")}</p>
          <label className="flex flex-col gap-1">
            <span className={etiqueta}>{t("nuevaClave.nueva")}</span>
            <input type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} required minLength={6} className={campo} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={etiqueta}>{t("nuevaClave.repetir")}</span>
            <input type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} required minLength={6} className={campo} />
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={guardando || !clave || !repetir}
            className="font-titulo font-black uppercase text-lg px-4 py-2.5 rounded-[6px] bg-accent text-accent-ink cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {guardando && <PelotaLoader />}
            {t("nuevaClave.guardar")}
          </button>
        </form>
      )}
    </div>
  );
}
