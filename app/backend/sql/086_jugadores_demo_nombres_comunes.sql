-- Jugadores demo con nombres comunes (2026-10-10, pedido del usuario: "los
-- nombres de la base que son de River volvamos a ponerlos con nombres random,
-- que si es mujer el sexo sea de mujer").
--
-- Reemplaza los nombres de jugadores de River que puso el 063 por nombres y
-- apellidos argentinos comunes, armados al azar y sin repetir:
--   - perfiles demo (es_demo = true): nombre de mujer si sexo = 'femenino',
--     de hombre si no.
--   - invitados sin cuenta de los partidos que el 063 había renombrado
--     (los que figuran en _respaldo_nombres_063): no tienen sexo cargado,
--     así que mitad y mitad.
-- No toca a nadie real (es_demo = false: tu cuenta, tus amigos, cuentas
-- nuevas) ni a sus partidos. Guarda los nombres de River en un respaldo por
-- si se quiere volver atrás (ver "PARA DESHACER" al final).
-- Se corre entero, una vez, en el SQL Editor de Supabase.

create table if not exists public._respaldo_nombres_086 (
  tabla text not null,
  fila_id uuid not null,
  nombre_anterior text not null,
  primary key (tabla, fila_id)
);
alter table public._respaldo_nombres_086 enable row level security;

insert into public._respaldo_nombres_086 (tabla, fila_id, nombre_anterior)
select 'perfiles', id, nombre from public.perfiles where es_demo = true
on conflict do nothing;

insert into public._respaldo_nombres_086 (tabla, fila_id, nombre_anterior)
select 'partido_jugadores', pj.id, pj.invitado_nombre
from public.partido_jugadores pj
join public._respaldo_nombres_063 r on r.tabla = 'partido_jugadores' and r.fila_id = pj.id
where pj.jugador_id is null and pj.invitado_nombre is not null
on conflict do nothing;

do $$
declare
  v_hombres text[] := array[
    'Martín', 'Lucas', 'Juan', 'Nicolás', 'Matías', 'Santiago', 'Tomás', 'Federico', 'Diego', 'Pablo',
    'Agustín', 'Facundo', 'Gonzalo', 'Ignacio', 'Joaquín', 'Franco', 'Sebastián', 'Leandro', 'Ezequiel', 'Mariano',
    'Hernán', 'Cristian', 'Damián', 'Emiliano', 'Gastón', 'Germán', 'Javier', 'Lautaro', 'Maximiliano', 'Rodrigo',
    'Alejandro', 'Andrés', 'Bruno', 'Esteban', 'Fernando', 'Gabriel', 'Guillermo', 'Julián', 'Marcos', 'Ramiro'
  ];
  v_mujeres text[] := array[
    'Sofía', 'Valentina', 'Camila', 'Martina', 'Lucía', 'Florencia', 'Agustina', 'Micaela', 'Julieta', 'Carolina',
    'Victoria', 'Paula', 'Belén', 'Rocío', 'Milagros', 'Antonella', 'Daniela', 'Natalia', 'Romina', 'Gisela',
    'Sabrina', 'Melina', 'Lorena', 'Mariana', 'Jimena', 'Luciana', 'Celeste', 'Candela', 'Brenda', 'Noelia',
    'Ana', 'Laura', 'Silvina', 'Verónica', 'Carla', 'Eugenia', 'Josefina', 'Pilar', 'Delfina', 'Guadalupe'
  ];
  v_apellidos text[] := array[
    'González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Pérez', 'García', 'Sánchez',
    'Romero', 'Sosa', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Benítez', 'Acosta', 'Medina',
    'Herrera', 'Suárez', 'Aguirre', 'Giménez', 'Gutiérrez', 'Pereyra', 'Rojas', 'Molina', 'Castro', 'Ortiz',
    'Silva', 'Núñez', 'Luna', 'Juárez', 'Cabrera', 'Ríos', 'Ferreyra', 'Godoy', 'Morales', 'Domínguez',
    'Moreno', 'Peralta', 'Vega', 'Carrizo', 'Quiroga', 'Castillo', 'Ledesma', 'Muñoz', 'Ojeda', 'Ponce',
    'Vera', 'Vázquez', 'Villalba', 'Cardozo', 'Navarro', 'Ramos', 'Arias', 'Coronel', 'Córdoba', 'Figueroa'
  ];
  v_usados text[] := array[]::text[];
  v_fila record;
  v_mujer boolean;
  v_nombre text;
  v_intentos integer;
  v_cant integer := 0;
begin
  for v_fila in
    select 'perfiles' as tabla, id, (sexo = 'femenino') as mujer from public.perfiles where es_demo = true
    union all
    select 'partido_jugadores', pj.id, random() < 0.5
    from public.partido_jugadores pj
    join public._respaldo_nombres_086 r on r.tabla = 'partido_jugadores' and r.fila_id = pj.id
  loop
    v_mujer := coalesce(v_fila.mujer, false);
    v_intentos := 0;
    loop
      v_nombre :=
        (case when v_mujer then v_mujeres[1 + floor(random() * array_length(v_mujeres, 1))::int]
              else v_hombres[1 + floor(random() * array_length(v_hombres, 1))::int] end)
        || ' ' || v_apellidos[1 + floor(random() * array_length(v_apellidos, 1))::int];
      v_intentos := v_intentos + 1;
      exit when not (v_nombre = any(v_usados)) or v_intentos > 50;
    end loop;
    v_usados := v_usados || v_nombre;
    if v_fila.tabla = 'perfiles' then
      update public.perfiles set nombre = v_nombre where id = v_fila.id;
    else
      update public.partido_jugadores set invitado_nombre = v_nombre where id = v_fila.id;
    end if;
    v_cant := v_cant + 1;
  end loop;
  raise notice 'Nombres cambiados: %', v_cant;
end $$;

-- Para revisar: mujeres con nombre de mujer y hombres con nombre de hombre.
select nombre, sexo from public.perfiles where es_demo = true order by sexo, nombre;

-- PARA DESHACER (vuelve a los nombres de River):
-- update public.perfiles p set nombre = r.nombre_anterior
--   from public._respaldo_nombres_086 r where r.tabla = 'perfiles' and r.fila_id = p.id;
-- update public.partido_jugadores pj set invitado_nombre = r.nombre_anterior
--   from public._respaldo_nombres_086 r where r.tabla = 'partido_jugadores' and r.fila_id = pj.id;
