import { NextResponse } from "next/server";

// Link escondido para las páginas de prueba (2026-11-11, pedido del usuario):
// en producción /pruebas-* da "página no encontrada", salvo que el link traiga
// ?clave=... (la correcta). La primera vez queda guardada en una cookie por 30
// días. Acá solo está el hash: el repo es público y la clave no.
const HASH_CLAVE = "7128dd042d604654528ad7a1bc079c88b0c7873918010867accf3894e45e74f6";

async function sha256(texto) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function proxy(req) {
  if (!req.nextUrl.pathname.startsWith("/pruebas-")) {
    const headers = new Headers(req.headers);
    headers.delete("x-pruebas");
    return NextResponse.next({ request: { headers } });
  }
  const delLink = req.nextUrl.searchParams.get("clave");
  const clave = delLink || req.cookies.get("pruebas")?.value;
  const ok = !!clave && (await sha256(clave)) === HASH_CLAVE;
  // El layout de (pruebas) mira este encabezado; se pisa siempre para que no se pueda mandar de afuera.
  const headers = new Headers(req.headers);
  headers.set("x-pruebas", ok ? "1" : "0");
  const res = NextResponse.next({ request: { headers } });
  if (ok && delLink) {
    res.cookies.set("pruebas", delLink, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  }
  return res;
}

// Todas las páginas (no los archivos de _next): así el encabezado se pisa siempre.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
