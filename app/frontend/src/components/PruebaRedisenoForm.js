"use client";

import s from "@/components/PruebaRediseno.module.css";
import {
  IconoCalendario,
  IconoLupa,
  IconoTrofeo,
  IconoMensaje,
  IconoSobre,
  IconoCampana,
  IconoMenu,
  IconoEngranaje,
  IconoCasa,
  IconoPersona,
  IconoPelota,
  IconoChevron,
  IconoFuego,
} from "@/components/Icons";

// Maquetas del Inicio para el rediseño "sin olor a IA" (2026-10-01, pedido
// del usuario: "armame las maquetas y vamos viendo"). Mismos datos en las 4
// versiones: Hoy (como está) y 3 estilos que combinan A (sin emojis),
// B (tipografía con carácter) y C (jerarquía de tarjetas). Todo de ejemplo.

const D = {
  nombre: "Eduardo",
  puntos: 188,
  puesto: 6,
  total: 13,
  racha: 2,
  pct: 58,
  proximo: { dia: "SÁB", num: "3", mes: "OCT", hora: "19:00", cancha: "Complejo La Red", pareja: "con Marcos Acuña", rivales: "vs. Armani / Fernández" },
  ultimo: { gano: true, sets: [[6, 4], [6, 3]], rivales: "Acuña y Borja" },
  invitaciones: 1,
  mensajes: 1,
};

// Dígitos de puntitos del tablero (mismo patrón 5x7 que DotDigit).
const PATRONES = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};
function Puntitos({ texto, tam = 3 }) {
  return (
    <span className={s.puntitos} style={{ "--p": `${tam}px` }} aria-label={String(texto)}>
      {String(texto)
        .split("")
        .map((c, i) =>
          PATRONES[c] ? (
            <span key={i} className={s.digito}>
              {PATRONES[c].join("").split("").map((b, j) => (
                <i key={j} className={b === "1" ? s.on : s.off} />
              ))}
            </span>
          ) : (
            <span key={i} className={s.sep}>
              {c}
            </span>
          )
        )}
    </span>
  );
}

function Celu({ titulo, bajada, clase, children }) {
  return (
    <figure className={s.pieza}>
      <figcaption className={s.rotulo}>{titulo}</figcaption>
      <div className={s.marco}>
        <div className={`${s.pantalla} ${clase}`}>{children}</div>
      </div>
      <p className={s.bajada}>{bajada}</p>
    </figure>
  );
}

function BarraAbajo({ clase }) {
  return (
    <nav className={`${s.barra} ${clase ?? ""}`}>
      <span className={s.barraActiva}>
        <IconoCasa width={18} height={18} />
        Inicio
      </span>
      <span>
        <IconoTrofeo width={18} height={18} />
        Jugadores
      </span>
      <span>
        <IconoPelota width={18} height={18} />
        Marcador
      </span>
      <span>
        <IconoPersona width={18} height={18} />
        Perfil
      </span>
    </nav>
  );
}

// ---------------- HOY ----------------
function Hoy() {
  return (
    <>
      <div className={s.hoyTarjeta} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className={s.hoyAvatar}>🎾</span>
        <div style={{ flex: 1 }}>
          <b>Hola, Eduardo</b>
          <small>188 puntos de ranking</small>
        </div>
        <span className={s.hoyIcono}>☰</span>
        <span className={s.hoyIcono}>⚙️</span>
        <span className={s.hoyIcono}>🔔</span>
      </div>
      <div className={s.hoyTarjeta} style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span className={s.hoyFecha}>
          OCT
          <b>03</b>
        </span>
        <div>
          <b>Tu próximo partido</b>
          <small>sábado 3 de octubre, 19:00 · Complejo La Red</small>
        </div>
      </div>
      <div className={s.hoyAmarilla}>🔔 Tenés 1 invitación pendiente</div>
      <small className={s.hoySub}>JUGAR</small>
      <div className={s.hoyAmarilla} style={{ padding: "16px 12px" }}>
        🎾 <b>Marcadorcito</b>
        <small>Llevá el tanteador por voz, gesto o botón</small>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <span className={s.hoyAmarilla} style={{ flex: 1, textAlign: "center" }}>📅 Crear partido</span>
        <span className={s.hoyAmarilla} style={{ flex: 1, textAlign: "center" }}>🔍 Abiertos</span>
      </div>
      <div className={s.hoyTarjeta}>
        <b>Último partido jugado</b>
        <small>🏆 Ganaste vs. Acuña y Borja (6-4, 6-3)</small>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[["2", "Racha"], ["#6", "de 13"], ["58%", "ganados"]].map(([n, t]) => (
          <span key={t} className={s.hoyTarjeta} style={{ flex: 1, textAlign: "center" }}>
            <b>{n}</b>
            <small>{t}</small>
          </span>
        ))}
      </div>
      <BarraAbajo />
    </>
  );
}

