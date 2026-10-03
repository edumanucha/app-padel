// Tarjeta cuadrada para compartir el resultado de un partido (2026-10-03).
// Diseños elegidos por el usuario en una maqueta: B "Cartel amarillo" cuando
// ganaste y C "Pelota" cuando perdiste (va cambiando según la situación).
// Se dibuja en un <canvas> del propio celu: los nombres y el resultado nunca
// salen del dispositivo ni pasan por un servidor.
//
// `dibujarTarjeta` es pura (recibe el contexto) para poder probarla suelta;
// `generarTarjeta` arma el canvas, espera las tipografías y devuelve un PNG.

const LADO = 1080;
const MARGEN = 76;
const VERDE = "#154139";
const AMARILLO = "#f2c53d";
const AMARILLO_TINTA = "#1a1305";
const CLARO = "#eaf4f0";
const APAGADO = "#8fb6ae";

// Achica la letra hasta que el texto entre en `ancho`.
function ajustar(ctx, texto, fuente, tamano, ancho) {
  let t = tamano;
  ctx.font = fuente(t);
  while (ctx.measureText(texto).width > ancho && t > 20) {
    t -= 2;
    ctx.font = fuente(t);
  }
  return t;
}

function texto(ctx, str, x, y, { fuente, color, alinear = "left", espaciado = 0, alfa = 1 }) {
  ctx.save();
  ctx.font = fuente;
  ctx.fillStyle = color;
  ctx.textAlign = alinear;
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = alfa;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${espaciado}px`;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function cabeceraYPie(ctx, d, f, colorMarca, colorPie, anchoPie = LADO - MARGEN * 2) {
  texto(ctx, "PADELITO", MARGEN, MARGEN + 62, { fuente: f.titulo(900, 81), color: colorMarca, espaciado: 5 });
  texto(ctx, d.fecha, LADO - MARGEN, MARGEN + 60, { fuente: f.texto(600, 37), color: colorMarca, alinear: "right", alfa: 0.75 });
  const pie = [d.duracion, d.cancha].filter(Boolean).join("  ·  ");
  const tamPie = ajustar(ctx, pie, (s) => f.texto(600, s), 40, anchoPie);
  texto(ctx, pie, MARGEN, LADO - MARGEN, { fuente: f.texto(600, tamPie), color: colorPie });
}

// B · cuando ganaste: amarillo con "Ganamos" gigante.
function dibujarGanamos(ctx, d, f) {
  ctx.fillStyle = AMARILLO;
  ctx.fillRect(0, 0, LADO, LADO);
  cabeceraYPie(ctx, d, f, VERDE, AMARILLO_TINTA);

  const ancho = LADO - MARGEN * 2;
  const gr = d.textos.ganamos.toUpperCase();
  const tamGr = ajustar(ctx, gr, (s) => f.titulo(900, s), 340, ancho);
  texto(ctx, gr, MARGEN - 6, 372 + tamGr * 0.62, { fuente: f.titulo(900, tamGr), color: VERDE });

  // Sets, uno al lado del otro.
  const baseSets = 372 + tamGr * 0.62 + 70 + 118;
  let x = MARGEN;
  for (const set of d.sets) {
    ctx.font = f.numero(700, 168);
    texto(ctx, set, x, baseSets, { fuente: f.numero(700, 168), color: VERDE });
    x += ctx.measureText(set).width + 60;
  }

  // Quiénes jugaron.
  const yo = d.mios.join(" / ");
  const vs = ` ${d.textos.vs} ${d.rivales.join(" / ")}`;
  ctx.font = f.texto(700, 48);
  const anchoYo = ctx.measureText(yo).width;
  texto(ctx, yo, MARGEN, baseSets + 92, { fuente: f.texto(700, 48), color: AMARILLO_TINTA });
  texto(ctx, vs, MARGEN + anchoYo, baseSets + 92, { fuente: f.texto(500, 48), color: AMARILLO_TINTA, alfa: 0.75 });
}

// C · cuando perdiste: verde con la pelota gigante; primero quienes ganaron.
function dibujarPelota(ctx, d, f) {
  ctx.fillStyle = VERDE;
  ctx.fillRect(0, 0, LADO, LADO);

  // Pelota cortada en la esquina de abajo a la derecha.
  ctx.save();
  // Centro cerca de la esquina y radio de 330 px: no pisa los nombres, los
  // sets ni el pie. El dibujo va en un cuadro de 100 unidades (radio 48).
  const lado = (330 * 2 * 100) / 96;
  const origen = 950 - lado / 2;
  ctx.translate(origen, origen);
  ctx.scale(lado / 100, lado / 100);
  ctx.fillStyle = AMARILLO;
  ctx.beginPath();
  ctx.arc(50, 50, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = VERDE;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.stroke(new Path2D("M26 6c13 15 13 73 0 88M74 6c-13 15-13 73 0 88"));
  ctx.restore();

  // El pie no puede llegar hasta la pelota (empieza cerca de x = 620).
  cabeceraYPie(ctx, d, f, CLARO, CLARO, 520);

  const ancho = LADO - MARGEN * 2;
  const ganadores = d.rivales.join(" / ").toUpperCase();
  const perdedores = d.mios.join(" / ").toUpperCase();
  const tam = Math.min(
    ajustar(ctx, ganadores, (s) => f.titulo(800, s), 92, ancho),
    ajustar(ctx, perdedores, (s) => f.titulo(800, s), 92, ancho)
  );
  let y = 330 + tam * 0.7;
  texto(ctx, ganadores, MARGEN, y, { fuente: f.titulo(800, tam), color: AMARILLO });
  y += 62;
  texto(ctx, d.textos.leGanaronA.toUpperCase(), MARGEN, y, { fuente: f.texto(600, 38), color: APAGADO, espaciado: 5 });
  y += 24 + tam * 0.7;
  texto(ctx, perdedores, MARGEN, y, { fuente: f.titulo(800, tam), color: CLARO });

  // Sets vistos desde quienes ganaron (se da vuelta el "mío-rival").
  const sets = d.sets.map((s) => s.split("-").reverse().join("-"));
  y += 92 + 108;
  let x = MARGEN;
  for (const set of sets) {
    ctx.font = f.numero(700, 150);
    texto(ctx, set, x, y, { fuente: f.numero(700, 150), color: CLARO });
    x += ctx.measureText(set).width + 52;
  }
}

// `d`: { gane, mios: [nombres], rivales: [nombres], sets: ["6-3","6-4"] (desde mi lado),
//        fecha, duracion, cancha, textos: { ganamos, vs, leGanaronA } }
// `f`: tipografías { titulo(peso, px), texto(peso, px), numero(peso, px) } -> string de `ctx.font`
export function dibujarTarjeta(ctx, d, f) {
  if (d.gane) dibujarGanamos(ctx, d, f);
  else dibujarPelota(ctx, d, f);
}

function familia(variable, respaldo) {
  if (typeof document === "undefined") return respaldo;
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v || respaldo;
}

export async function generarTarjeta(d) {
  const titulo = familia("--font-cartel", '"Big Shoulders", "Arial Narrow", Impact, sans-serif');
  const textoFam = familia("--font-texto", "system-ui, sans-serif");
  const numero = familia("--font-tablero", 'ui-monospace, monospace');
  const f = {
    titulo: (peso, px) => `${peso} ${px}px ${titulo}`,
    texto: (peso, px) => `${peso} ${px}px ${textoFam}`,
    numero: (peso, px) => `${peso} ${px}px ${numero}`,
  };
  // Las fuentes del sitio se bajan al usarlas; las pedimos antes de dibujar.
  try {
    await Promise.all([f.titulo(900, 100), f.titulo(800, 100), f.texto(600, 40), f.texto(700, 40), f.texto(500, 40), f.numero(700, 100)].map((s) => document.fonts.load(s)));
  } catch {
    // si alguna no carga, el canvas usa la de respaldo
  }
  const canvas = document.createElement("canvas");
  canvas.width = LADO;
  canvas.height = LADO;
  dibujarTarjeta(canvas.getContext("2d"), d, f);
  return new Promise((resolver, rechazar) =>
    canvas.toBlob((b) => (b ? resolver(b) : rechazar(new Error("canvas vacío"))), "image/png")
  );
}
