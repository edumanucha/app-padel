import { Archivo } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import RegistrarServiceWorker from "@/components/RegistrarServiceWorker";
import { LocaleProvider } from "@/i18n/LocaleContext";

// Archivo (2026-09-12, reemplaza a Barlow Condensed + Inter -- a pedido
// del usuario: "me da berreta [la fuente actual], quiero ver otras
// opciones"). Una sola familia tipográfica para toda la app (títulos en
// peso 900 "Black", cuerpo en 400/500/600) en vez de dos fuentes
// distintas: misma métrica y una sola personalidad visual consistente
// de punta a punta.
//
// Una sola llamada a next/font (2026-09-13, arreglo de performance):
// antes había DOS llamadas a Archivo(...) -- una para "fredoka"
// (600/700/900) y otra para "inter" (400/500/600) -- y como next/font no
// deduplica entre llamadas distintas aunque sea la misma familia, el
// peso 600 (compartido por las dos) se descargaba/auto-hosteaba DOS
// veces. Ahora se pide la unión de pesos una sola vez, con una sola
// variable (--font-archivo); globals.css mapea tanto --font-heading
// como --font-body a esa misma variable.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata = {
  title: "Padelito",
  description: "App para organizar partidos de pádel",
  appleWebApp: {
    // iOS/Safari no lee el manifest.js para el ícono ni para "modo
    // standalone" (sin la barra del navegador) -- necesita estas dos
    // cosas aparte (2026-09-13, PWA instalable).
    capable: true,
    title: "Padelito",
    statusBarStyle: "black-translucent",
  },
};

// Color de la barra de estado/navegador al instalar como PWA (Next.js
// exige que "themeColor" viva en un export "viewport" propio, separado
// de "metadata", desde que separaron ambas cosas).
export const viewport = {
  themeColor: "#154139",
};

// Script chico que corre ANTES de que React pinte la página: si la persona
// ya había elegido un tema a mano (guardado en localStorage), lo aplica de
// inmediato. Sin esto, se vería un flash del tema por defecto antes de que
// el botón de abajo (ThemeToggle) tenga oportunidad de corregirlo.
const themeInitScript = `
  (function () {
    try {
      var stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') {
        document.documentElement.setAttribute('data-theme', stored);
      }
      var accentCta = localStorage.getItem('accentCta');
      if (accentCta === 'verde' || accentCta === 'turquesa') {
        document.documentElement.setAttribute('data-accent-cta', accentCta);
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col pb-24">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <RegistrarServiceWorker />
        <LocaleProvider>
          <PageTransition>{children}</PageTransition>
          <BottomNav />
        </LocaleProvider>
      </body>
    </html>
  );
}
