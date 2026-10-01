"use client";

import { useSyncExternalStore } from "react";
import MarcadorForm from "@/components/MarcadorForm";

// Sin señal (2026-09-30), el service worker sirve para CUALQUIER
// /partido/<id>/marcador la misma copia guardada de la pantalla -- que trae
// adentro el id del partido con el que se guardó, no el de la URL actual.
// Por eso el id se lee de la barra de direcciones: en la hidratación se usa
// el que vino del servidor (sin diferencias) y enseguida el de la URL.
// `key` hace que el marcador se arme de cero si cambia.
const sinSuscripcion = () => () => {};

export default function MarcadorPorUrl({ idServidor }) {
  const id = useSyncExternalStore(
    sinSuscripcion,
    () => window.location.pathname.split("/")[2] || idServidor,
    () => idServidor
  );
  return <MarcadorForm key={id} partidoId={decodeURIComponent(id)} />;
}
