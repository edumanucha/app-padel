// Capturas de TODAS las pantallas de Padelito para el libro de diseño
// (2026-10-01). Abre la app real (producción o el link de prueba de una rama)
// en un Chrome invisible, le hace creer que hay una sesión iniciada y
// contesta TODAS las consultas a Supabase con datos inventados
// (datos-demo.js): nunca se conecta a la base real ni toca datos.
//
// Uso:
//   npm install            (una vez, instala puppeteer-core)
//   node capturar.js                       -> producción
//   BASE=https://<link-de-la-rama> node capturar.js
//   SOLO=inicio,jugadores node capturar.js -> solo algunas
// Las imágenes van a docs/libro-diseno/img/<CARPETA>/ (CARPETA=actual por
// defecto). Esa carpeta está en .gitignore.

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const { YO, id, tablas, rpcs } = require("./datos-demo");

const RAIZ = path.resolve(__dirname, "..", "..");
const BASE = process.env.BASE || "https://frontend-ten-theta-89.vercel.app";
const CARPETA = process.env.CARPETA || "actual";
const SOLO = process.env.SOLO ? process.env.SOLO.split(",") : null;
const SALIDA = path.join(RAIZ, "docs", "libro-diseno", "img", CARPETA);
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";

// Solo el host de Supabase (para saber qué pedidos interceptar). No se usa
// ninguna clave: los pedidos se contestan acá y nunca salen a la red.
const envLocal = fs.readFileSync(path.join(RAIZ, "app", "frontend", ".env.local"), "utf8");
const SUPABASE_URL = (envLocal.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m) || [])[1].trim().replace(/^"|"$/g, "");
const SUPABASE_HOST = new URL(SUPABASE_URL).host;
const REF = SUPABASE_HOST.split(".")[0];

const CEL = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const PC = { width: 1440, height: 900, deviceScaleFactor: 1 };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
const usuario = {
  id: YO, aud: "authenticated", role: "authenticated", email: "eduardo@demo.local",
  app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-08-20T12:00:00Z",
};
const tokenFalso = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: YO, exp, role: "authenticated", aud: "authenticated" })}.firma-de-mentira`;
const sesion = { access_token: tokenFalso, token_type: "bearer", expires_in: 2592000, expires_at: exp, refresh_token: "de-mentira", user: usuario };

// ---------- mini PostgREST de mentira ----------
function filtrar(filas, params) {
  let out = filas;
  for (const [col, valor] of params) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(col)) continue;
    if (col === "or" || col === "and") continue;
    const m = valor.match(/^(not\.)?(eq|neq|in|is|gte|lte|gt|lt|ilike|like)\.(.*)$/);
    if (!m) continue;
    const [, neg, op, arg] = m;
    const prueba = (f) => {
      const v = f[col];
      switch (op) {
        case "eq": return String(v) === arg;
        case "neq": return String(v) !== arg;
        case "in": return arg.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/"/g, "")).includes(String(v));
        case "is": return arg === "null" ? v == null : String(v) === arg;
        default: return true;
      }
    };
    out = out.filter((f) => (neg ? !prueba(f) : prueba(f)));
  }
  const limite = params.find(([k]) => k === "limit");
  if (limite) out = out.slice(0, Number(limite[1]));
  return out;
}

function responder(req) {
  const url = new URL(req.url());
  const metodo = req.method();
  const json = (cuerpo, estado = 200, extra = {}) =>
    req.respond({
      status: estado,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Expose-Headers": "Content-Range", ...extra },
      body: cuerpo === undefined ? "" : JSON.stringify(cuerpo),
    });
  if (metodo === "OPTIONS") return json(undefined, 204, { "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,HEAD,OPTIONS" });

  const p = url.pathname;
  if (p.startsWith("/auth/v1/user")) return json(usuario);
  if (p.startsWith("/auth/v1/token")) return json(sesion);
  if (p.startsWith("/auth/v1/")) return json({});
  if (p.startsWith("/storage/")) return json({ error: "not found" }, 404);

  if (p.startsWith("/rest/v1/rpc/")) {
    const fn = p.split("/").pop();
    let cuerpo = {};
    try { cuerpo = JSON.parse(req.postData() || "{}"); } catch { /* nada */ }
    const r = rpcs[fn] ? rpcs[fn](cuerpo) : null;
    const quiereObjeto = (req.headers().accept || "").includes("vnd.pgrst.object");
    return json(quiereObjeto && Array.isArray(r) ? r[0] ?? null : r);
  }

  if (p.startsWith("/rest/v1/")) {
    const tabla = p.split("/").pop();
    if (metodo !== "GET" && metodo !== "HEAD") return json([], metodo === "POST" ? 201 : 200);
    const filas = filtrar(tablas[tabla] || [], [...url.searchParams.entries()]);
    const extra = { "Content-Range": `0-${Math.max(filas.length - 1, 0)}/${filas.length}` };
    if (metodo === "HEAD") return json(undefined, 200, extra);
    if ((req.headers().accept || "").includes("vnd.pgrst.object")) {
      if (!filas.length) return json({ code: "PGRST116", details: "The result contains 0 rows", hint: null, message: "JSON object requested, multiple (or no) rows returned" }, 406);
      return json(filas[0], 200, extra);
    }
    return json(filas, 200, extra);
  }
  return json({});
}

// ---------- pantallas ----------
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickTexto(page, texto) {
  const [el] = await page.$$(`xpath/.//*[self::button or self::a][contains(normalize-space(.), ${JSON.stringify(texto)})]`);
  if (!el) throw new Error(`No encontré el botón "${texto}"`);
  await el.click();
  await esperar(700);
}
async function clickSelector(page, sel) {
  const el = await page.$(sel);
  if (!el) throw new Error(`No encontré ${sel}`);
  await el.click();
  await esperar(700);
}