// ---------------- 1 · CARTEL DE ESTADIO ----------------
function Cartel() {
  return (
    <>
      <header className={s.cHeader}>
        <div>
          <span className={s.cEyebrow}>Puesto {D.puesto} de {D.total} · {D.puntos} pts</span>
          <h1 className={s.cHola}>Hola, {D.nombre}</h1>
        </div>
        <div className={s.cIconos}>
          <IconoCampana width={20} height={20} />
          <IconoMenu width={20} height={20} />
        </div>
      </header>

      <section className={s.cProximo}>
        <div className={s.cProximoFecha}>
          <span>{D.proximo.dia}</span>
          <b>{D.proximo.num}</b>
          <span>{D.proximo.mes}</span>
        </div>
        <div className={s.cProximoInfo}>
          <span className={s.cEyebrowClaro}>Próximo partido · {D.proximo.hora}</span>
          <h2>{D.proximo.cancha}</h2>
          <p>{D.proximo.pareja}</p>
          <p>{D.proximo.rivales}</p>
        </div>
      </section>

      <button className={s.cCta}>
        <span>Abrir Marcadorcito</span>
        <IconoChevron width={20} height={20} style={{ transform: "rotate(-90deg)" }} />
      </button>

      <div className={s.cAcciones}>
        <span><IconoCalendario width={18} height={18} /> Crear partido</span>
        <span><IconoLupa width={18} height={18} /> Abiertos</span>
      </div>

      <div className={s.cAviso}>
        <IconoSobre width={16} height={16} /> 1 invitación pendiente <IconoChevron width={14} height={14} style={{ transform: "rotate(-90deg)" }} />
      </div>

      <div className={s.cNumeros}>
        <div><b>{D.racha}</b><span>racha</span></div>
        <div><b>#{D.puesto}</b><span>ranking</span></div>
        <div><b>{D.pct}%</b><span>ganados</span></div>
      </div>

      <div className={s.cUltimo}>
        <span className={s.cEyebrow}>Último partido</span>
        <p><b>Ganaste</b> 6-4 6-3 vs. {D.ultimo.rivales}</p>
      </div>
      <BarraAbajo clase={s.cBarra} />
    </>
  );
}

// ---------------- 2 · EDITORIAL ----------------
function Editorial() {
  return (
    <>
      <header className={s.eHeader}>
        <span className={s.eFecha}>Jueves 1 de octubre</span>
        <div className={s.eIconos}>
          <IconoCampana width={19} height={19} />
          <IconoEngranaje width={19} height={19} />
        </div>
      </header>
      <h1 className={s.eHola}>
        Buenas,
        <br />
        <em>Eduardo.</em>
      </h1>
      <p className={s.eLead}>
        Vas <b>sexto</b> en el ranking con {D.puntos} puntos y {D.racha} partidos ganados al hilo.
      </p>

      <hr className={s.eRegla} />
      <span className={s.eSeccion}>El sábado</span>
      <div className={s.eProximo}>
        <b className={s.eHora}>19:00</b>
        <div>
          <p className={s.eCancha}>{D.proximo.cancha}</p>
          <p className={s.eMeta}>{D.proximo.pareja} · {D.proximo.rivales}</p>
        </div>
      </div>

      <button className={s.eCta}>Llevar el marcador</button>
      <div className={s.eLinks}>
        <span>Crear partido →</span>
        <span>Ver abiertos →</span>
      </div>

      <hr className={s.eRegla} />
      <span className={s.eSeccion}>Lo último</span>
      <p className={s.eUltimo}>
        Ganaste <b>6-4 6-3</b> contra {D.ultimo.rivales}. Tenés <u>una invitación</u> y <u>un mensaje</u> sin leer.
      </p>
      <BarraAbajo clase={s.eBarra} />
    </>
  );
}

