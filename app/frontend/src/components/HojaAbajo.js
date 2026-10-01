"use client";

// Hoja que sube desde abajo (2026-10-01, elegida por el usuario en
// /pruebas-marcadorcito: "me encanta esta manera de mostrar las opciones").
// Se dibuja ENCIMA de la pantalla, no la empuja -- importante en el
// Marcadorcito apaisado, donde no sobra ni un píxel de alto.
//
// Va con `position: fixed`: adentro del Marcadorcito apaisado (que gira con
// transform) "fixed" se ubica respecto de ese contenedor girado, así que la
// hoja gira junto con el tablero y sale desde el borde de abajo que ve la
// persona.
//
// - `onCerrar`: si no se pasa, la hoja no se puede cerrar tocando afuera
//   ni tiene "Listo" (sirve para cuando hay que elegir sí o sí).
export default function HojaAbajo({ titulo, onCerrar, textoCerrar = "Listo ✕", children }) {
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/45"
        onClick={onCerrar}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md bg-surface text-ink rounded-t-[26px] shadow-[0_-8px_24px_rgba(0,0,0,0.18)] flex flex-col"
        style={{ maxHeight: "88%" }}
      >
        <div className="px-4 pt-3 pb-2 flex flex-col gap-2 shrink-0">
          <span className="mx-auto w-10 h-1 rounded-full bg-black/15" aria-hidden />
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-titulo font-black text-2xl uppercase leading-none">{titulo}</h2>
            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                className="font-heading font-semibold text-sm text-muted px-2 py-1 cursor-pointer"
              >
                {textoCerrar}
              </button>
            )}
          </div>
        </div>
        <div className="px-4 pb-5 overflow-y-auto flex flex-col gap-3">{children}</div>
      </div>
    </>
  );
}

// Pestañas tipo "píldora" para usar adentro de la hoja.
export function PestanasHoja({ pestanas, activa, onCambiar }) {
  return (
    <div
      className="grid gap-1 rounded-full bg-bg p-1"
      style={{ gridTemplateColumns: `repeat(${pestanas.length}, minmax(0, 1fr))` }}
    >
      {pestanas.map(([id, texto]) => (
        <button
          key={id}
          type="button"
          onClick={() => onCambiar(id)}
          className={`rounded-full text-sm py-1.5 font-heading font-semibold cursor-pointer ${
            activa === id ? "bg-surface shadow" : "text-muted"
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}
