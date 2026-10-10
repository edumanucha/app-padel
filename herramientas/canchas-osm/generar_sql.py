"""Canchas de pádel de OpenStreetMap que no están entre las de ATC (2026-10-10,
pedido del usuario: "hagamos lo de OpenStreetMap para comparar y en caso de
que falten, cargarlas"). Arma app/backend/sql/089_canchas_osm.sql.

Pasos (todo con este script):
  1. Pide a Overpass todo lo de pádel en Argentina (consulta.overpassql).
  2. Se queda con lo que tiene nombre de club (descarta "Cancha de Padel",
     "Paddle", etc.) y junta los elementos del mismo club que están pegados.
  3. Descarta los que ya están en ATC: a menos de 300 m de un club de ATC, o
     con nombre parecido a menos de 5 km.
  4. Provincia y departamento con georef (datos.gob.ar).
  5. El SQL vuelve a chequear contra la base (nombre parecido en la misma
     provincia o una cancha a menos de 300 m) antes de insertar.

Datos de OpenStreetMap, © colaboradores de OpenStreetMap, licencia ODbL.

Uso:  python -I generar_sql.py
"""

import json
import math
import os
import re
import unicodedata
import urllib.parse
import urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, "..", ".."))
SALIDA = os.path.join(RAIZ, "app", "backend", "sql", "089_canchas_osm.sql")
UA = {"User-Agent": "Padelito (directorio de canchas)"}
NOMBRE_CORTO = {"Tierra del Fuego, Antártida e Islas del Atlántico Sur": "Tierra del Fuego"}


