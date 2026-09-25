import styles from "@/components/Marcador.module.css";

// Patrón de bitmap 5x7 por dígito -- mismo patrón usado en el mockup
// confirmado del marcador (US-2.7), para que cada número se vea armado con
// puntos redondos ("pelotitas de tenis") en vez de una tipografía plana.
const PATRONES = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
};

function UnDigito({ char, solido }) {
  // Tema alto contraste (2026-09-14, a pedido del usuario: "no se ve
  // nada, debería ser algo con más volumen, números completos y más
  // bold, solo para el blanco y negro") -- las "pelotitas" quedan
  // sutiles/con huecos contra un fondo claro, exactamente lo contrario
  // de lo que ese tema necesita. Mismo tamaño de caja (`.dotdigit`, así
  // que todas las reglas de ancho por contexto siguen aplicando sin
  // tocarlas), pero adentro un número sólido y grueso en vez de la
  // grilla de puntos.
  if (solido) {
    return (
      <span className={styles.dotdigit}>
        <span className={styles.numeroSolido}>{char}</span>
      </span>
    );
  }
  const patron = PATRONES[char] ?? PATRONES["0"];
  const puntos = patron.flatMap((fila) => fila.split(""));
  return (
    <span className={styles.dotdigit}>
      {puntos.map((bit, i) => (
        <span key={i} className={`${styles.dot} ${bit === "1" ? styles.dotOn : ""}`} />
      ))}
    </span>
  );
}

/** Renderiza un número (o "AD") como una serie de dígitos dot-matrix (o,
 * con `solido`, como números sólidos en bold -- ver tema alto contraste). */
export default function DotDigit({ valor, solido = false }) {
  const chars = String(valor).split("");
  return (
    <>
      {chars.map((c, i) => (
        <UnDigito key={i} char={c} solido={solido} />
      ))}
    </>
  );
}
