// Set de íconos lineales minimalistas (2026-09-12, a pedido del usuario:
// "me encantó, aplicá ese estilo a todos los botones") -- reemplazan los
// emoji de todo el Home (y de a poco, del resto de la app) por líneas
// simples de un solo trazo, sin relleno, en currentColor. Sin librería
// nueva: son puro SVG a mano, chicos y livianos.
// Ver project_padelito_style_guide.md.

const base = {
  viewBox: "0 0 24 24",
  width: 20,
  height: 20,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconoCorazon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </svg>
  );
}

export function IconoGrupo(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.4-3 2.6-5 5.5-5s5.1 2 5.5 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16 14.2c2.4-.3 4.2 1.3 4.6 4.3" />
    </svg>
  );
}

export function IconoCasa(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

export function IconoTrofeo(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
      <path d="M12 14v3" />
      <path d="M9 20h6" />
      <path d="M9 17h6l.6 3H8.4z" />
    </svg>
  );
}

export function IconoPaleta(props) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="2.5" width="12" height="13" rx="6" />
      <path d="M12 15.5v5" />
      <path d="M9.5 20.5h5" />
      <circle cx="9.5" cy="7" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="6" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="10" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10.5" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoPersona(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" />
    </svg>
  );
}

export function IconoCalendario(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconoLupa(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 20.5 20.5" />
    </svg>
  );
}

export function IconoMensaje(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5h16v11H9l-4 3.5v-3.5H4z" />
      {/* Puntitos de "escribiendo..." -- solo se animan cuando un
          ancestro tiene la clase `icono-mensaje-loop` (ver Home). */}
      <circle className="mensaje-punto mensaje-punto-1" cx="8.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle className="mensaje-punto mensaje-punto-2" cx="12" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle className="mensaje-punto mensaje-punto-3" cx="15.5" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoSobre(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      {/* Solapa en 2 segmentos, cada uno "abisagrado" en su esquina fija
          (4,6.5) y (20,6.5) -- así al animar (rotate, no translate) el
          vértice del medio sube y baja pero las puntas siguen ancladas a
          las esquinas del sobre. La versión anterior (una sola línea con
          translateY) despegaba la línea entera de las esquinas y quedaba
          flotando: se veía roto. Solo se anima cuando un ancestro tiene
          la clase `icono-sobre-loop` (ver Home). */}
      <path className="sobre-solapa sobre-solapa-izq" d="M4 6.5 12 13" />
      <path className="sobre-solapa sobre-solapa-der" d="M20 6.5 12 13" />
    </svg>
  );
}

export function IconoRadar(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoDuo(props) {
  return (
    <svg {...base} {...props}>
      {/* Cada persona en su propio grupo -- solo se separan/acercan
          (efecto "abrazo") cuando un ancestro tiene la clase
          `icono-duo-loop` (ver Home, "Compañero fijo"). */}
      <g className="duo-persona duo-persona-1">
        <circle cx="9" cy="9" r="3.2" />
        <path d="M3.5 20c0.8-3.2 3.2-5 5.5-5s4.7 1.8 5.5 5" />
      </g>
      <g className="duo-persona duo-persona-2">
        <circle cx="16" cy="10" r="2.6" />
        <path d="M15 15.3c2 0.2 3.7 1.7 4.3 4.2" />
      </g>
    </svg>
  );
}

export function IconoPin(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

export function IconoLista(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M8.5 9h7M8.5 13h7M8.5 17h4.5" />
    </svg>
  );
}

export function IconoBandera(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3v18" />
      <path d="M6 4.5h12l-2.5 3.5L18 11.5H6" />
    </svg>
  );
}

export function IconoLlave(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 6.5a3.5 3.5 0 1 0-4.9 4.9L4 17v3h3l6.5-6.5a3.5 3.5 0 0 0 1-7.4z" />
      <circle cx="15.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoPelota(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6c2.5 2.5 2.5 9.5 0 12" />
      <path d="M18 6c-2.5 2.5-2.5 9.5 0 12" />
    </svg>
  );
}

