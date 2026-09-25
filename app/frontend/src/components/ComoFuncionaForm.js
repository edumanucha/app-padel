"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleContext";

// Recorrido honesto de funciones reales de la app (2026-09-10, a pedido
// del usuario, con relevamiento completo de historias-usuario-mvp.md +
// todas las rutas reales -- la primera versión se había quedado corta).
// Se separan las funciones YA construidas de las que todavía están en
// camino, para no vender algo que todavía no está (mismo criterio que ya
// usa el propio menú "Ver todo" con sus badges "Próximamente").
const BLOQUES = [
  { emoji: "👤", clave: "cuenta" },
  { emoji: "📅", clave: "partidos" },
  { emoji: "🎾", clave: "marcadorcito" },
  { emoji: "🏆", clave: "ranking" },
  { emoji: "👥", clave: "comunidad" },
  { emoji: "🤝", clave: "matchmaking" },
  { emoji: "📍", clave: "canchas" },
  { emoji: "💸", clave: "gastos" },
  { emoji: "🚩", clave: "apelaciones" },
  { emoji: "🏀", clave: "masAlla" },
];

const PROXIMAMENTE_CLAVES = ["proximamente1", "proximamente2", "proximamente3"];

export default function ComoFuncionaForm() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="w-full max-w-md bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">❓ {t("comoFunciona.titulo")}</h1>
        <button
          onClick={() => router.push("/menu")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          {t("comoFunciona.volver")}
        </button>
      </div>

      <p className="text-sm text-muted">{t("comoFunciona.subtitulo")}</p>

      <div className="flex flex-col gap-3">
        {BLOQUES.map((b) => (
          <div key={b.clave} className="bg-bg border-2 border-outline rounded-[14px] p-4 flex flex-col gap-1">
            <span className="font-heading font-semibold flex items-center gap-2">
              <span className="text-lg">{b.emoji}</span>
              {t(`comoFunciona.${b.clave}Titulo`)}
            </span>
            <p className="text-sm text-muted">{t(`comoFunciona.${b.clave}Texto`)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">{t("home.seViene")}</span>
        <div className="flex flex-col gap-2">
          {PROXIMAMENTE_CLAVES.map((clave) => (
            <span
              key={clave}
              className="text-sm px-4 py-3 rounded-[14px] border-2 border-outline border-dashed text-muted opacity-70"
            >
              {t(`comoFunciona.${clave}`)} · {t("home.proximamente")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
