// Hoja de miniaturas de todas las capturas (para revisarlas de un vistazo).
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CARPETA = process.env.CARPETA || "actual";
const dir = path.resolve(__dirname, "..", "..", "docs", "libro-diseno", "img", CARPETA);
const aUrl = (p) => "file:///" + p.split(path.sep).join("/");
const imgs = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
const html = `<body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(8,1fr);gap:6px;padding:6px;font:11px sans-serif">${imgs
  .map((f) => `<div style="background:#fff"><div style="height:330px;overflow:hidden"><img src="${aUrl(path.join(dir, f))}" style="width:100%"></div>${f}</div>`)
  .join("")}</body>`;
const salida = path.join(__dirname, "hoja.html");
fs.writeFileSync(salida, html);

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--allow-file-access-from-files"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1600, height: 900 });
  await p.goto(aUrl(salida));
  await new Promise((r) => setTimeout(r, 1500));
  await p.screenshot({ path: path.join(__dirname, "hoja.png"), fullPage: true });
  await b.close();
})();
