"use client";

import { useState } from "react";
import styles from "@/components/Marcador.module.css";

// Aviso de "girá tu teléfono" para el marcador en modo apaisado (2026-09-10).
// Se probó forzar el giro con CSS (rotar el contenido con transform) y se
// descartó: solo tiene sentido si el sistema mantiene el viewport en
// portrait a la fuerza, así que para la mayoría (auto-rotate activado)
// terminaría mostrando todo de costado en vez de arreglar nada.
//
// En cambio: este aviso siempre queda como respaldo universal (anda en
// cualquier navegador, sin permisos), más un botón que INTENTA forzar el
// giro de verdad con la Screen Orientation API -- que solo funciona en
// Android/Chrome y encima casi siempre requiere pantalla completa primero.
// En iPhone/Safari esa API no existe: ahí el botón no hace nada y el
// usuario tiene que girar el teléfono a mano, no hay forma de evitarlo.
export default function AvisoGirarTelefono() {
  const [error, setError] = useState("");

  async function forzarGiro() {
    setError("");
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock("landscape");
      } else {
        setError("Tu navegador no soporta forzar el giro -- girá el teléfono a mano.");
      }
    } catch (e) {
      setError("No se pudo forzar el giro en este navegador -- girá el teléfono a mano.");
    }
  }

  return (
    <div className={styles.avisoGirar}>
      <span className={styles.avisoGirarIcono}>📱</span>
      <p className="font-heading text-lg font-semibold">Girá tu teléfono</p>
      <p className="text-sm" style={{ color: "#8fb6ae" }}>
        El marcador está pensado para verse en horizontal, para que se lea bien desde lejos en la cancha.
      </p>
      <button
        onClick={forzarGiro}
        className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline cursor-pointer"
      >
        🔒 Intentar forzar el giro
      </button>
      {error && <p className="text-xs" style={{ color: "#ff8a80" }}>{error}</p>}
    </div>
  );
}
