// Manifest de PWA (2026-09-13, a pedido del usuario: "modo instalar" --
// ver Fase 4 del roadmap, "PWA offline"). Este es solo el paso de
// "instalable" (ícono en el celular, se abre sin la barra del navegador)
// -- el modo sin conexión de verdad (cachear pantallas con un service
// worker) queda para una vuelta aparte. Next.js detecta este archivo por
// convención y sirve /manifest.webmanifest solo, sin que haya que
// linkearlo a mano en layout.js.
export default function manifest() {
  return {
    name: "Padelito",
    short_name: "Padelito",
    description: "App para organizar partidos de pádel",
    start_url: "/",
    display: "standalone",
    background_color: "#eaf3ec",
    theme_color: "#154139",
    icons: [
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
