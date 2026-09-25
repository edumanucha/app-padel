"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import Logo from "@/components/Logo";
import DotDigit from "@/components/DotDigit";
import marcadorStyles from "@/components/Marcador.module.css";

const TIPS = {
  drive: [
    "En el drive, cubrí los globos que caen de tu lado y dejale el resto de la cancha a tu compañero/a.",
    "Antes de sacar, mirá si el rival de revés está más cómodo o más incómodo — apuntale ahí.",
    "El drive suele definir de derecha: buscá la víbora cruzada cuando tengas un globo cómodo.",
  ],
  reves: [
    "De revés, la bandeja es tu mejor arma para no arriesgar de más en globos altos.",
    "Cubrí bien la pared de tu lado — la mayoría de los puntos en revés se definen ahí.",
    "Si te sacan corto de revés, priorizá meter la pelota antes que buscar un golpe ganador.",
  ],
};

// Random en cada visita (no fijo por día) -- a pedido del usuario,
// 2026-09-05: quería que el tip cambiara cada vez que entra a esta
// pantalla, no que se repita el mismo todo el día.
function tipAleatorio(posicion) {
  const lista = TIPS[posicion] ?? TIPS.drive;
  const indice = Math.floor(Math.random() * lista.length);
  return lista[indice];
}

