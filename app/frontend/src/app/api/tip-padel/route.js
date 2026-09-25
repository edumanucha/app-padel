// Reemplaza el "Tip de drive/revés" fijo que escribíamos nosotros
// (2026-09-12, a pedido del usuario: "quiero que empecemos a poner algo
// real... de alguna web de pádel que tenga liberado tips gratuitos").
// No existe una API gratuita de "tips de pádel" -- lo que sí hay son
// blogs reales con RSS público. Mostramos el título REAL del último
// artículo + link "Leer más" hacia el sitio (no copiamos el cuerpo del
// artículo, eso sería reproducir contenido con derechos de autor ajenos).
//
// Cacheado server-side 1 hora (revalidate) para no pegarle al feed de
// Padelstar en cada carga del Home -- gratis y liviano para los dos lados.
const FEED_URL = "https://padelstar.es/feed/";

// El título viene con entidades HTML (WordPress) -- ej. "&#8211;" en vez
// de "–". React escapa el texto que renderiza, así que si no las
// decodificamos acá, se ven literalmente como "&#8211;" en pantalla.
function decodificarEntidades(texto) {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extraerPrimerItem(xml) {
  const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1];
  if (!item) return null;

  const tituloCrudo = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
  const titulo = decodificarEntidades(tituloCrudo.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim());

  const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();

  if (!titulo || !link) return null;
  return { titulo, link };
}

export async function GET() {
  try {
    const res = await fetch(FEED_URL, {
      headers: { "User-Agent": "Padelito/1.0 (+https://frontend-ten-theta-89.vercel.app)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`feed respondió ${res.status}`);

    const xml = await res.text();
    const item = extraerPrimerItem(xml);
    if (!item) throw new Error("no se pudo leer el feed");

    return Response.json({ ...item, fuente: "Padelstar" });
  } catch {
    // Si el sitio externo falla, el Home simplemente no muestra la
    // tarjeta (ver HomeForm.js) -- no es contenido crítico.
    return Response.json({ error: "no disponible" }, { status: 502 });
  }
}
