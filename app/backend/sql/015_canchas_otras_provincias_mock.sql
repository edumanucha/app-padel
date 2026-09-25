-- Prepara el terreno para filtrar canchas por provincia (idea del usuario,
-- 2026-09-05: cuando el perfil tenga una provincia distinta a Mendoza, que
-- el buscador de canchas traiga las de esa provincia). Por ahora las otras
-- 23 provincias no tienen canchas reales investigadas -- se cargan 5
-- canchas de prueba por provincia, con nombres que dejan bien en claro que
-- son datos ficticios ("Cancha Demo (dato de prueba)"), para poder probar
-- el filtro sin mezclar datos falsos con las 40 canchas reales de Mendoza.

alter table public.canchas
  add column provincia text;

update public.canchas set provincia = 'mendoza' where provincia is null;

alter table public.canchas
  alter column provincia set not null,
  alter column provincia set default 'mendoza';

do $$
declare
  provincias text[][] := array[
    array['buenos_aires', 'Buenos Aires'],
    array['ciudad_autonoma_de_buenos_aires', 'Ciudad Autónoma de Buenos Aires'],
    array['catamarca', 'Catamarca'],
    array['chaco', 'Chaco'],
    array['chubut', 'Chubut'],
    array['cordoba', 'Córdoba'],
    array['corrientes', 'Corrientes'],
    array['entre_rios', 'Entre Ríos'],
    array['formosa', 'Formosa'],
    array['jujuy', 'Jujuy'],
    array['la_pampa', 'La Pampa'],
    array['la_rioja', 'La Rioja'],
    array['misiones', 'Misiones'],
    array['neuquen', 'Neuquén'],
    array['rio_negro', 'Río Negro'],
    array['salta', 'Salta'],
    array['san_juan', 'San Juan'],
    array['san_luis', 'San Luis'],
    array['santa_cruz', 'Santa Cruz'],
    array['santa_fe', 'Santa Fe'],
    array['santiago_del_estero', 'Santiago del Estero'],
    array['tierra_del_fuego', 'Tierra del Fuego'],
    array['tucuman', 'Tucumán']
  ];
  p text[];
  i integer;
begin
  foreach p slice 1 in array provincias loop
    for i in 1..5 loop
      insert into public.canchas (nombre, direccion, zona, provincia, telefono)
      values (
        'Cancha Demo (dato de prueba) ' || p[2] || ' ' || i,
        'Dirección de prueba ' || i,
        null,
        p[1],
        null
      );
    end loop;
  end loop;
end $$;