function formatearFecha(fechaIso) {
  return new Date(fechaIso).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearResultado(setsA, setsB) {
  if (!setsA || !setsB) return "";
  return setsA.map((_, i) => `${setsA[i]}-${setsB[i]}`).join(", ");
}

export default function HomeForm() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [canchaRecomendada, setCanchaRecomendada] = useState(null);
  const [tip, setTip] = useState("");
  const [cargando, setCargando] = useState(true);
  const [historial, setHistorial] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [error, setError] = useState("");
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [proximamenteTocado, setProximamenteTocado] = useState(null);
  const [mostrarMas, setMostrarMas] = useState(false);

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // A pedido del usuario (2026-09-06): la app ahora arranca por
        // "Elegí tu deporte" (sin sesión), no directo al login -- ver
        // ElegirDeporteForm.js.
        router.replace("/elegir-deporte");
        return;
      }

      // US-6.7: si venía de "compartir partido" y tuvo que loguearse
      // primero, lo mandamos de vuelta a esa vista pública en vez de
      // quedarse en el Home.
      const volverA = sessionStorage.getItem("volverA");
      if (volverA) {
        sessionStorage.removeItem("volverA");
        router.replace(volverA);
        return;
      }

      const { data: perfilData, error: perfilError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (perfilError) {
        setError(`No se pudo cargar tu perfil: ${perfilError.message}`);
        setCargando(false);
        return;
      }

      if (!perfilData) {
        router.replace("/completar-perfil");
        return;
      }

      if (!perfilData.activo) {
        router.replace("/perfil");
        return;
      }

      setPerfil(perfilData);
      setTip(tipAleatorio(perfilData.posicion));

      const { data: resumenData, error: resumenError } = await supabase.rpc("resumen_home");
      if (resumenError) {
        setError(`No se pudo cargar el resumen: ${resumenError.message}`);
      } else {
        setResumen(resumenData);
      }

      const { data: canchas } = await supabase
        .from("canchas")
        .select("nombre, zona")
        .eq("provincia", perfilData.provincia)
        .limit(1);
      setCanchaRecomendada(canchas?.[0] ?? null);

      const { data: notifData } = await supabase.rpc("listar_notificaciones");
      setNotificaciones(notifData ?? []);

      setCargando(false);
    }

    cargar();
  }, [router]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  async function handleAbrirNotificaciones() {
    setMostrarNotificaciones((v) => !v);
  }

  async function handleMarcarTodasLeidas() {
    await supabase.rpc("marcar_todas_notificaciones_leidas");
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  }

  async function handleClickNotificacion(n) {
    if (!n.leida) {
      await supabase.from("notificaciones").update({ leida: true }).eq("id", n.id);
      setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    }
    if (n.tipo === "mensaje_nuevo") {
      router.push("/mensajes");
    } else if (n.partido_id) {
      router.push(`/partido/${n.partido_id}`);
    }
  }

  async function handleVerHistorial() {
    setMostrarHistorial((v) => !v);
    if (historial !== null) return; // ya se cargó una vez, no repetir
    setCargandoHistorial(true);
    const { data, error: historialError } = await supabase.rpc("mi_historial_partidos");
    setCargandoHistorial(false);
    if (historialError) {
      setError(`No se pudo cargar el historial: ${historialError.message}`);
      return;
    }
    setHistorial(data ?? []);
  }

  if (cargando) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <PelotaLoader />
        <p>Cargando...</p>
      </div>
    );
  }

  if (!perfil) return null;

  return (
    <div className="w-full max-w-md flex flex-col gap-4 pb-10">
      {/* 1. Saludo + ranking */}
      <div className="bg-surface text-ink border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[20px] p-5 flex items-center justify-between">
        <button
          onClick={() => router.push("/perfil")}
          className="flex items-center gap-3 text-left cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] bg-bg overflow-hidden flex items-center justify-center flex-shrink-0">
            {perfil.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Logo size={30} />
            )}
          </div>
          <div>
            <span className="font-heading text-lg font-semibold block">Hola, {perfil.nombre.split(" ")[0]}</span>
            <span className="text-muted text-sm">{perfil.puntos_ranking} puntos de ranking</span>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/menu")}
            className="w-10 h-10 rounded-full border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] bg-bg flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label="Ver todo"
            title="Ver todo"
          >
            ☰
          </button>
          <button
            onClick={handleAbrirNotificaciones}
            className="relative w-10 h-10 rounded-full border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] bg-bg flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label="Notificaciones"
          >
            🔔
            {noLeidas > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-heading font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </button>
        </div>
      </div>

      {mostrarNotificaciones && (
        <div className="bg-surface border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[16px] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-heading font-semibold text-sm">Notificaciones</span>
            <div className="flex items-center gap-2">
              {noLeidas > 0 && (
                <button onClick={handleMarcarTodasLeidas} className="text-xs text-muted underline">
                  Marcar todas leídas
                </button>
              )}
              <button onClick={() => setMostrarNotificaciones(false)} className="text-xs text-muted">
                Cerrar ✕
              </button>
            </div>
          </div>
          {notificaciones.length === 0 && (
            <span className="text-sm text-muted">No tenés notificaciones todavía.</span>
          )}
          {notificaciones.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClickNotificacion(n)}
              className={`text-left border-2 border-outline rounded-[12px] p-2 flex flex-col gap-0.5 cursor-pointer ${
                n.leida ? "bg-bg" : "bg-accent/20"
              }`}
            >
              <span className="text-sm">{n.mensaje}</span>
              <span className="text-xs text-muted">{new Date(n.creado_en).toLocaleString("es-AR")}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* 2. Próximo partido */}
      <div className="bg-surface text-ink border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[16px] p-4">
        <span className="font-heading font-semibold text-sm block mb-1">Tu próximo partido</span>
        {resumen?.proximo_partido ? (
          <button
            onClick={() => router.push(`/partido/${resumen.proximo_partido.partido_id}`)}
            className="text-left text-sm text-muted"
          >
            {formatearFecha(resumen.proximo_partido.fecha_hora)} · {resumen.proximo_partido.cancha}
          </button>
        ) : (
          <span className="text-sm text-muted">No tenés partidos próximos — creá uno o sumate a uno abierto.</span>
        )}
      </div>

      {/* 3. Invitaciones pendientes */}
      {resumen?.invitaciones_pendientes > 0 && (
        <button
          onClick={() => router.push("/invitaciones")}
          className="font-heading font-semibold text-sm px-4 py-3 rounded-[16px] bg-accent text-accent-ink border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] cursor-pointer text-left"
        >
          🔔 Tenés {resumen.invitaciones_pendientes} invitación{resumen.invitaciones_pendientes > 1 ? "es" : ""} pendiente
          {resumen.invitaciones_pendientes > 1 ? "s" : ""}
        </button>
      )}

      {/* 4. Sección "Jugar" -- Marcadorcito como hero + las dos acciones
          más frecuentes debajo, con más aire entre bloques (a pedido del
          usuario, 2026-09-06: "que juguemos más con los espacios"). */}
      <div className="flex flex-col gap-3">
        <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">Jugar</span>

        <button
          onClick={() => router.push("/marcador-libre")}
          className="font-heading font-bold text-xl px-6 py-6 rounded-[20px] bg-accent text-accent-ink border-[3px] border-outline shadow-[6px_6px_0_var(--shadow-color)] cursor-pointer flex items-center gap-4 text-left"
        >
          <div
            className={`${marcadorStyles.miniPreview} flex items-center gap-2 px-3 py-2 rounded-[10px] border-2 border-outline flex-shrink-0`}
            style={{ background: "#0c2320" }}
          >
            <DotDigit valor="6" />
            <span className="text-lg text-white">-</span>
            <DotDigit valor="3" />
          </div>
          <div>
            <span className="block">🎾 Marcadorcito</span>
            <span className="font-body font-normal text-xs opacity-80 leading-snug block">
              Cantá el tanto por voz — se actualiza solo, en tiempo real, para todos los que juegan.
            </span>
          </div>
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/crear-partido")}
            className="flex-[2] font-heading font-semibold text-sm px-4 py-4 rounded-[16px] bg-accent text-accent-ink border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] cursor-pointer"
          >
            📅 Crear partido
          </button>
          <button
            onClick={() => router.push("/partidos")}
            className="flex-1 font-heading font-semibold text-sm px-4 py-4 rounded-[16px] bg-accent text-accent-ink border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] cursor-pointer"
          >
            🔍 Abiertos
          </button>
        </div>
      </div>

      {/* 5. Último partido jugado */}
      <div className="bg-surface text-ink border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[16px] p-4">
        <span className="font-heading font-semibold text-sm block mb-1">Último partido jugado</span>
        {resumen?.ultimo_partido ? (
          <span className="text-sm text-muted">
            {resumen.ultimo_partido.gano ? "🏆 Ganaste" : "Perdiste"} vs. {resumen.ultimo_partido.rival_nombres} (
            {formatearResultado(resumen.ultimo_partido.sets_a, resumen.ultimo_partido.sets_b)})
          </span>
        ) : (
          <span className="text-sm text-muted">Todavía no jugaste ningún partido hasta el final.</span>
        )}
      </div>

      {/* 6/7/8. Racha, posición, estadística rápida -- racha y % jugados
          abren el historial de partidos (rival + resultado); posición
          lleva directo al directorio/ranking. */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={handleVerHistorial} className="bg-surface border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[16px] p-3 text-center cursor-pointer">
          <span className="font-heading text-xl font-semibold block">{resumen?.racha_actual ?? 0}</span>
          <span className="text-xs text-muted">Racha ganada</span>
        </button>
        <button onClick={() => router.push("/jugadores")} className="bg-surface border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[16px] p-3 text-center cursor-pointer">
          <span className="font-heading text-xl font-semibold block">
            #{resumen?.posicion_ranking ?? "-"}
          </span>
          <span className="text-xs text-muted">de {resumen?.total_jugadores ?? "-"} en el ranking</span>
        </button>
        <button onClick={handleVerHistorial} className="bg-surface border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[16px] p-3 text-center cursor-pointer">
          <span className="font-heading text-xl font-semibold block">{resumen?.porcentaje_victorias ?? 0}%</span>
          <span className="text-xs text-muted">{resumen?.partidos_jugados ?? 0} jugados</span>
        </button>
      </div>

      {mostrarHistorial && (
        <div className="bg-surface border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[16px] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-heading font-semibold text-sm">Tus partidos jugados</span>
            <button onClick={() => setMostrarHistorial(false)} className="text-xs text-muted">
              Cerrar ✕
            </button>
          </div>
          {cargandoHistorial && <PelotaLoader />}
          {!cargandoHistorial && historial?.length === 0 && (
            <span className="text-sm text-muted">Todavía no jugaste ningún partido hasta el final.</span>
          )}
          {!cargandoHistorial &&
            historial?.map((h) => (
              <div key={h.partido_id} className="border-2 border-outline rounded-[12px] p-2 flex flex-col gap-0.5">
                <span className="text-xs text-muted">
                  {new Date(h.fecha_hora).toLocaleDateString("es-AR")} · {h.cancha}
                </span>
                <span className="text-sm">
                  {h.gano ? "🏆 Ganaste" : "Perdiste"} vs. {h.rival_nombres} ({formatearResultado(h.sets_a, h.sets_b)})
                </span>
              </div>
            ))}
        </div>
      )}

      {/* 9. Espacio de publicidad: ejemplo de auspiciante real (mockup, para
          mostrar el espacio "vendible") + fallback de cancha recomendada
          cuando no hay ningún auspiciante cargado todavía. */}
      <div className="bg-accent border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[16px] p-4 flex items-center gap-3 relative overflow-hidden">
        <span className="absolute top-1.5 right-2 text-[10px] uppercase tracking-wide text-accent-ink/60 font-heading font-semibold">
          Auspiciado · Ejemplo
        </span>
        <span className="text-3xl">🛒</span>
        <div className="flex flex-col text-accent-ink">
          <span className="font-heading font-semibold text-sm">Padel Pro Shop Mendoza</span>
          <span className="text-sm">20% OFF en paletas esta semana con el código PADELAPP</span>
        </div>
      </div>
      {canchaRecomendada && (
        <div className="bg-bg border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[16px] p-3 text-center">
          <span className="text-sm">
            🎾 Te recomendamos <strong>{canchaRecomendada.nombre}</strong>
            {canchaRecomendada.zona ? ` (${canchaRecomendada.zona})` : ""}
          </span>
        </div>
      )}

      {/* 10. Tip de juego según posición */}
      <div className="bg-surface border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[16px] p-4">
        <span className="font-heading font-semibold text-sm block mb-1">
          Tip de {perfil.posicion === "reves" ? "revés" : "drive"}
        </span>
        <span className="text-sm text-muted">{tip}</span>
      </div>

      {/* 11. Resto de accesos, en secciones con más aire entre grupos en
          vez de un solo grid corrido (a pedido del usuario, 2026-09-06) --
          colores secundarios (turquesa/coral) para diferenciar categorías
          en vez de que todo sea gris/amarillo. */}
      <div className="flex flex-col gap-3">
        <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">Comunidad</span>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => router.push("/jugadores")}
            className="font-heading font-semibold text-xs px-2 py-3 rounded-[14px] bg-accent-2 text-accent-2-ink border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] cursor-pointer flex flex-col items-center gap-1"
          >
            <span className="text-lg">🏆</span>Jugadores
          </button>
          <button
            onClick={() => router.push("/mensajes")}
            className="font-heading font-semibold text-xs px-2 py-3 rounded-[14px] bg-accent-2 text-accent-2-ink border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] cursor-pointer flex flex-col items-center gap-1"
          >
            <span className="text-lg">💬</span>Mensajes
          </button>
          <button
            onClick={() => router.push("/invitaciones")}
            className="font-heading font-semibold text-xs px-2 py-3 rounded-[14px] bg-accent-2 text-accent-2-ink border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] cursor-pointer flex flex-col items-center gap-1"
          >
            <span className="text-lg">✉️</span>Invitaciones
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">Matchmaking</span>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/disponibilidad")}
            className="flex-1 font-heading font-semibold text-sm px-4 py-3 rounded-[14px] bg-accent-2 text-accent-2-ink border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] cursor-pointer"
          >
            🔮 Disponibilidad
          </button>
          <button
            onClick={() => router.push("/companero-fijo")}
            className="flex-1 font-heading font-semibold text-sm px-4 py-3 rounded-[14px] bg-accent-2 text-accent-2-ink border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] cursor-pointer"
          >
            🤝 Compañero fijo
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">Recursos</span>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/canchas")}
            className="flex-[2] font-heading font-semibold text-sm px-4 py-3 rounded-[14px] bg-accent-3 text-accent-3-ink border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] cursor-pointer"
          >
            📍 Canchas
          </button>
          <button
            onClick={() => router.push("/mis-partidos")}
            className="flex-1 font-heading font-semibold text-sm px-4 py-3 rounded-[14px] bg-accent-3 text-accent-3-ink border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] cursor-pointer"
          >
            📋 Mis partidos
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">Cuenta</span>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/perfil")}
            className="flex-1 font-heading font-semibold text-sm px-4 py-3 rounded-full bg-surface text-ink border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] cursor-pointer"
          >
            👤 Mi perfil
          </button>
          <button
            onClick={() => setMostrarMas((v) => !v)}
            className="font-heading font-semibold text-sm px-4 py-3 rounded-full bg-surface text-ink border-2 border-outline shadow-[3px_3px_0_var(--shadow-color)] cursor-pointer"
          >
            {mostrarMas ? "Menos ▲" : "Más ▾"}
          </button>
        </div>

        {mostrarMas && (
          <div className="flex flex-col gap-2 pl-1">
            <button
              onClick={() => router.push("/apelaciones")}
              className="text-left font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink border-2 border-outline cursor-pointer"
            >
              🚩 Apelaciones
            </button>
            {perfil.es_superusuario && (
              <button
                onClick={() => router.push("/admin/canchas")}
                className="text-left font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink border-2 border-outline cursor-pointer"
              >
                🛠️ Admin canchas
              </button>
            )}
            <button
              onClick={() => router.push("/elegir-deporte")}
              className="text-left font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink border-2 border-outline cursor-pointer"
            >
              🏆 Cambiar de deporte
            </button>
          </div>
        )}
      </div>

      {/* 11.b Próximamente (US-5.1): funcionalidades de fases futuras del
          roadmap, ya visibles pero sin acceso real -- badge inequívoco y
          no navegan a ninguna pantalla funcional. */}
      <div className="bg-surface border-[3px] border-outline shadow-[5px_5px_0_var(--shadow-color)] rounded-[16px] p-4 flex flex-col gap-2">
        <span className="font-heading font-semibold text-sm">Se viene</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icono: "📅", texto: "Reservar cancha" },
            { icono: "📊", texto: "Estadísticas de partido" },
            { icono: "📶", texto: "Modo sin conexión" },
          ].map((item) => (
            <button
              key={item.texto}
              onClick={() => setProximamenteTocado(item.texto)}
              className="relative font-heading font-semibold text-xs px-3 py-3 rounded-[12px] bg-bg text-muted border-2 border-outline border-dashed cursor-pointer text-left opacity-70"
            >
              <span className="absolute -top-2 -right-1 bg-accent text-accent-ink text-[9px] px-1.5 py-0.5 rounded-full border-2 border-outline">
                Próximamente
              </span>
              {item.icono} {item.texto}
            </button>
          ))}
        </div>
        {proximamenteTocado && (
          <span className="text-xs text-muted">
            "{proximamenteTocado}" todavía está en desarrollo — pronto vas a poder usarlo.
          </span>
        )}
      </div>

      {/* 12. Pie de página */}
      <p className="text-center text-xs text-muted pt-4">© 2026 Eduardo Manucha. Todos los derechos reservados.</p>
    </div>
  );
}
