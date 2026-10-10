"use client";

import ConPelota from "@/components/ConPelota";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";
import { PROVINCIAS, etiquetaZona } from "@/lib/zonasPorProvincia";

const etiquetaClass = "text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted";

const NOMBRE_FALLA = {
  sync: "Puntos sin sincronizar (sin señal)",
  reloj_envio: "El reloj no recibió el marcador",
  reloj_activar: "No se pudo activar el reloj",
  camara: "Cámara o gestos",
  voz: "Voz",
};
const NOMBRE_MODO = { reloj: "Reloj", botones: "Manual", voz: "Voz", camara: "Gestos" };

const pct = (n, d) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "–");
const dia = (iso) => {
  if (!iso) return "–";
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}`;
};

function Seccion({ titulo, nota, children }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5 pb-1.5 border-b-2 border-ink">
        <span className={etiquetaClass}>{titulo}</span>
        {nota && <span className="text-xs text-muted leading-snug">{nota}</span>}
      </div>
      {children}
    </section>
  );
}

function Fila({ izq, der, fuerte }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-ink/10 text-sm">
      <span className={`min-w-0 break-words ${fuerte ? "font-bold" : ""}`}>{izq}</span>
      <span className="font-numero whitespace-nowrap">{der}</span>
    </div>
  );
}

const SEXO = { masculino: "Hombre", femenino: "Mujer" };
const MANO = { diestro: "Diestro", zurdo: "Zurdo" };
const POSICION = { drive: "Drive", reves: "Revés", indistinto: "Indistinto" };
const provincia = (v) => PROVINCIAS.find((p) => p.valor === v)?.etiqueta ?? v ?? "–";

// Ficha de un usuario (2026-10-10, pedido del usuario: "poder seleccionar
// cada usuario que se unió y tener la mayor cantidad de info posible
// respetando la privacidad"): todo lo que hace en la app, sin nombre, mail,
// teléfono ni lo que escribe (SQL 094, estadisticas_usuario_admin).
function FichaUsuario({ f }) {
  const pe = f.perfil ?? {};
  const pa = f.partidos ?? {};
  const porDia = f.por_dia ?? [];
  const maxDia = Math.max(1, ...porDia.map((d) => d.minutos));
  return (
    <div className="flex flex-col gap-3 bg-[#154139] text-[#eaf4f0] rounded-[8px] p-3.5 my-1.5">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <span className="text-[#8fb6ae]">Provincia</span><span>{provincia(pe.provincia)}</span>
        <span className="text-[#8fb6ae]">Zona</span><span>{pe.zona ? etiquetaZona(pe.zona) : "–"}</span>
        <span className="text-[#8fb6ae]">Género</span><span>{SEXO[pe.sexo] ?? pe.sexo ?? "–"}</span>
        <span className="text-[#8fb6ae]">Nivel</span><span>{pe.nivel ?? "–"}</span>
        <span className="text-[#8fb6ae]">Mano · posición</span><span>{MANO[pe.mano_habil] ?? pe.mano_habil ?? "–"} · {POSICION[pe.posicion] ?? pe.posicion ?? "–"}</span>
        <span className="text-[#8fb6ae]">Foto de perfil</span><span>{pe.con_foto ? "Sí" : "No"}</span>
        <span className="text-[#8fb6ae]">Busca compañero</span><span>{pe.busca_companero ? "Sí" : "No"}</span>
        <span className="text-[#8fb6ae]">Notificaciones</span><span>{pe.notificaciones ? "Activadas" : "Apagadas"}</span>
        <span className="text-[#8fb6ae]">Llegó por /probar</span><span>{f.vino_de_probar ? "Sí" : "No"}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 border-t border-[#eaf4f0]/15 pt-3">
        {[
          [dia(f.alta), "Alta"],
          [dia(f.ultima), "Última vez"],
          [f.dias_activos ?? 0, "Días activos"],
          [`${f.minutos ?? 0}'`, "Minutos"],
        ].map(([v, t]) => (
          <div key={t} className="flex flex-col">
            <span className="font-numero text-xl leading-none">{v}</span>
            <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#8fb6ae] mt-1">{t}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#8fb6ae]">Minutos por día · 30 días</span>
        <div className="flex items-end gap-[2px] h-10">
          {porDia.map((d) => (
            <div key={d.dia} title={`${dia(d.dia)}: ${d.minutos}'`} className="flex-1 bg-accent rounded-t-[1px]" style={{ height: `${Math.max(d.minutos > 0 ? 10 : 3, (d.minutos / maxDia) * 100)}%`, opacity: d.minutos > 0 ? 1 : 0.2 }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm border-t border-[#eaf4f0]/15 pt-3">
        <span className="text-[#8fb6ae]">Partidos terminados</span><span>{pa.terminados ?? 0} ({pa.ganados ?? 0} ganados)</span>
        <span className="text-[#8fb6ae]">Con el Marcadorcito</span><span>{pa.con_marcadorcito ?? 0}</span>
        <span className="text-[#8fb6ae]">Cargados a mano</span><span>{pa.a_mano ?? 0}</span>
        <span className="text-[#8fb6ae]">Partidos que organizó</span><span>{f.organizo ?? 0}</span>
        <span className="text-[#8fb6ae]">Grupos</span><span>{f.grupos ?? 0}</span>
        <span className="text-[#8fb6ae]">Torneos que armó</span><span>{f.torneos ?? 0}</span>
        <span className="text-[#8fb6ae]">Mensajes enviados</span><span>{f.mensajes_enviados ?? 0}</span>
        <span className="text-[#8fb6ae]">Jugadores frecuentes</span><span>{f.frecuentes ?? 0}</span>
        <span className="text-[#8fb6ae]">Fallas</span><span>{f.fallas ?? 0}</span>
      </div>
      {(f.modos ?? []).length > 0 && (
        <div className="text-sm border-t border-[#eaf4f0]/15 pt-3">
          <span className="text-[#8fb6ae]">Cómo lleva los puntos: </span>
          {f.modos.map((m) => `${NOMBRE_MODO[m.modo] ?? m.modo} ${m.n}`).join(" · ")}
        </div>
      )}
      {(f.pantallas ?? []).length > 0 && (
        <div className="flex flex-col text-sm border-t border-[#eaf4f0]/15 pt-3">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#8fb6ae] mb-1">Lo que más abre</span>
          {f.pantallas.map((x) => (
            <div key={x.pantalla} className="flex justify-between gap-3 py-0.5">
              <span className="min-w-0 break-words">{x.pantalla}</span>
              <span className="font-numero">{x.n}</span>
            </div>
          ))}
        </div>
      )}
      {(f.dispositivos ?? []).length > 0 && (
        <div className="text-sm border-t border-[#eaf4f0]/15 pt-3">
          <span className="text-[#8fb6ae]">Dispositivos: </span>
          {f.dispositivos.join(" · ")}
        </div>
      )}
    </div>
  );
}

function Numero({ valor, titulo }) {
  return (
    <div className="flex flex-col">
      <span className="font-numero text-4xl leading-none">{valor ?? 0}</span>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted mt-1">{titulo}</span>
    </div>
  );
}

// Panel privado del superusuario (2026-10-06): estadísticas de uso anónimas.
// Los usuarios salen como "Usuario N" (por orden de alta), sin nombre ni mail.
export default function AdminEstadisticasForm() {
  const router = useRouter();
  const [datos, setDatos] = useState(null);
  const [partidos, setPartidos] = useState(null); // SQL 083 (si todavía no se corrió, queda en null)
  const [error, setError] = useState("");
  const [quienes, setQuienes] = useState(null); // SQL 094 (null si todavía no se corrió)
  const [abierto, setAbierto] = useState(null); // número de usuario con la ficha abierta
  const [fichas, setFichas] = useState({});

  async function abrirFicha(n) {
    if (abierto === n) {
      setAbierto(null);
      return;
    }
    setAbierto(n);
    if (fichas[n]) return;
    const { data } = await supabase.rpc("estadisticas_usuario_admin", { p_n: n });
    if (data) setFichas((f) => ({ ...f, [n]: data }));
  }

  async function cargar() {
    setError("");
    const {
      data: { user },
    } = await usuarioRapido();
    if (!user) {
      router.replace("/login");
      return;
    }
    const [{ data, error: rpcError }, { data: dataPartidos }, { data: dataQuienes }] = await Promise.all([
      supabase.rpc("estadisticas_admin"),
      supabase.rpc("estadisticas_partidos_admin"),
      supabase.rpc("estadisticas_quienes_admin"),
    ]);
    setPartidos(dataPartidos ?? null);
    setQuienes(dataQuienes ?? null);
    setFichas({});
    if (rpcError) {
      if (/no_permitido/.test(rpcError.message ?? "")) {
        router.replace("/");
        return;
      }
      setError(
        /estadisticas_admin|does not exist|schema cache/i.test(rpcError.message ?? "")
          ? "Todavía falta correr el SQL 082 en Supabase."
          : `No se pudieron cargar las estadísticas: ${rpcError.message}`
      );
      return;
    }
    setDatos(data);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="w-full max-w-md flex flex-col gap-3 text-ink">
        <p role="alert" className="text-sm text-[#dc2626]">{error}</p>
        <button onClick={() => router.push("/menu")} className="self-start text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer">Volver</button>
      </div>
    );
  }
  if (!datos) return <p className="text-muted p-6">Cargando…</p>;

  const r = datos.resumen ?? {};
  const act = datos.activacion ?? {};
  const ret = datos.retencion ?? {};
  const pr = datos.probar ?? {};
  const altas = datos.altas_por_dia ?? [];
  const maxAlta = Math.max(1, ...altas.map((a) => a.n));
  const minutos7 = r.minutos_7d ?? 0;
  const minPorActivo = r.activos_7d > 0 ? Math.round(minutos7 / r.activos_7d) : 0;

  return (
    <div className="w-full max-w-md flex flex-col gap-6 text-ink">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-titulo text-4xl font-black uppercase leading-[0.95]"><ConPelota>{"Estadísticas de uso"}</ConPelota></h1>
        <button onClick={() => router.back()} className="text-sm font-semibold px-3 py-1.5 rounded-[6px] border border-ink/15 cursor-pointer flex-shrink-0">
          Volver
        </button>
      </div>
      <p className="text-sm text-muted leading-relaxed -mt-2">
        Datos anónimos: no se ven nombres ni mails, y tus propias cuentas y las demo no cuentan.
      </p>

      <div className="grid grid-cols-3 gap-x-3 gap-y-5">
        <Numero valor={r.usuarios} titulo="Usuarios" />
        <Numero valor={r.altas_7d} titulo="Altas 7 días" />
        <Numero valor={r.altas_hoy} titulo="Altas hoy" />
        <Numero valor={r.activos_hoy} titulo="Activos hoy" />
        <Numero valor={r.activos_7d} titulo="Activos 7 días" />
        <Numero valor={r.activos_30d} titulo="Activos 30 días" />
        <Numero valor={r.partidos_terminados_7d} titulo="Partidos 7 días" />
        <Numero valor={`${minutos7}'`} titulo="Uso 7 días" />
        <Numero valor={`${minPorActivo}'`} titulo="Por activo" />
      </div>

      {quienes && (
        <Seccion titulo="Quiénes son" nota="Usuarios reales por provincia, género y nivel.">
          {(quienes.por_provincia ?? []).map((x) => (
            <Fila key={x.provincia} izq={provincia(x.provincia)} der={x.n} />
          ))}
          {(() => {
            const total = (quienes.por_sexo ?? []).reduce((a, x) => a + x.n, 0);
            return total > 0 ? (
              <div className="flex h-7 rounded-[6px] overflow-hidden mt-2 text-xs font-bold">
                {quienes.por_sexo.map((x, i) => (
                  <div
                    key={x.sexo}
                    className={`flex items-center px-2 whitespace-nowrap overflow-hidden ${i === 0 ? "bg-[#154139] text-[#eaf4f0]" : "bg-accent text-accent-ink"}`}
                    style={{ width: `${(x.n / total) * 100}%` }}
                  >
                    {SEXO[x.sexo] ?? x.sexo} {x.n} · {pct(x.n, total)}
                  </div>
                ))}
              </div>
            ) : null;
          })()}
          {(quienes.por_nivel ?? []).length > 0 && (
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-xs text-muted">Por nivel</span>
              <div className="flex items-end gap-1 h-14">
                {quienes.por_nivel.map((x) => (
                  <div key={x.nivel} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
                    <div
                      className="w-full bg-[#154139] rounded-t-[2px]"
                      style={{ height: `${Math.max(8, (x.n / Math.max(1, ...quienes.por_nivel.map((y) => y.n))) * 100)}%` }}
                      title={`Nivel ${x.nivel}: ${x.n}`}
                    />
                    <span className="text-[10.5px] text-muted">{x.nivel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Seccion>
      )}

      {partidos && (
        <Seccion titulo="Partidos terminados" nota="Llevados con el Marcadorcito vs. cargados a mano después de jugarlos (sin estadísticas de puntos).">
          <Fila izq="Con el Marcadorcito" der={`${partidos.marcadorcito_7d ?? 0} en 7 d · ${partidos.marcadorcito_30d ?? 0} en 30 d · ${partidos.marcadorcito_total ?? 0} en total`} fuerte />
          <Fila izq="Cargados a mano" der={`${partidos.a_mano_7d ?? 0} en 7 d · ${partidos.a_mano_30d ?? 0} en 30 d · ${partidos.a_mano_total ?? 0} en total`} fuerte />
          <Fila
            izq="Participación del Marcadorcito"
            der={pct(partidos.marcadorcito_total ?? 0, (partidos.marcadorcito_total ?? 0) + (partidos.a_mano_total ?? 0))}
          />
          <Fila izq="Usuarios que cargaron alguno a mano" der={partidos.usuarios_a_mano ?? 0} />
        </Seccion>
      )}

      <Seccion titulo="Altas por día" nota="Últimos 30 días.">
        <div className="flex items-end gap-[3px] h-16">
          {altas.map((a) => (
            <div key={a.dia} title={`${dia(a.dia)}: ${a.n}`} className="flex-1 bg-accent rounded-t-[2px]" style={{ height: `${Math.max(a.n > 0 ? 8 : 2, (a.n / maxAlta) * 100)}%`, opacity: a.n > 0 ? 1 : 0.25 }} />
          ))}
        </div>
        <div className="flex justify-between text-[10.5px] text-muted">
          <span>{dia(altas[0]?.dia)}</span>
          <span>{dia(altas[altas.length - 1]?.dia)}</span>
        </div>
      </Seccion>

      <Seccion titulo="Activación" nota="De los que se registraron, cuántos terminaron su primer partido.">
        <Fila izq="Terminaron un partido" der={`${act.con_partido ?? 0} de ${act.altas ?? 0} · ${pct(act.con_partido, act.altas)}`} fuerte />
        <Fila izq="Y lo llevaron con el Marcadorcito" der={`${act.con_marcadorcito ?? 0} · ${pct(act.con_marcadorcito, act.altas)}`} />
      </Seccion>

      <Seccion titulo="Retención" nota="Cuántos volvieron a abrir la app dentro de 1, 7 y 30 días del alta. Cuenta solo a quienes ya pasaron ese tiempo.">
        {[
          ["d1", "Al día siguiente"],
          ["d7", "Dentro de 7 días"],
          ["d30", "Dentro de 30 días"],
        ].map(([k, nombre]) => (
          <Fila key={k} izq={nombre} der={`${ret[k]?.volvieron ?? 0} de ${ret[k]?.de ?? 0} · ${pct(ret[k]?.volvieron, ret[k]?.de)}`} />
        ))}
      </Seccion>

      <Seccion titulo="Embudo de /probar" nota="Quienes entran al link de Instagram sin cuenta.">
        <Fila izq="Entraron" der={pr.entraron ?? 0} fuerte />
        <Fila izq="Sumaron puntos" der={`${pr.sumaron ?? 0} · ${pct(pr.sumaron, pr.entraron)}`} />
        <Fila izq="Tocaron “Crear mi cuenta”" der={`${pr.pidieron_cuenta ?? 0} · ${pct(pr.pidieron_cuenta, pr.entraron)}`} />
        <Fila izq="Terminaron creando la cuenta" der={`${pr.crearon_cuenta ?? 0} · ${pct(pr.crearon_cuenta, pr.entraron)}`} />
      </Seccion>

      <Seccion titulo="Qué usan" nota="Pantallas más abiertas en 30 días (solo usuarios con cuenta).">
        {(datos.funciones ?? []).length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay datos.</p>
        ) : (
          datos.funciones.map((f) => <Fila key={f.pantalla} izq={f.pantalla} der={`${f.usos} · ${f.usuarios} usr.`} />)
        )}
      </Seccion>

      <Seccion titulo="Cómo llevan los puntos" nota="Modo elegido en el Marcadorcito, 30 días.">
        {(datos.modos ?? []).length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay datos.</p>
        ) : (
          datos.modos.map((m) => <Fila key={m.modo} izq={NOMBRE_MODO[m.modo] ?? m.modo} der={m.n} />)
        )}
      </Seccion>

      <Seccion titulo="Fallas" nota="Errores que la app registró en 30 días, por tipo y por dispositivo.">
        {(datos.fallas ?? []).length === 0 ? (
          <p className="text-sm text-muted">Sin fallas registradas.</p>
        ) : (
          <>
            {datos.fallas.map((f) => (
              <Fila key={f.tipo} izq={`${NOMBRE_FALLA[f.tipo] ?? f.tipo} · ${f.dispositivos} disp. · última ${dia(f.ultima)}`} der={f.n} />
            ))}
            <span className={`${etiquetaClass} pt-2`}>Dónde fallan</span>
            {(datos.fallas_dispositivo ?? []).map((d) => (
              <Fila key={d.disp} izq={d.disp} der={d.n} />
            ))}
          </>
        )}
      </Seccion>

      <Seccion titulo="Dispositivos" nota="Dispositivos distintos en 30 días.">
        {(datos.dispositivos ?? []).length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay datos.</p>
        ) : (
          datos.dispositivos.map((d) => <Fila key={d.disp} izq={d.disp} der={d.n} />)
        )}
      </Seccion>

      <Seccion titulo="Usuarios" nota="Por orden de alta. Tocá uno para ver su ficha. Alta · última vez · días activos · minutos · partidos terminados.">
        {(datos.usuarios ?? []).length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay usuarios.</p>
        ) : (
          datos.usuarios.map((u) => {
            const q = (quienes?.usuarios ?? []).find((x) => x.n === u.n);
            return (
              <div key={u.n}>
                <button type="button" onClick={() => abrirFicha(u.n)} className="w-full text-left cursor-pointer" aria-expanded={abierto === u.n}>
                  <Fila
                    izq={
                      <>
                        <span className="font-bold">Usuario {u.n}</span>
                        {q && <span className="text-muted"> · {provincia(q.provincia)} · {SEXO[q.sexo] ?? q.sexo}</span>}
                      </>
                    }
                    der={`${dia(u.alta)} · ${dia(u.ultima)} · ${u.dias_activos ?? 0} d · ${u.minutos ?? 0}' · ${u.partidos ?? 0} p`}
                  />
                </button>
                {abierto === u.n &&
                  (fichas[u.n] ? <FichaUsuario f={fichas[u.n]} /> : <p className="text-sm text-muted py-2">Cargando ficha…</p>)}
              </div>
            );
          })
        )}
      </Seccion>

      <button onClick={cargar} className="self-start text-sm font-semibold px-3 py-2 rounded-[6px] border border-ink/15 cursor-pointer">
        Actualizar
      </button>
    </div>
  );
}
