/** @type {import('next').NextConfig} */
const nextConfig = {
  // La app no usa next/image, así que el optimizador de imágenes (sharp) no
  // hace falta dentro de las funciones: sacarlo achica cada versión publicada
  // (2026-10-05, el plan gratis de Vercel avisó que se llenaba "Functions
  // Storage" con tantas versiones).
  outputFileTracingExcludes: {
    "*": ["node_modules/@img/**", "node_modules/sharp/**"],
  },
  async redirects() {
    return [
      // La vista previa de torneos se mudó de /pruebas-torneos a
      // /torneos/probar (2026-10-10): los links viejos siguen andando.
      { source: "/pruebas-torneos", destination: "/torneos/probar", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // APK de Android (2026-10-03): se baja como archivo, con su tipo propio.
        source: "/padelito.apk",
        headers: [
          { key: "Content-Type", value: "application/vnd.android.package-archive" },
          { key: "Content-Disposition", value: 'attachment; filename="Padelito.apk"' },
        ],
      },
    ];
  },
};

export default nextConfig;