def slug(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", "_", s.strip())


def norm(t):
    t = (t or "").lower().translate(str.maketrans("áéíóúüñ", "aeiouun"))
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    t = re.sub(r"\b(padel|paddle|padle|club|de|la|el|del|cancha|canchas|complejo|indoor|tenis|y)\b", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def dist(a, b):
    return math.hypot((a[0] - b[0]) * 111000, (a[1] - b[1]) * 111000 * math.cos(math.radians(a[0])))


def q(v):
    if v is None or v == "":
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def pos(x):
    return (x["lat"], x["lon"]) if "lat" in x else (x["center"]["lat"], x["center"]["lon"])


def main():
    crudo = os.path.join(AQUI, "osm_crudo.json")
    if os.path.exists(crudo):
        # Copia de la última descarga (Overpass a veces está saturado).
        elementos = json.load(open(crudo, encoding="utf-8"))["elements"]
    else:
        consulta = open(os.path.join(AQUI, "consulta.overpassql"), encoding="utf-8").read()
        req = urllib.request.Request(
            "https://overpass-api.de/api/interpreter",
            data=urllib.parse.urlencode({"data": consulta}).encode(),
            headers=UA,
        )
        datos = urllib.request.urlopen(req, timeout=300).read()
        open(crudo, "wb").write(datos)
        elementos = json.loads(datos)["elements"]

    grupos = []
    for x in elementos:
        nombre = (x.get("tags") or {}).get("name")
        n = norm(nombre)
        if not nombre or len(n) < 2 or n.isdigit():
            continue
        p = pos(x)
        for g in grupos:
            if dist(p, g["pos"]) < 200 and (n == norm(g["nombre"]) or dist(p, g["pos"]) < 80):
                break
        else:
            grupos.append({"pos": p, "nombre": nombre.strip(), "x": x})

    atc = json.load(open(os.path.join(RAIZ, "herramientas", "canchas-atc", "clubes_atc.json"), encoding="utf-8"))
    nuevos = []
    for g in grupos:
        n = norm(g["nombre"])
        repetido = any(
            dist(g["pos"], (a["lat"], a["lng"])) < 300
            or (dist(g["pos"], (a["lat"], a["lng"])) < 5000 and norm(a["nombre"])
                and (norm(a["nombre"]) in n or n in norm(a["nombre"])))
            for a in atc
        )
        if not repetido:
            nuevos.append(g)

    cuerpo = {"ubicaciones": [{"lat": g["pos"][0], "lon": g["pos"][1]} for g in nuevos]}
    req = urllib.request.Request(
        "https://apis.datos.gob.ar/georef/api/ubicacion",
        data=json.dumps(cuerpo).encode(),
        headers={"Content-Type": "application/json", **UA},
    )
    resultados = json.load(urllib.request.urlopen(req, timeout=120))["resultados"]

    filas, por_prov = [], {}
    for g, r in zip(nuevos, resultados):
        u = r.get("ubicacion") or {}
        prov = (u.get("provincia") or {}).get("nombre")
        if not prov:
            continue
        prov = NOMBRE_CORTO.get(prov, prov)
        zona = (u.get("departamento") or {}).get("nombre")
        if zona == "Capital":
            zona = f"Ciudad de {prov}"
        t = g["x"].get("tags") or {}
        direccion = " ".join(v for v in [t.get("addr:street"), t.get("addr:housenumber")] if v) or None
        telefono = t.get("phone") or t.get("contact:phone")
        osm_id = f'{g["x"]["type"]}/{g["x"]["id"]}'
        por_prov[slug(prov)] = por_prov.get(slug(prov), 0) + 1
        filas.append(
            f"  ({q(osm_id)}, {q(g['nombre'])}, {q(direccion)}, {q(zona)}, {q(slug(prov))}, "
            f"{q(telefono)}, {g['pos'][0]}, {g['pos'][1]})"
        )

    sql = f"""-- Canchas de pádel de OpenStreetMap que no estaban en la base (2026-10-10,
-- pedido del usuario: comparar con un mapa de todo el país y cargar las que
-- falten). Las armó herramientas/canchas-osm/generar_sql.py: {len(filas)} clubes con
-- nombre que no aparecen entre los de ATC (088). Se descartaron las canchas
-- sin nombre o con nombres genéricos ("Cancha de Padel", "Paddle").
-- Datos de OpenStreetMap, © colaboradores de OpenStreetMap, licencia ODbL.
--
-- Ojo: OpenStreetMap lo carga la gente y puede tener clubes que ya cerraron.
--
-- Qué hace (se corre entero, una vez, en el SQL Editor de Supabase):
--   1. Agrega a canchas el id de OpenStreetMap.
--   2. Inserta cada club salvo que ya haya en la base una cancha con nombre
--      parecido en la misma provincia, o una a menos de 300 m.
--
-- Por provincia: {", ".join(f"{k} {v}" for k, v in sorted(por_prov.items()))}.

alter table public.canchas add column if not exists osm_id text unique;

create or replace function pg_temp.nombre_comparable(t text) returns text
language sql immutable as $f$
  select trim(regexp_replace(regexp_replace(regexp_replace(
    translate(lower(coalesce(t, '')), 'áéíóúüñ', 'aeiouun'),
    '[^a-z0-9 ]', ' ', 'g'),
    '\\m(padel|paddle|club|de|la|el|del|cancha|canchas|complejo)\\M', ' ', 'g'),
    '\\s+', ' ', 'g'))
$f$;

drop table if exists pg_temp.osm;
create temp table osm (
  osm_id text, nombre text, direccion text, zona text, provincia text, telefono text,
  lat double precision, lng double precision
);

insert into osm values
{",\n".join(filas)};

insert into public.canchas (osm_id, nombre, direccion, zona, provincia, telefono, lat, lng)
select o.osm_id, o.nombre, o.direccion, o.zona, o.provincia, o.telefono, o.lat, o.lng
from osm o
where not exists (select 1 from public.canchas c where c.osm_id = o.osm_id)
  and not exists (
    select 1 from public.canchas c
    where c.provincia = o.provincia
      and pg_temp.nombre_comparable(c.nombre) <> ''
      and (pg_temp.nombre_comparable(c.nombre) = pg_temp.nombre_comparable(o.nombre)
           or pg_temp.nombre_comparable(c.nombre) like '%' || pg_temp.nombre_comparable(o.nombre) || '%'
           or pg_temp.nombre_comparable(o.nombre) like '%' || pg_temp.nombre_comparable(c.nombre) || '%')
  )
  and not exists (
    select 1 from public.canchas c
    where c.lat is not null
      and abs(c.lat - o.lat) * 111000 < 300
      and abs(c.lng - o.lng) * 111000 * cos(radians(o.lat)) < 300
  );

-- Para revisar: cuántas canchas quedaron por provincia y de dónde salieron.
select provincia, count(*) as canchas, count(atc_id) as de_atc, count(osm_id) as de_osm
from public.canchas group by provincia order by provincia;
"""
    open(SALIDA, "w", encoding="utf-8").write(sql)
    print(f"{len(grupos)} clubes con nombre en OSM, {len(nuevos)} no están en ATC, {len(filas)} al SQL")
    print(por_prov)


if __name__ == "__main__":
    main()
