// Guía de dónde dejar el celu para que el Marcadorcito te escuche y el reloj
// se mantenga al día (2026-10-04). Se muestra antes de empezar un partido y
// en "Cómo funciona". Dibujo simple: la cancha vista desde arriba, con el
// celu en el vidrio del fondo, cerca del medio y a media altura.
export default function GuiaCelular() {
  return (
    <div className="flex flex-col gap-3 text-ink">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted pb-1.5 border-b-2 border-ink">Dónde dejar el celu</span>
      <svg viewBox="0 0 320 180" role="img" aria-label="Cancha vista desde arriba con el celu apoyado en el vidrio del fondo, cerca del centro" className="w-full">
        <rect x="10" y="10" width="300" height="160" rx="6" fill="#154139" />
        <rect x="22" y="22" width="276" height="136" fill="none" stroke="#2b5d52" strokeWidth="2" />
        <line x1="160" y1="22" x2="160" y2="158" stroke="#f2f5f3" strokeWidth="3" />
        <line x1="22" y1="90" x2="298" y2="90" stroke="#2b5d52" strokeWidth="1.5" strokeDasharray="4 4" />
        {/* celu en el vidrio del fondo, centrado */}
        <rect x="146" y="12" width="28" height="10" rx="2" fill="#f2c53d" />
        <text x="160" y="42" textAnchor="middle" fontSize="11" fill="#f2c53d" fontWeight="700">CELU</text>
        {/* radio de escucha */}
        <path d="M 90 22 Q 160 110 230 22" fill="none" stroke="#f2c53d" strokeWidth="1.5" strokeDasharray="3 4" />
        <circle cx="80" cy="120" r="7" fill="#eaf4f0" />
        <circle cx="240" cy="120" r="7" fill="#eaf4f0" />
        <circle cx="110" cy="60" r="7" fill="#8fb6ae" />
        <circle cx="210" cy="60" r="7" fill="#8fb6ae" />
      </svg>
      <ul className="flex flex-col gap-1.5 text-sm text-muted leading-relaxed list-disc pl-5">
        <li>Apoyalo en el vidrio o la reja del fondo, <b className="text-ink">cerca del centro</b> y a la altura de la cintura.</li>
        <li>Lo más cerca posible de quien dice los puntos: <b className="text-ink">a menos de 2 metros</b> la voz se entiende mucho mejor.</li>
        <li>Con el micrófono hacia la cancha, sin tapar y con la pantalla prendida.</li>
        <li>Si queda lejos, usá los botones del reloj: siguiente = punto A, anterior = punto B.</li>
        <li>Dejalo cargando o con batería suficiente: un partido largo gasta bastante.</li>
      </ul>
    </div>
  );
}
