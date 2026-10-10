"""Junta los clubes de pádel de atcsports.io de toda la Argentina (2026-10-10,
pedido del usuario: "entremos a ATC y busquemos todas las canchas de
Argentina así tenemos eso en la base actualizado").

Cómo:
  1. Pide a georef (datos.gob.ar) los municipios y departamentos con su
     centro, para tener puntos repartidos por todo el país.
  2. Por cada celda de ~20 km con algún municipio busca pádel en ATC con la
     misma página de resultados que usa la web (/results), que trae los
     clubes cercanos con nombre, dirección, teléfono y coordenadas.
  3. Con las coordenadas de cada club le pregunta a georef en qué
     provincia, departamento y municipio queda.

Va despacio (3 búsquedas a la vez, con pausa) para no cargarle el servidor a ATC.
Deja el resultado en clubes_atc.json, al lado de este archivo.

Uso:  python -I juntar_canchas_atc.py
"""

import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "clubes_atc.json")
UA = {"User-Agent": "Mozilla/5.0 (Padelito; directorio de canchas)"}
PADEL = "7"
PAUSA = 1.0

_B32 = "0123456789bcdefghjkmnpqrstuvwxyz"


def geohash(lat, lon, precision=9):
    lat_r, lon_r = [-90.0, 90.0], [-180.0, 180.0]
    bits, bit, ch, par, out = [16, 8, 4, 2, 1], 0, 0, True, []
    while len(out) < precision:
        r, v = (lon_r, lon) if par else (lat_r, lat)
        mid = (r[0] + r[1]) / 2
        if v > mid:
            ch |= bits[bit]
            r[0] = mid
        else:
            r[1] = mid
        par = not par
        if bit < 4:
            bit += 1
        else:
            out.append(_B32[ch])
            bit, ch = 0, 0
    return "".join(out)


def pedir(url, datos=None, intentos=3):
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers=UA)
            if datos is not None:
                req.add_header("Content-Type", "application/json")
                req.data = json.dumps(datos).encode()
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read().decode("utf-8")
        except Exception as e:  # noqa: BLE001
            print(f"  error ({e}), reintento {i + 1}", file=sys.stderr)
            time.sleep(5 * (i + 1))
    return None


def puntos_del_pais():
    puntos = []
    for tipo in ("municipios", "departamentos"):
        url = f"https://apis.datos.gob.ar/georef/api/{tipo}?max=5000&campos=id,nombre,centroide,provincia.nombre"
        datos = json.loads(pedir(url))
        for x in datos[tipo]:
            c = x["centroide"]
            puntos.append((c["lat"], c["lon"], f'{x["nombre"]} ({x["provincia"]["nombre"]})'))
    # ATC trae los clubes a unos 20 km de cada punto: alcanza con una
    # búsqueda por celda de 0,2° (~20 km), en el centro de la celda.
    vistos, unicos = set(), []
    for lat, lon, nombre in puntos:
        celda = (round(lat / 0.2), round(lon / 0.2))
        if celda not in vistos:
            vistos.add(celda)
            unicos.append((celda[0] * 0.2, celda[1] * 0.2, nombre))
    return unicos


def clubes_cerca(lat, lon, dia):
    qs = urllib.parse.urlencode({
        "horario": "19:00", "tipoDeporte": PADEL, "dia": dia,
        "placeId": geohash(lat, lon), "locationName": "x",
    })
    html = pedir(f"https://atcsports.io/results?{qs}")
    if not html:
        return []
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return []
    props = json.loads(m.group(1)).get("props", {}).get("pageProps", {})
    return props.get("bookingsBySport") or []


def resumen(c):
    loc = c.get("location") or {}
    return {
        "atc_id": str(c["id"]),
        "permalink": c.get("permalink"),
        "nombre": (c.get("name") or "").strip(),
        "direccion": (loc.get("name") or "").strip(),
        "zona_atc": ((loc.get("zone") or {}).get("name") or "").strip(),
        "pais": ((loc.get("zone") or {}).get("country") or {}).get("code"),
        "lat": loc.get("lat"),
        "lng": loc.get("lng"),
        "telefono": c.get("phone"),
        "deportes": c.get("sport_ids") or [],
    }


def main():
    dia = (date.today() + timedelta(days=1)).isoformat()
    puntos = puntos_del_pais()
    print(f"{len(puntos)} puntos para buscar")
    clubes = {}
    if os.path.exists(SALIDA):
        clubes = {c["atc_id"]: c for c in json.load(open(SALIDA, encoding="utf-8"))}
    def buscar(punto):
        lat, lon, _ = punto
        r = clubes_cerca(lat, lon, dia)
        time.sleep(PAUSA)
        return punto, r

    with ThreadPoolExecutor(max_workers=3) as hilos:
        for i, (punto, encontrados) in enumerate(hilos.map(buscar, puntos), 1):
            nuevos = 0
            for c in encontrados:
                if PADEL not in (c.get("sport_ids") or []):
                    continue
                r = resumen(c)
                if r["pais"] not in (None, "ar"):
                    continue
                if r["atc_id"] not in clubes:
                    nuevos += 1
                clubes[r["atc_id"]] = r
            print(f"[{i}/{len(puntos)}] {punto[2]}: {len(encontrados)} cerca, +{nuevos} (total {len(clubes)})", flush=True)
            if i % 25 == 0:
                json.dump(list(clubes.values()), open(SALIDA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # Provincia / departamento / municipio de cada club, según georef.
    lista = [c for c in clubes.values() if c["lat"] is not None]
    for j in range(0, len(lista), 500):
        tanda = lista[j:j + 500]
        cuerpo = {"ubicaciones": [{"lat": c["lat"], "lon": c["lng"]} for c in tanda]}
        resp = json.loads(pedir("https://apis.datos.gob.ar/georef/api/ubicacion", cuerpo))
        for c, r in zip(tanda, resp["resultados"]):
            u = r.get("ubicacion") or {}
            c["provincia"] = (u.get("provincia") or {}).get("nombre")
            c["departamento"] = (u.get("departamento") or {}).get("nombre")
            c["municipio"] = (u.get("municipio") or {}).get("nombre")
    json.dump(list(clubes.values()), open(SALIDA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"Listo: {len(clubes)} clubes en {SALIDA}")


if __name__ == "__main__":
    main()