export function IconoCampana(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5L6 17z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconoMenu(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

export function IconoGrafico(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V9M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function IconoSinConexion(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 3l18 18" />
      <path d="M8.5 11a7 7 0 0 1 4-1.3M5 8a11 11 0 0 1 3.5-2M19 8a11 11 0 0 0-4.5-2.7M16 11.2a7 7 0 0 1 2 1.3" />
      <path d="M9 15a4.5 4.5 0 0 1 4-1.2" />
      <circle cx="12" cy="19" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoCompartir(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="18" cy="6" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="18" r="2.6" />
      <path d="M8.3 10.7l7.4-3.4M8.3 13.3l7.4 3.4" />
    </svg>
  );
}

export function IconoRepetir(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11a8 8 0 0 1 13.7-5.6L20 7.5" />
      <path d="M20 4v3.5h-3.5" />
      <path d="M20 13a8 8 0 0 1-13.7 5.6L4 16.5" />
      <path d="M4 20v-3.5h3.5" />
    </svg>
  );
}

export function IconoBilletera(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7.5c0-1.1.9-2 2-2h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z" />
      <path d="M4 9h13.5a2.5 2.5 0 0 1 2.5 2.5v1a2.5 2.5 0 0 1-2.5 2.5H16a2 2 0 0 1 0-4h3" />
    </svg>
  );
}

export function IconoTelefono(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4.5c.5-.8 1.4-1.2 2.3-1l1.9.4c.7.2 1.2.8 1.2 1.5v2.4c0 .6-.3 1.1-.8 1.4l-1.3.9c1 2.3 2.8 4.1 5.1 5.1l.9-1.3c.3-.5.9-.8 1.4-.8h2.4c.7 0 1.3.5 1.5 1.2l.4 1.9c.2.9-.2 1.8-1 2.3-.9.5-1.9.8-2.9.6-5.4-1-9.7-5.3-10.7-10.7-.2-1 .1-2 .6-2.9Z" />
    </svg>
  );
}

export function IconoFutbol(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.2 15.4 10.6 14.1 14.6 9.9 14.6 8.6 10.6Z" />
      <path d="M12 3v5.2M6.4 6.5l3.5 4.1M17.6 6.5l-3.5 4.1M4.3 15.5l5.6-.9M19.7 15.5l-5.6-.9M9.9 14.6 8 20.3M14.1 14.6l1.9 5.7" />
    </svg>
  );
}

export function IconoBasquet(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
      <path d="M5.3 5.3a12 12 0 0 1 0 13.4M18.7 5.3a12 12 0 0 0 0 13.4" />
    </svg>
  );
}

export function IconoOjo(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12c2.5-5 6.5-7.5 9.5-7.5s7 2.5 9.5 7.5c-2.5 5-6.5 7.5-9.5 7.5S5 17 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconoOjoTachado(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12c2.5-5 6.5-7.5 9.5-7.5s7 2.5 9.5 7.5c-2.5 5-6.5 7.5-9.5 7.5S5 17 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M3.5 3.5l17 17" />
    </svg>
  );
}

export function IconoMapa(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4.5 4 6.5v13l5-2 6 2 5-2v-13l-5 2-6-2Z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </svg>
  );
}

export function IconoMano(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M14 11.2V5.7a1.5 1.5 0 0 1 3 0V13" />
      <path d="M8 12l-1.6-1.6a1.6 1.6 0 0 0-2.4 2.1L7 16.5c1.2 1.8 3.2 4 6.5 4 3.8 0 6.5-2.7 6.5-6.5v-3.3a1.5 1.5 0 0 0-3 0" />
    </svg>
  );
}

export function IconoPlay(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  );
}

export function IconoAyuda(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.3a2.7 2.7 0 1 1 3.7 2.5c-.8.4-1 .8-1 1.7" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoLibro(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4.5c2-.8 4.5-.8 8 .5v14c-3.5-1.3-6-1.3-8-.5v-14Z" />
      <path d="M20 4.5c-2-.8-4.5-.8-8 .5v14c3.5-1.3 6-1.3 8-.5v-14Z" />
    </svg>
  );
}

