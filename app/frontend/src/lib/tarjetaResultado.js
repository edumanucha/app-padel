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

// Letra de la app (Archivo, cargada con next/font) para usarla en el canvas.
export async function fuenteDeLaApp() {
  await document.fonts.ready;
  return getComputedStyle(document.body).fontFamily || "sans-serif";
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
  dibujarTarjetaTV(canvas.getContext("2d"), datos, await fuenteDeLaApp());
  return compartirCanvas(canvas, "marcadorcito-resultado.png");
}