const P = (n) => id(n);
const pantallas = [
  { nombre: "inicio", ruta: "/" },
  { nombre: "inicio-notificaciones", ruta: "/", antes: (pg) => clickSelector(pg, 'button[aria-label*="otificaciones"], button[title*="otificaciones"]') },
  { nombre: "inicio-compu", ruta: "/", vp: PC },
  { nombre: "menu", ruta: "/menu" },
  { nombre: "configuracion", ruta: "/configuracion" },
  { nombre: "quienes-somos", ruta: "/quienes-somos" },
  { nombre: "jugadores", ruta: "/jugadores" },
  { nombre: "jugadores-filtros", ruta: "/jugadores", antes: (pg) => clickTexto(pg, "Filtros"), full: false },
  { nombre: "jugador", ruta: `/jugadores/${P(103)}` },
  { nombre: "perfil", ruta: "/perfil" },
  { nombre: "companero-fijo", ruta: "/companero-fijo" },
  { nombre: "disponibilidad", ruta: "/disponibilidad" },
  { nombre: "crear-partido", ruta: "/crear-partido" },
  { nombre: "partidos-abiertos", ruta: "/partidos" },
  { nombre: "mis-partidos", ruta: "/mis-partidos" },
  { nombre: "partido", ruta: `/partido/${P(300)}` },
  { nombre: "marcador-elegir", ruta: `/partido/${P(303)}/marcador`, full: false },
  { nombre: "marcador", ruta: `/partido/${P(303)}/marcador`, full: false,
    antes: async (pg) => { await clickTexto(pg, "Manual"); await clickTexto(pg, "Empezar con"); } },
  { nombre: "marcador-opciones", ruta: `/partido/${P(303)}/marcador`, full: false,
    antes: async (pg) => { await clickTexto(pg, "Manual"); await clickTexto(pg, "Empezar con"); await clickSelector(pg, 'button[aria-label="Opciones"]'); } },
  { nombre: "marcador-apaisado", ruta: `/partido/${P(303)}/marcador`, full: false,
    antes: async (pg) => { await clickTexto(pg, "Manual"); await clickTexto(pg, "Empezar con"); await clickTexto(pg, "Modo apaisado"); } },
  { nombre: "marcador-libre", ruta: "/marcador-libre" },
  { nombre: "estadisticas", ruta: `/partido/${P(304)}/estadisticas` },
  { nombre: "partido-publico", ruta: `/p/${P(301)}` },
  { nombre: "invitaciones", ruta: "/invitaciones" },
  { nombre: "mensajes", ruta: "/mensajes" },
  { nombre: "conversacion", ruta: `/mensajes/${P(103)}` },
  { nombre: "canchas", ruta: "/canchas" },
  { nombre: "cancha", ruta: `/canchas/${P(200)}` },
  { nombre: "apelaciones", ruta: "/apelaciones" },
  { nombre: "admin", ruta: "/admin/canchas" },
  { nombre: "grupos", ruta: "/grupos" },
  { nombre: "grupo-ranking", ruta: `/grupos/${P(950)}` },
  { nombre: "grupo-cara", ruta: `/grupos/${P(950)}`, antes: (pg) => clickTexto(pg, "Cara a cara") },
  { nombre: "grupo-miembros", ruta: `/grupos/${P(950)}`, antes: (pg) => clickTexto(pg, "Miembros") },
  { nombre: "grupo-unirse", ruta: "/g/jueves-4kx9" },
];

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const perfil = path.join(__dirname, ".perfil-chrome");
  fs.rmSync(perfil, { recursive: true, force: true });
  const resumen = [];
  for (const s of pantallas) {
    if (SOLO && !SOLO.includes(s.nombre)) continue;
    // Un Chrome nuevo por pantalla: con uno solo para todas, se cortaba
    // cerca de la captura 15 ("Session with given id not found").
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: perfil });
    const page = await browser.newPage();
    try {
      const cdp = await page.createCDPSession();
      await cdp.send("Network.enable");
      // Sin service worker (el de "sin señal" guarda copias y se mete en el
      // medio de las capturas).
      await cdp.send("Network.setBypassServiceWorker", { bypass: true });
      await cdp.send("Network.setBlockedURLs", { urls: [`*${SUPABASE_HOST}/realtime*`, `wss://${SUPABASE_HOST}/*`] });
      await page.evaluateOnNewDocument(
        (clave, valor) => {
          try {
            localStorage.setItem(clave, valor);
            localStorage.setItem("padelito_guia", "hecha");
            localStorage.setItem("instalarAppFranjaCerrada", String(Date.now()));
          } catch { /* nada */ }
        },
        `sb-${REF}-auth-token`,
        JSON.stringify(sesion)
      );
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        let host = "";
        try { host = new URL(req.url()).host; } catch { /* nada */ }
        if (host === SUPABASE_HOST) return responder(req);
        if (req.url().endsWith("/sw.js")) return req.respond({ status: 404, body: "" });
        req.continue();
      });
      await page.setViewport(s.vp || CEL);
      await page.goto(BASE + s.ruta, { waitUntil: "networkidle2", timeout: 45000 });
      await esperar(1800);
      if (s.antes) await s.antes(page);
      await esperar(600);
      // En la captura de página entera, la barra de abajo (fija) quedaría
      // flotando en el medio: se la manda al final de la página.
      if (s.full !== false) {
        await page.addStyleTag({ content: "nav.fixed{position:absolute!important;bottom:16px!important;top:auto!important}" });
        await esperar(200);
      }
      const archivo = path.join(SALIDA, `${s.nombre}.png`);
      await page.screenshot({ path: archivo, fullPage: s.full !== false });
      const final = new URL(page.url()).pathname;
      resumen.push(`ok    ${s.nombre.padEnd(22)} ${final}`);
    } catch (e) {
      resumen.push(`ERROR ${s.nombre.padEnd(22)} ${e.message.split("\n")[0]}`);
    } finally {
      await browser.close();
    }
  }
  console.log(resumen.join("\n"));
})();
