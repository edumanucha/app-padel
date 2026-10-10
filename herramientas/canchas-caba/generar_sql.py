"""Canchas de CABA por barrio en vez de por comuna (2026-10-10, pedido del
usuario: en la Ciudad la gente sabe su barrio, no su número de comuna).
Arma app/backend/sql/090_canchas_caba_por_barrio.sql.

georef (datos.gob.ar) devuelve la comuna como "departamento", así que 088 y
089 dejaron las canchas de CABA como "Comuna 10", "Comuna 11"... Acá se ubica
cada cancha (por sus coordenadas) dentro de los límites oficiales de los
barrios que publica la Ciudad (datos abiertos GCBA, barrios.geojson) y se le
pone el nombre del barrio tal cual aparece en el perfil.

Uso:  python -I generar_sql.py <ruta a barrios.geojson>
  (bajarlo de https://cdn.buenosaires.gob.ar/datosabiertos/datasets/ministerio-de-educacion/barrios/barrios.geojson)
"""

import json
import os
import re
import sys
import unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, "..", ".."))
SALIDA = os.path.join(RAIZ, "app", "backend", "sql", "090_canchas_caba_por_barrio.sql")
ZONAS_JS = os.path.join(RAIZ, "app", "frontend", "src", "lib", "zonasPorProvincia.js")
CABA = "ciudad_autonoma_de_buenos_aires"


def clave(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = re.sub(r"[^a-z]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))
    # Cómo vienen escritos algunos en el geojson ("Nu�ez" trae la ñ rota).
    return {"villagralmitre": "villageneralmitre", "monserrat": "montserrat",
            "paternal": "lapaternal", "nuez": "nunez"}.get(s, s)


def q(v):
    return "'" + str(v).replace("'", "''") + "'"


def adentro(lon, lat, anillo):
    dentro = False
    j = len(anillo) - 1
    for i in range(len(anillo)):
        xi, yi = anillo[i][0], anillo[i][1]
        xj, yj = anillo[j][0], anillo[j][1]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            dentro = not dentro
        j = i
    return dentro


def en_poligono(lon, lat, geom):
    poligonos = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    for p in poligonos:
        if adentro(lon, lat, p[0]) and not any(adentro(lon, lat, h) for h in p[1:]):
            return True
    return False


def main():
    barrios = json.load(open(sys.argv[1], encoding="utf-8"))["features"]

    # Nombres de barrio tal cual los muestra el perfil (zonasPorProvincia.js).
    js = open(ZONAS_JS, encoding="utf-8").read()
    lista = re.search(CABA + r": \[(.*?)\]", js).group(1)
    del_perfil = {clave(n): n for n in re.findall(r'"([^"]+)"', lista)}

    def barrio_de(lat, lng):
        for f in barrios:
            if en_poligono(lng, lat, f["geometry"]):
                return del_perfil[clave(f["properties"]["nombre"])]
        # En el borde (Riachuelo, General Paz): el barrio más cercano.
        def d(f):
            anillo = f["geometry"]["coordinates"]
            anillo = anillo[0][0] if f["geometry"]["type"] == "MultiPolygon" else anillo[0]
            return min((x - lng) ** 2 + (y - lat) ** 2 for x, y, *_ in anillo)
        return del_perfil[clave(min(barrios, key=d)["properties"]["nombre"])]

    filas = []
    atc = json.load(open(os.path.join(RAIZ, "herramientas", "canchas-atc", "clubes_atc.json"), encoding="utf-8"))
    for c in atc:
        if (c.get("provincia") or "").startswith("Ciudad") and c.get("lat") is not None:
            filas.append(("atc_id", c["atc_id"], c["nombre"], barrio_de(c["lat"], c["lng"])))

    # Las de OpenStreetMap: las filas de CABA del 089.
    sql089 = open(os.path.join(RAIZ, "app", "backend", "sql", "089_canchas_osm.sql"), encoding="utf-8").read()
    patron = r"\('((?:node|way|relation)/\d+)', '((?:[^']|'')*)', .*?, '" + CABA + r"', .*?, (-?[\d.]+), (-?[\d.]+)\)"
    for osm_id, nombre, lat, lng in re.findall(patron, sql089):
        filas.append(("osm_id", osm_id, nombre.replace("''", "'"), barrio_de(float(lat), float(lng))))

    valores = "\n".join(
        f"  ({q(col)}, {q(i)}, {q(b)}){',' if k < len(filas) - 1 else ''}  -- {n}"
        for k, (col, i, n, b) in enumerate(filas)
    )
    sql = f"""-- Canchas de CABA por barrio en vez de por comuna (2026-10-10, pedido del
-- usuario: en la Ciudad la gente sabe en qué barrio vive, no su número de
-- comuna). 088 y 089 las dejaron como "Comuna 10", "Comuna 11"... porque
-- georef devuelve la comuna. Las armó herramientas/canchas-caba/generar_sql.py
-- ubicando cada cancha por sus coordenadas dentro de los límites oficiales de
-- los barrios (datos abiertos de la Ciudad). El nombre del barrio es el mismo
-- que se elige en el perfil.
--
-- Se corre entero, una vez, en el SQL Editor de Supabase. {len(filas)} canchas.

with barrio(origen, id, zona) as (values
{valores}
)
update public.canchas c
set zona = b.zona
from barrio b
where c.provincia = '{CABA}'
  and ((b.origen = 'atc_id' and c.atc_id = b.id) or (b.origen = 'osm_id' and c.osm_id = b.id));

-- Para revisar: no debería quedar ninguna "Comuna".
select zona, count(*) as canchas
from public.canchas where provincia = '{CABA}'
group by zona order by count(*) desc, zona;
"""
    open(SALIDA, "w", encoding="utf-8").write(sql)
    cuenta = {}
    for *_, b in filas:
        cuenta[b] = cuenta.get(b, 0) + 1
    print(len(filas), "canchas ->", SALIDA)
    print(sorted(cuenta.items(), key=lambda x: -x[1]))


if __name__ == "__main__":
    main()
