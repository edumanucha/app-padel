// Tarjeta del resultado para compartir (WhatsApp / Instagram) -- diseño
// "1) Tabla de TV", elegido por el usuario el 2026-09-30 en /pruebas-tarjeta.
// Se dibuja en un canvas de 1080x1350 (4:5, formato de Instagram) y se
// comparte como PNG con el menú nativo del celu (Web Share API).

export const ANCHO_TARJETA = 1080;
export const ALTO_TARJETA = 1350;

const C = {
  fondo: "#0f2e29",
  tablero: "#154139",
  linea: "#2b5d52",
  amarillo: "#f2c53d",
  blanco: "#ffffff",
  gris: "#d9ded9",
};

export function duracionTexto(minutos) {
  const hs = Math.floor(minutos / 60);
  const min = minutos % 60;
  return hs ? `${hs}h ${String(min).padStart(2, "0")}'` : `${min}'`;
}

// datos = { parejaA, parejaB, setsA, setsB, ganador: "A"|"B", miEquipo: "A"|"B"|null, minutos, fecha: Date, cancha? }
// 2026-10-06 (pedido del usuario): arriba "Anotado con Padelito" y la fecha
// completa (dd/mm/aaaa); abajo tiempo · sets ganados y, debajo, la cancha.
export function dibujarTarjetaTV(ctx, datos, fuente = "sans-serif") {
  const W = ANCHO_TARJETA;
  const { parejaA, parejaB, setsA, setsB, ganador, miEquipo, minutos } = datos;
  const f = (peso, px) => `${peso} ${px}px ${fuente}`;
  const texto = (t, x, y, font, color, align = "left") => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(t, x, y);
  };
  // Achica la letra hasta que el texto entre en `maxAncho` (nombres largos).
  const textoQueEntre = (t, x, y, peso, px, color, maxAncho) => {
    let tam = px;
    ctx.font = f(peso, tam);
    while (tam > 28 && ctx.measureText(t).width > maxAncho) {
      tam -= 2;
      ctx.font = f(peso, tam);
    }
    texto(t, x, y, f(peso, tam), color);
  };

  let setsGanA = 0;
  let setsGanB = 0;
  setsA.forEach((g, i) => (g > setsB[i] ? setsGanA++ : g < setsB[i] ? setsGanB++ : null));
  const fecha = (datos.fecha ?? new Date()).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const titulo = miEquipo ? (miEquipo === ganador ? "Partido ganado" : "Partido perdido") : "Resultado final";

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.fondo;
  ctx.fillRect(0, 0, W, ALTO_TARJETA);

  texto("Anotado con Padelito", 90, 150, f(800, 48), C.amarillo);
  texto(fecha, W - 90, 150, f(500, 44), C.gris, "right");
  texto(titulo, 90, 330, f(800, 88), C.blanco);

  // Tablero: una fila por pareja, una columna por set.
  const top = 480;
  const filaH = 190;
  ctx.fillStyle = C.tablero;
  ctx.beginPath();
  ctx.roundRect(60, top, W - 120, filaH * 2, 40);
  ctx.fill();
  ctx.fillStyle = C.linea;
  ctx.fillRect(90, top + filaH - 2, W - 180, 4);
  const colX = (i) => W - 110 - (setsA.length - 1 - i) * 130;
  const maxNombre = colX(0) - 90 - 100 - 40;
  [
    [parejaA, setsA, setsB, ganador === "A"],
    [parejaB, setsB, setsA, ganador === "B"],
  ].forEach(([nombre, mios, suyos, gano], fila) => {
    const y = top + filaH * fila + 122;
    textoQueEntre(nombre, 100, y, gano ? 800 : 500, 60, gano ? C.blanco : C.gris, maxNombre);
    mios.forEach((g, i) => {
      texto(String(g), colX(i), y, f(800, 84), g > suyos[i] ? C.amarillo : C.gris, "right");
    });
  });

  texto(`${duracionTexto(minutos)}  ·  Sets ${setsGanA}-${setsGanB}`, 90, 1040, f(600, 56), C.blanco);
  if (datos.cancha) textoQueEntre(datos.cancha, 90, 1120, 500, 46, C.gris, W - 180);
}


