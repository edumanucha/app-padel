"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleContext";

import { IconoFutbol, IconoBasquet } from "@/components/Icons";
// Maqueta navegable de un deporte todavía no construido (a pedido del
// usuario, 2026-09-06): reusa la estructura visual del Home real de
// Padelito (HomeForm.js) con datos de ejemplo, para mostrar hacia dónde
// va el producto sin hacerlo pasar por funcional. Ningún botón de acá
// navega a una pantalla real ni ejecuta ninguna acción -- mismo
// principio de US-5.1/5.2 (Próximamente sin acceso real), pero como
// pantalla completa en vez de un ítem de menú suelto.
// El ícono llega como nombre ("futbol" | "basquet"): una página de servidor
// no le puede pasar un componente a uno de cliente.
const ICONOS = { futbol: IconoFutbol, basquet: IconoBasquet };

export default function DeporteMaquetaForm({ nombre, icono, colorAcento, datosEjemplo }) {
  const Icono = ICONOS[icono];
  const router = useRouter();
  const { t } = useLocale();

  return (
    // Rediseño Cartel (2026-10-01): mismo esquema que el Inicio -- el próximo
    // partido de ejemplo es la protagonista verde tablero y el resto va en
    // filas con línea. Los "botones" siguen siendo de mentira (opacos).
    <div className="w-full max-w-md text-ink flex flex-col gap-5 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{Icono && <Icono className="ico" aria-hidden />}</span>
          <div>
            <span className="font-titulo text-4xl font-black uppercase leading-[0.95] block">{nombre}</span>
            <span className="text-muted text-sm">{t("deporteMaqueta.vistaPrevia")}</span>
          </div>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-[4px] flex-shrink-0"
          style={{ background: colorAcento, color: "#1a1305" }}
        >
          {t("home.proximamente")}
        </span>
      </div>

      <p className="text-sm text-muted">
        {t("deporteMaqueta.descripcion", { nombre })}
      </p>

      <div className="bg-[#154139] text-[#eaf4f0] rounded-[6px] p-4">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8fb6ae] block mb-1">{t("deporteMaqueta.proximoPartidoEjemplo")}</span>
        <span className="font-titulo font-extrabold uppercase text-2xl leading-none">{datosEjemplo.proximoPartido}</span>
      </div>

      <div className="grid grid-cols-2 border-y-2 border-ink opacity-60">
        <span className="font-titulo font-extrabold uppercase text-xl leading-none py-3 text-center">
          {t("home.crearPartido")}
        </span>
        <span className="font-titulo font-extrabold uppercase text-xl leading-none py-3 text-center border-l-2 border-ink">
          {t("home.abiertos")}
        </span>
      </div>

      <div className="border-b border-ink/10 pb-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted block mb-1">{t("deporteMaqueta.ultimoPartidoEjemplo")}</span>
        <span className="text-sm">{datosEjemplo.ultimoPartido}</span>
      </div>

      <div className="grid grid-cols-3">
        {datosEjemplo.stats.map((s, i) => (
          <div key={s.etiqueta} className={i === 0 ? "" : "border-l border-ink/15 pl-3"}>
            <span className="font-numero font-bold text-[2.2rem] leading-none block">{s.valor}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{s.etiqueta}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push("/elegir-deporte")}
        className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 text-ink cursor-pointer self-center mt-4"
      >
        ← {t("deporteMaqueta.elegirOtroDeporte")}
      </button>
    </div>
  );
}
