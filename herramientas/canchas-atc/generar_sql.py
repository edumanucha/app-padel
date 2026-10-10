"""Arma app/backend/sql/088_canchas_atc_argentina.sql a partir de
clubes_atc.json (lo que juntó juntar_canchas_atc.py).

Uso:  python -I generar_sql.py
"""

import json
import os
import re
import unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, "..", ".."))
SQL = os.path.join(RAIZ, "app", "backend", "sql")
SALIDA = os.path.join(SQL, "088_canchas_atc_argentina.sql")

NOMBRE_CORTO = {"Tierra del Fuego, Antártida e Islas del Atlántico Sur": "Tierra del Fuego"}


def slug(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", "_", s.strip())


def q(v):
    if v is None or v == "":
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def prolijo(s):
    s = re.sub(r"\s+", " ", (s or "").strip()).strip(" .,-")
    # "PADEL HOUSE" -> "Padel House"; los que ya mezclan mayúsculas quedan igual.
    if s.isupper() and len(s) > 4:
        s = s.title()
    return s


def telefono(t):
    t = re.sub(r"[^\d+]", "", t or "")
    return t or None


def extraer_bloque(archivo, inicio, fin):
    s = open(os.path.join(SQL, archivo), encoding="utf-8").read()
    i = s.index(inicio)
    j = s.index(fin, i) + len(fin)
    return s[i:j]


def main():
    clubes = json.load(open(os.path.join(AQUI, "clubes_atc.json"), encoding="utf-8"))
    filas = []
    por_prov = {}
    sin_prov = 0
    for c in sorted(clubes, key=lambda c: (c.get("provincia") or "", c["nombre"].lower())):
        prov = NOMBRE_CORTO.get(c.get("provincia"), c.get("provincia"))
        if not prov:
            sin_prov += 1
            continue
        zona = c.get("departamento") or c.get("zona_atc")
        if zona == "Capital":
            zona = f"Ciudad de {prov}"
        por_prov[slug(prov)] = por_prov.get(slug(prov), 0) + 1
        filas.append(
            f"  ({q(c['atc_id'])}, {q(prolijo(c['nombre']))}, {q(prolijo(c['direccion']))}, {q(zona)}, "
            f"{q(slug(prov))}, {q(telefono(c.get('telefono')))}, {c['lat']}, {c['lng']})"
        )

    demo = extraer_bloque(
        "067_fix_partidos_demo_dia_argentina.sql",
        "create or replace function public.generar_partidos_demo(",
        "\n$$;",
    )
    viejo = "select id, nombre into v_cancha_id, v_cancha from public.canchas order by random() limit 1;"
    assert viejo in demo
    demo = demo.replace(
        viejo,
        "select id, nombre into v_cancha_id, v_cancha from public.canchas where provincia = 'mendoza' order by random() limit 1;",
    )


    sql = f"""-- Canchas de pádel de toda la Argentina, sacadas de atcsports.io
-- (2026-10-10, pedido del usuario: "entremos a ATC y busquemos todas las
-- canchas de Argentina así tenemos eso en la base actualizado"; mismo origen
-- que 051, que trajo solo Mendoza). Las juntó
-- herramientas/canchas-atc/juntar_canchas_atc.py: {len(filas)} clubes con pádel.
-- La provincia y el departamento (zona) salen de georef (datos.gob.ar) con las
-- coordenadas de cada club; el departamento "Capital" va como "Ciudad de
-- <provincia>", igual que en el perfil.
--
-- Qué hace (se corre entero, una vez, en el SQL Editor de Supabase):
--   1. Agrega a canchas el id de ATC y las coordenadas.
--   2. Las canchas que ya estaban (por ejemplo las de Mendoza de 011/051) se
--      reconocen por nombre parecido en la misma provincia: se les completa
--      el id de ATC y las coordenadas, sin tocar el resto (las reseñas
--      siguen colgadas de la misma fila).
--   3. Agrega las que faltan.
--   4. Borra las "Cancha Demo (dato de prueba)" de 015: los partidos demo que
--      las usaban pasan a una cancha real de Mendoza y sus reseñas se borran.
--   5. Los partidos demo diarios (065/067) eligen solo canchas de Mendoza,
--      porque los jugadores demo son de Mendoza.
--
-- Por provincia: {", ".join(f"{k} {v}" for k, v in sorted(por_prov.items()))}.

-- 1) Columnas nuevas ---------------------------------------------------------
alter table public.canchas
  add column if not exists atc_id text unique,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Nombre comparable: minúsculas, sin tildes ni signos, sin la palabra pádel.
create or replace function pg_temp.nombre_comparable(t text) returns text
language sql immutable as $f$
  select trim(regexp_replace(regexp_replace(regexp_replace(
    translate(lower(coalesce(t, '')), 'áéíóúüñ', 'aeiouun'),
    '[^a-z0-9 ]', ' ', 'g'),
    '\\m(padel|club|de|la|el|del)\\M', ' ', 'g'),
    '\\s+', ' ', 'g'))
$f$;

drop table if exists pg_temp.atc;
create temp table atc (
  atc_id text, nombre text, direccion text, zona text, provincia text, telefono text,
  lat double precision, lng double precision
);

insert into atc values
{",\n".join(filas)};

-- 2) Las que ya estaban --------------------------------------------------------
-- De a una, así ninguna fila queda enganchada a dos clubes de ATC ni al revés.
do $$
declare
  a record;
  v_id uuid;
  v_enlazadas integer := 0;
begin
  for a in select * from atc order by atc_id loop
    select c.id into v_id
    from public.canchas c
    where c.atc_id is null
      and c.provincia = a.provincia
      and c.nombre not ilike '%dato de prueba%'
      and (
        pg_temp.nombre_comparable(c.nombre) = pg_temp.nombre_comparable(a.nombre)
        or (length(pg_temp.nombre_comparable(a.nombre)) >= 6
            and pg_temp.nombre_comparable(c.nombre) like '%' || pg_temp.nombre_comparable(a.nombre) || '%')
        or (length(pg_temp.nombre_comparable(c.nombre)) >= 6
            and pg_temp.nombre_comparable(a.nombre) like '%' || pg_temp.nombre_comparable(c.nombre) || '%')
        -- "La Nave Padel" / "La Nave Padel Mendoza": uno empieza con el otro.
        or (length(pg_temp.nombre_comparable(c.nombre)) >= 4
            and pg_temp.nombre_comparable(a.nombre) || ' ' like pg_temp.nombre_comparable(c.nombre) || ' %')
        or (length(pg_temp.nombre_comparable(a.nombre)) >= 4
            and pg_temp.nombre_comparable(c.nombre) || ' ' like pg_temp.nombre_comparable(a.nombre) || ' %')
      )
    order by (pg_temp.nombre_comparable(c.nombre) = pg_temp.nombre_comparable(a.nombre)) desc
    limit 1;
    if v_id is not null and not exists (select 1 from public.canchas where atc_id = a.atc_id) then
      update public.canchas set atc_id = a.atc_id, lat = a.lat, lng = a.lng where id = v_id;
      v_enlazadas := v_enlazadas + 1;
    end if;
  end loop;
  raise notice 'Canchas que ya estaban, enlazadas con ATC: %', v_enlazadas;
end $$;

-- 3) Las nuevas -----------------------------------------------------------------
insert into public.canchas (atc_id, nombre, direccion, zona, provincia, telefono, lat, lng)
select a.atc_id, a.nombre, a.direccion, a.zona, a.provincia, a.telefono, a.lat, a.lng
from atc a
where not exists (select 1 from public.canchas c where c.atc_id = a.atc_id);

-- 4) Fuera las canchas de prueba de 015 ----------------------------------------
do $$
declare
  v_partido record;
  v_cancha_id uuid;
  v_cancha text;
begin
  for v_partido in
    select p.id from public.partidos p
    join public.canchas c on c.id = p.cancha_id
    where c.nombre ilike '%dato de prueba%'
  loop
    select id, nombre into v_cancha_id, v_cancha from public.canchas
    where provincia = 'mendoza' and nombre not ilike '%dato de prueba%'
    order by random() limit 1;
    update public.partidos set cancha_id = v_cancha_id, cancha = v_cancha where id = v_partido.id;
  end loop;
  delete from public.resenas_canchas
  where cancha_id in (select id from public.canchas where nombre ilike '%dato de prueba%');
  delete from public.canchas where nombre ilike '%dato de prueba%';
end $$;

-- 5) Partidos demo diarios: solo canchas de Mendoza ----------------------------
{demo}

-- Para revisar: cuántas canchas quedaron por provincia.
select provincia, count(*) as canchas, count(atc_id) as de_atc
from public.canchas group by provincia order by provincia;
"""
    open(SALIDA, "w", encoding="utf-8").write(sql)
    print(f"{len(filas)} clubes -> {SALIDA} (sin provincia: {sin_prov})")
    print(por_prov)


if __name__ == "__main__":
    main()