// ---------- Estilos nuevos (2026-10-06, elegidos por el usuario: "D" pelota y
// "E" cancha; la app elige uno al azar en cada partido) ----------
// fuentes = { texto, titulo, numeros }: familias CSS (cuerpo, Big Shoulders, Chakra Petch).

function resumenSets(setsA, setsB) {
  let a = 0;
  let b = 0;
  setsA.forEach((g, i) => (g > setsB[i] ? a++ : g < setsB[i] ? b++ : null));
  return { a, b };
}

function encabezado(datos) {
  const { ganador, miEquipo } = datos;
  if (!miEquipo) return { titulo: "Resultado", gane: true };
  return miEquipo === ganador ? { titulo: "Ganamos", gane: true } : { titulo: "Perdimos", gane: false };
}

function fechaLarga(fecha) {
  return (fecha ?? new Date()).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Achica la letra hasta que el texto entre en maxAncho.
function ajustar(ctx, texto, peso, px, familia, maxAncho, min = 20) {
  let tam = px;
  ctx.font = `${peso} ${tam}px ${familia}`;
  while (tam > min && ctx.measureText(texto).width > maxAncho) {
    tam -= 2;
    ctx.font = `${peso} ${tam}px ${familia}`;
  }
  return tam;
}

// Pelota con costuras (centro x,y; radio r). `borde` la separa de un fondo amarillo.
function pelota(ctx, x, y, r, borde = null) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#f2c53d";
  ctx.fill();
  if (borde) {
    ctx.lineWidth = r * 0.16;
    ctx.strokeStyle = borde;
    ctx.stroke();
  }
  ctx.strokeStyle = "#154139";
  ctx.lineWidth = r * 0.17;
  ctx.lineCap = "round";
  const k = r / 46;
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + lado * 21 * k, y - 34 * k);
    ctx.bezierCurveTo(x + lado * 8 * k, y - 21 * k, x + lado * 8 * k, y + 21 * k, x + lado * 21 * k, y + 34 * k);
    ctx.stroke();
  }
  ctx.restore();
}

// "padelito" con la pelota como punto de la i (mismas medidas que MarcaPadelito.js).
// Devuelve el ancho total.
export function anchoNombre(ctx, tam, familia) {
  ctx.font = `900 ${tam}px ${familia}`;
  return ctx.measureText("padel").width + 0.302 * tam + ctx.measureText("to").width;
}
export function dibujarNombre(ctx, x, base, tam, color, familia, borde = null) {
  ctx.save();
  ctx.font = `900 ${tam}px ${familia}`;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("padel", x, base);
  let cx = x + ctx.measureText("padel").width + 0.065 * tam;
  ctx.fillRect(cx, base - 0.6 * tam, 0.17 * tam, 0.6 * tam);
  pelota(ctx, cx + 0.085 * tam, base - 0.67 * tam - 0.135 * tam, 0.135 * tam, borde);
  cx += 0.17 * tam + 0.067 * tam;
  ctx.fillText("to", cx, base);
  ctx.restore();
}

