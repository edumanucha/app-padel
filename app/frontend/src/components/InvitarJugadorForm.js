"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

// Búsqueda + invitación de jugadores (US-2.3), embebido en la card de un
// partido propio dentro de ListaPartidosForm.js. La búsqueda usa la
// función `buscar_jugadores_para_invitar` (RPC) en vez de leer `perfiles`
// directo -- esa tabla solo permite ver el propio perfil (RLS de la
// Épica 1), y la función expone nada más que id+nombre de otros
// jugadores, sin adelantarse a la privacidad del teléfono (US-2.6).
export default function InvitarJugadorForm({ partidoId, onInvitado }) {
  const { t } = useLocale();
  const [abierto, setAbierto] = useState(false);
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [invitandoA, setInvitandoA] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [frecuentes, setFrecuentes] = useState([]);

  // US-7.1: al abrir el buscador, muestra primero mis frecuentes (antes
  // de escribir nada) -- agiliza invitar a la gente con la que siempre
  // juego, sin tener que tipear el nombre cada vez.
  async function handleAbrir() {
    setAbierto(true);
    const { data } = await supabase.rpc("listar_mis_frecuentes");
    setFrecuentes(data ?? []);
  }

  async function handleBuscar(e) {
    e.preventDefault();
    setError("");
    setMensaje("");
    setBuscando(true);

    const { data, error: buscarError } = await supabase.rpc(
      "buscar_jugadores_para_invitar",
      { p_partido_id: partidoId, p_termino: termino.trim() }
    );

    setBuscando(false);

    if (buscarError) {
      setError(t("invitarJugador.noSePudoBuscar", { mensaje: buscarError.message }));
      return;
    }

    setResultados(data ?? []);
  }

  async function handleInvitar(jugadorId) {
    setError("");
    setMensaje("");
    setInvitandoA(jugadorId);

    const { error: invitarError } = await supabase.from("partido_jugadores").insert({
      partido_id: partidoId,
      jugador_id: jugadorId,
      estado: "invitado",
    });

    setInvitandoA(null);

    if (invitarError) {
      setError(t("invitarJugador.noSePudoInvitar", { mensaje: invitarError.message }));
      return;
    }

    setResultados((prev) => prev.filter((r) => r.id !== jugadorId));
    setMensaje(t("perfilJugador.invitacionEnviada"));
    onInvitado?.();
  }

  if (!abierto) {
    return (
      <button
        onClick={handleAbrir}
        className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer self-start"
      >
        {t("invitarJugador.invitarJugador")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t-2 border-outline pt-3 mt-1">
      <form onSubmit={handleBuscar} className="flex gap-2">
        <input
          type="text"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder={t("directorio.buscarPorNombre")}
          className="rounded-xl bg-bg px-3 py-1.5 text-ink text-sm flex-1"
        />
        <button
          type="submit"
          disabled={buscando || termino.trim() === ""}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
        >
          {buscando && <PelotaLoader />}
          {t("directorio.buscar")}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {mensaje && <p className="text-sm text-muted">{mensaje}</p>}

      {resultados.length === 0 && frecuentes.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted uppercase">{t("invitarJugador.tusFrecuentes")}</span>
          {frecuentes.map((jugador) => (
            <div key={jugador.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">⭐ {jugador.nombre}</span>
              <button
                onClick={() => handleInvitar(jugador.id)}
                disabled={invitandoA === jugador.id}
                className="font-heading font-semibold text-sm px-3 py-1 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
              >
                {invitandoA === jugador.id && <PelotaLoader />}
                {t("perfilJugador.invitar")}
              </button>
            </div>
          ))}
        </div>
      )}

      {resultados.map((jugador) => (
        <div key={jugador.id} className="flex items-center justify-between gap-2">
          <span className="text-sm">{jugador.nombre}</span>
          <button
            onClick={() => handleInvitar(jugador.id)}
            disabled={invitandoA === jugador.id}
            className="font-heading font-semibold text-sm px-3 py-1 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
          >
            {invitandoA === jugador.id && <PelotaLoader />}
            {t("perfilJugador.invitar")}
          </button>
        </div>
      ))}

      <button
        onClick={() => setAbierto(false)}
        className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] self-start"
      >
        {t("invitarJugador.cerrar")}
      </button>
    </div>
  );
}
