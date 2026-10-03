/** @type {import('next').NextConfig} */
const nextConfig = {
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