// D · Pelota: todo el fondo es la pelota (amarillo); si se perdió, verde.
export function dibujarTarjetaPelota(ctx, datos, fuentes) {
  const W = ANCHO_TARJETA, H = ALTO_TARJETA, M = 90;
  const { parejaA, parejaB, setsA, setsB, minutos } = datos;
  const { titulo, gane } = encabezado(datos);
  const fondo = gane ? "#f2c53d" : "#154139";
  const tinta = gane ? "#154139" : "#eaf4f0";
  const suave = gane ? "rgba(21,65,57,0.72)" : "#8fb6ae";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, W, H);
  // Costuras gigantes de fondo.
  ctx.save();
  ctx.strokeStyle = gane ? "rgba(21,65,57,0.14)" : "rgba(242,197,61,0.12)";
  ctx.lineWidth = 64;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(660, -120);
  ctx.bezierCurveTo(480, 300, 480, 1050, 660, 1470);
  ctx.moveTo(1260, -120);
  ctx.bezierCurveTo(1080, 300, 1080, 1050, 1260, 1470);
  ctx.stroke();
  ctx.restore();

  const arriba = `${fechaLarga(datos.fecha)}${datos.cancha ? ` · ${datos.cancha}` : ""}`;
  ctx.fillStyle = tinta;
  ajustar(ctx, arriba, 700, 40, fuentes.texto, W - 2 * M);
  ctx.fillText(arriba, M, 150);

  const tt = titulo.toUpperCase();
  ajustar(ctx, tt, 900, 330, fuentes.titulo, W - 2 * M, 120);
  ctx.fillText(tt, M - 6, 520);

  const sets = setsA.map((g, i) => `${g}-${setsB[i]}`).join("  ");
  ajustar(ctx, sets, 700, 150, fuentes.numeros, W - 2 * M, 60);
  ctx.fillText(sets, M, 700);

  const { a, b } = resumenSets(setsA, setsB);
  ajustar(ctx, parejaA, 700, 54, fuentes.texto, W - 2 * M);
  ctx.fillText(parejaA, M, 820);
  ctx.fillStyle = suave;
  ajustar(ctx, `vs. ${parejaB}`, 500, 50, fuentes.texto, W - 2 * M);
  ctx.fillText(`vs. ${parejaB}`, M, 886);
  ctx.font = `700 46px ${fuentes.texto}`;
  ctx.fillText(`${duracionTexto(minutos)}  ·  Sets ${a}-${b}`, M, 966);

  dibujarNombre(ctx, M, H - 100, 104, tinta, fuentes.titulo, gane ? "#154139" : null);
}

// E · Cancha vista desde arriba: cada pareja en su mitad y la red al medio.
export function dibujarTarjetaCancha(ctx, datos, fuentes) {
  const W = ANCHO_TARJETA, H = ALTO_TARJETA;
  const { parejaA, parejaB, setsA, setsB, ganador, minutos } = datos;
  const { titulo, gane } = encabezado(datos);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#154139";
  ctx.fillRect(0, 0, W, H);
  // Cancha (proporción 10x20 m aproximada) con sus líneas.
  const cx0 = 150, cy0 = 150, cw = 780, ch = 1000;
  ctx.fillStyle = "#1d5c4a";
  ctx.fillRect(cx0, cy0, cw, ch);
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 6;
  ctx.strokeRect(cx0, cy0, cw, ch);
  const serv = ch * 0.165;
  ctx.beginPath();
  ctx.moveTo(cx0, cy0 + serv);
  ctx.lineTo(cx0 + cw, cy0 + serv);
  ctx.moveTo(cx0, cy0 + ch - serv);
  ctx.lineTo(cx0 + cw, cy0 + ch - serv);
  ctx.moveTo(cx0 + cw / 2, cy0 + serv);
  ctx.lineTo(cx0 + cw / 2, cy0 + ch - serv);
  ctx.stroke();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(cx0 - 30, cy0 + ch / 2);
  ctx.lineTo(cx0 + cw + 30, cy0 + ch / 2);
  ctx.stroke();

  // Arriba la pareja propia (o la A), abajo la otra.
  const mio = datos.miEquipo ?? "A";
  const filas = mio === "A"
    ? [["A", parejaA, setsA, setsB], ["B", parejaB, setsB, setsA]]
    : [["B", parejaB, setsB, setsA], ["A", parejaA, setsA, setsB]];
  filas.forEach(([equipo, nombre, mios, suyos], k) => {
    const mitad = cy0 + (k === 0 ? ch * 0.25 : ch * 0.75);
    const gano = equipo === ganador;
    ctx.textAlign = "center";
    ctx.fillStyle = gano ? "#ffffff" : "#d9ded9";
    ajustar(ctx, nombre, gano ? 700 : 500, 52, fuentes.texto, cw - 80);
    // El nombre va en el fondo de la cancha (entre la línea de fondo y la de saque).
    ctx.fillText(nombre, W / 2, k === 0 ? cy0 + serv / 2 + 18 : cy0 + ch - serv / 2 + 18);
    const sets = mios.join("   ");
    ajustar(ctx, sets, 700, 170, fuentes.numeros, cw - 120, 60);
    let x = W / 2 - ctx.measureText(sets).width / 2;
    ctx.textAlign = "left";
    const yNum = mitad + 60;
    mios.forEach((g, i) => {
      // Un borde del color de la cancha separa el número de las líneas.
      ctx.lineWidth = 22;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1d5c4a";
      ctx.strokeText(String(g), x, yNum);
      ctx.fillStyle = g > suyos[i] ? "#f2c53d" : "#7fa397";
      ctx.fillText(String(g), x, yNum);
      x += ctx.measureText(String(g) + "   ").width;
    });
  });

  // Etiqueta sobre la red.
  ctx.textAlign = "center";
  ctx.font = `900 64px ${fuentes.titulo}`;
  const et = titulo.toUpperCase();
  const ew = ctx.measureText(et).width + 70;
  ctx.fillStyle = gane ? "#f2c53d" : "#eaf4f0";
  ctx.beginPath();
  ctx.roundRect(W / 2 - ew / 2, cy0 + ch / 2 - 50, ew, 100, 14);
  ctx.fill();
  ctx.fillStyle = "#154139";
  ctx.fillText(et, W / 2, cy0 + ch / 2 + 24);

  // Arriba: fecha, duración y cancha. Abajo: el nombre de la app.
  ctx.fillStyle = "#8fb6ae";
  const pie = `${fechaLarga(datos.fecha)}  ·  ${duracionTexto(minutos)}${datos.cancha ? `  ·  ${datos.cancha}` : ""}`;
  ajustar(ctx, pie, 600, 38, fuentes.texto, W - 120);
  ctx.fillText(pie, W / 2, 100);
  const an = anchoNombre(ctx, 80, fuentes.titulo);
  dibujarNombre(ctx, W / 2 - an / 2, H - 50, 80, "#eaf4f0", fuentes.titulo);
}

