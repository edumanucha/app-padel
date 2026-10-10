"use client";

import ConPelota from "@/components/ConPelota";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, usuarioRapido } from "@/lib/supabaseClient";

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

  async function cargar() {
    setError("");
    const {
      data: { user },
    } = await usuarioRapido();
    if (!user) {
      router.replace("/login");
      return;
    }
    const [{ data, error: rpcError }, { data: dataPartidos }] = await Promise.all([
      supabase.rpc("estadisticas_admin"),
      supabase.rpc("estadisticas_partidos_admin"),
    ]);
    setPartidos(dataPartidos ?? null);
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

      <Seccion titulo="Usuarios" nota="Por orden de alta. Alta · última vez · días activos · minutos · partidos terminados.">
        {(datos.usuarios ?? []).length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay usuarios.</p>
        ) : (
          datos.usuarios.map((u) => (
            <Fila
              key={u.n}
              izq={`Usuario ${u.n}`}
              der={`${dia(u.alta)} · ${dia(u.ultima)} · ${u.dias_activos ?? 0} d · ${u.minutos ?? 0}' · ${u.partidos ?? 0} p`}
            />
          ))
        )}
      </Seccion>

      <button onClick={cargar} className="self-start text-sm font-semibold px-3 py-2 rounded-[6px] border border-ink/15 cursor-pointer">
        Actualizar
      </button>
    </div>
  );
}