// ---------------- 3 · MARCADOR ----------------
function Marcador() {
  return (
    <>
      <header className={s.mHeader}>
        <div>
          <span className={s.mEtiqueta}>JUGADOR</span>
          <h1 className={s.mHola}>EDUARDO</h1>
        </div>
        <div className={s.mPuntos}>
          <Puntitos texto={D.puntos} tam={3} />
          <span className={s.mEtiqueta}>PTS</span>
        </div>
      </header>

      <section className={s.mProximo}>
        <div className={s.mFila}>
          <span className={s.mEtiqueta}>PRÓXIMO</span>
          <span className={s.mEtiqueta}>{D.proximo.cancha.toUpperCase()}</span>
        </div>
        <div className={s.mHoraFila}>
          <Puntitos texto="19:00" tam={4} />
          <div>
            <b>SÁB 3 OCT</b>
            <small>{D.proximo.rivales}</small>
          </div>
        </div>
      </section>

      <button className={s.mCta}>
        <span className={s.mLed} /> MARCADORCITO
      </button>

      <div className={s.mAcciones}>
        <span>+ CREAR</span>
        <span>ABIERTOS</span>
        <span className={s.mBadge}>INVIT. 1</span>
      </div>

      <div className={s.mNumeros}>
        <div><Puntitos texto={D.racha} tam={3} /><span className={s.mEtiqueta}>RACHA</span></div>
        <div><Puntitos texto={D.puesto} tam={3} /><span className={s.mEtiqueta}>PUESTO</span></div>
        <div><Puntitos texto={D.pct} tam={3} /><span className={s.mEtiqueta}>% GAN.</span></div>
      </div>

      <div className={s.mUltimo}>
        <span className={s.mEtiqueta}>ÚLTIMO · GANADO</span>
        <div className={s.mSets}>
          <span>VOS</span><b>6</b><b>6</b>
          <span>{D.ultimo.rivales.toUpperCase()}</span><b className={s.mPerdido}>4</b><b className={s.mPerdido}>3</b>
        </div>
      </div>
      <BarraAbajo clase={s.mBarra} />
    </>
  );
}

const OPCIONES = [
  {
    titulo: "Hoy",
    clase: s.hoy,
    Comp: Hoy,
    bajada: "Como está ahora: emojis en todo, tarjetas iguales con la misma sombra, 6 botones amarillos compitiendo.",
  },
  {
    titulo: "1 · Cartel de estadio",
    clase: s.cartel,
    Comp: Cartel,
    bajada: "Títulos condensados grandes. Una sola protagonista: el próximo partido en verde tablero, con el Marcadorcito como único botón amarillo. Lo demás, liviano.",
  },
  {
    titulo: "2 · Editorial",
    clase: s.editorial,
    Comp: Editorial,
    bajada: "Serif con personalidad y mucho aire. Casi sin tarjetas: secciones separadas por líneas y frases en vez de cajas. Un solo botón fuerte.",
  },
  {
    titulo: "3 · Marcador",
    clase: s.marcador,
    Comp: Marcador,
    bajada: "Todo el inicio como el tablero de la cancha: fondo oscuro, números de puntitos, etiquetas en mayúscula. Muy propio, pero más oscuro y técnico.",
  },
];

export default function PruebaRedisenoForm() {
  return (
    <div className={s.envoltura}>
      <div className={s.intro}>
        <h1>Rediseño del Inicio</h1>
        <p>
          Mismos datos en las cuatro. Cada estilo aplica <b>A</b> (sin emojis, con nuestros íconos), <b>B</b> (tipografía con
          carácter) y <b>C</b> (una tarjeta protagonista y el resto liviano). Elegí uno o mezclá partes.
        </p>
      </div>
      <div className={s.fila}>
        {OPCIONES.map(({ titulo, clase, Comp, bajada }) => (
          <Celu key={titulo} titulo={titulo} clase={clase} bajada={bajada}>
            <Comp />
          </Celu>
        ))}
      </div>
    </div>
  );
}