// Letra de la app (Archivo, cargada con next/font) para usarla en el canvas.
export async function fuenteDeLaApp() {
  await document.fonts.ready;
  return getComputedStyle(document.body).fontFamily || "sans-serif";
}

// Las tres letras de la app (texto, títulos tipo cartel y números de tablero),
// leídas de las clases de Tailwind para usarlas en el canvas.
export async function fuentesDeLaApp() {
  const leer = (clase) => {
    const el = document.createElement("span");
    el.className = clase;
    el.textContent = "x";
    el.style.position = "absolute";
    el.style.visibility = "hidden";
    document.body.appendChild(el);
    const familia = getComputedStyle(el).fontFamily;
    el.remove();
    return familia || "sans-serif";
  };
  const fuentes = { texto: leer("font-body"), titulo: leer("font-titulo"), numeros: leer("font-numero") };
  try {
    await Promise.all([document.fonts.load(`900 100px ${fuentes.titulo}`), document.fonts.load(`700 100px ${fuentes.numeros}`), document.fonts.load(`700 40px ${fuentes.texto}`)]);
  } catch {
    // si no cargan, se dibuja con lo que haya
  }
  return fuentes;
}

// Comparte un canvas como PNG. Devuelve "compartido" | "cancelado" |
// "descargado" (si el navegador no deja compartir archivos, ej. la compu).
export async function compartirCanvas(canvas, nombreArchivo = "marcadorcito.png") {
  const blob = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
  const archivo = new File([blob], nombreArchivo, { type: "image/png" });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: "Resultado del partido" });
      return "compartido";
    } catch {
      return "cancelado";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = archivo.name;
  a.click();
  URL.revokeObjectURL(url);
  return "descargado";
}

// Arma la tarjeta en un canvas fuera de pantalla y la comparte.
export async function compartirTarjetaResultado(datos) {
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO_TARJETA;
  canvas.height = ALTO_TARJETA;
  // Uno de los dos estilos nuevos, al azar (pedido del usuario, 2026-10-06).
  const fuentes = await fuentesDeLaApp();
  const dibujar = Math.random() < 0.5 ? dibujarTarjetaPelota : dibujarTarjetaCancha;
  dibujar(canvas.getContext("2d"), datos, fuentes);
  return compartirCanvas(canvas, "marcadorcito-resultado.png");
}