export function IconoEngranaje(props) {
  // Engranaje clásico (2026-09-12, a pedido del usuario: "que sea una
  // rosca real, no eso que pusiste" -- eligió la opción "O": contorno
  // grueso, 6 dientes robustos, geometría real calculada por trigonometría
  // (no líneas ni rects sueltos simulando dientes).
  return (
    <svg {...base} {...props} strokeWidth="2">
      <path d="M 18.66 10.21 L 22.50 12.00 L 21.09 17.25 L 16.88 16.88 L 17.25 21.09 L 12.00 22.50 L 10.21 18.66 L 6.75 21.09 L 2.91 17.25 L 5.34 13.79 L 1.50 12.00 L 2.91 6.75 L 7.12 7.12 L 6.75 2.91 L 12.00 1.50 L 13.79 5.34 L 17.25 2.91 L 21.09 6.75 Z" />
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  );
}

export function IconoCarrito(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 4.5h2l2 12h11l1.5-8h-13" />
      <circle cx="9.5" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoChevron(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconoFuego(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3c1 3-3 4-3 7.5A3.5 3.5 0 0 0 12 14a3 3 0 0 0 3-3c1.5 1 2 2.8 2 4.2A5 5 0 0 1 12 20a5 5 0 0 1-5-5c0-4 3-5.5 3-9.5.7.5 1.5 1.3 2 2.5z" />
    </svg>
  );
}

export function IconoGirarTelefono(props) {
  return (
    <svg {...base} {...props}>
      <rect x="7" y="2" width="10" height="16" rx="2" />
      <line x1="12" y1="15" x2="12" y2="15.01" />
      <path d="M4 14a8 8 0 0 0 3 6.2" />
      <path d="M4.5 17.5 4 14l3.6-.6" />
    </svg>
  );
}

export function IconoPulgar(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 11v9H4v-9h3z" />
      <path d="M7 11l4-7a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.2l-1.2 7A2 2 0 0 1 17 21H7" />
    </svg>
  );
}

// Íconos sumados para sacar los emojis de la app (2026-10-01, rediseño "sin
// olor a IA", paso A). Mismo trazo y grilla 24x24 que el resto del set.

export function IconoReloj(props) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="6" width="12" height="12" rx="3" />
      <path d="M9 6l.6-3h4.8l.6 3M9 18l.6 3h4.8l.6-3" />
      <path d="M12 9.5V12l1.8 1.2" />
    </svg>
  );
}

export function IconoMicrofono(props) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21M9 21h6" />
    </svg>
  );
}

export function IconoCamara(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function IconoDedo(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10 13V5a1.6 1.6 0 0 1 3.2 0v6" />
      <path d="M13.2 11h1.4a1.6 1.6 0 0 1 1.6 1.6V13h.6a1.6 1.6 0 0 1 1.6 1.6v1.6c0 2.9-2.3 4.8-5.2 4.8H11c-1.6 0-2.8-.8-3.7-2l-2.4-3.4a1.5 1.5 0 0 1 2.3-1.9L10 15" />
      <path d="M7 4.5 5.5 3M15.5 4.5 17 3M6 8H4M19 8h-2" />
    </svg>
  );
}

export function IconoBateria(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7.5" width="16" height="9" rx="2" />
      <path d="M21 10.5v3" />
      <path d="M6 10.5v3M9 10.5v3" />
    </svg>
  );
}

export function IconoParlante(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

export function IconoMedalla(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 3h3l1 4M16 3h-3l-1 4" />
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="m12 11.8.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3.9-1.8Z" />
    </svg>
  );
}

export function IconoDiana(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

export function IconoSenal(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 19v-2M9.7 19v-5M14.3 19v-8M19 19V6" />
    </svg>
  );
}

export function IconoRayo(props) {
  return (
    <svg {...base} {...props}>
      <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />
    </svg>
  );
}

// Estrella para puntuaciones: con `llena` se rellena del color actual.
export function IconoEstrella({ llena, ...props }) {
  return (
    <svg {...base} {...props} fill={llena ? "currentColor" : "none"}>
      <path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.8l-5.3 2.8 1-5.8-4.2-4.1 5.9-.9L12 3.5Z" />
    </svg>
  );
}

export function IconoSol(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </svg>
  );
}

export function IconoLuna(props) {
  return (
    <svg {...base} {...props}>
      <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />
    </svg>
  );
}

export function IconoInstalar(props) {
  return (
    <svg {...base} {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M12 7.5v7M9 11.5l3 3 3-3" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

export function IconoCronometro(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V9.5M10 2.5h4M18.5 6l1.5-1.5" />
    </svg>
  );
}

export function IconoLlamada(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
