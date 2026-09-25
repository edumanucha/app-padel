-- ============================================================
-- schema-completo.sql: referencia consolidada de TODO el esquema
-- de la base (disaster-recovery), generada concatenando sql/*.sql
-- en orden de version. NO pensado para correr contra la base ya
-- poblada actual -- solo para reconstruir de cero si hiciera falta.
-- 001_perfiles.sql es una RECONSTRUCCION (el original se perdio),
-- ver su propio encabezado para el detalle.
-- Regenerado automaticamente: 2026-09-08T02:41:12Z
-- ============================================================

-- ===== sql/001_perfiles.sql =====
-- Épica 1: tabla `perfiles`, base de todo el resto del esquema.
--
-- NOTA DE PROVENIENCIA (2026-09-06): el script original de esta tabla se
-- corrió a mano en el SQL Editor de Supabase ANTES de adoptar esta carpeta
-- como repositorio de migraciones (ver `estado-tecnico-proyecto.md`,
-- sección Épica 1) y nunca quedó guardado en el repo. Este archivo es una
-- RECONSTRUCCIÓN fiel a partir de esa documentación narrativa y de cómo
-- los archivos posteriores (013, 014, 021, 022, 024, 028, 037) alteran
-- esta tabla -- no es un "restore" de un archivo perdido, es una
-- recreación equivalente. Si alguna vez hay que reconstruir la base de
-- cero, correr este archivo primero, y en orden, todo lo demás.
create table public.perfiles (
  id uuid primary key references auth.users(id),
  nombre text not null,
  telefono text not null,
  sexo text not null check (sexo in ('masculino', 'femenino')),
  zona text not null check (zona in (
    'ciudad_de_mendoza', 'godoy_cruz', 'guaymallen', 'las_heras', 'lujan_de_cuyo', 'maipu', 'otra_zona'
  )),
  nivel smallint not null check (nivel between 1 and 7),
  mano_habil text not null check (mano_habil in ('diestro', 'zurdo')),
  posicion text not null check (posicion in ('drive', 'reves')),
  activo boolean not null default true,
  dado_de_baja_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.actualizar_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_perfiles_updated_at
  before update on public.perfiles
  for each row execute function public.actualizar_updated_at();

alter table public.perfiles enable row level security;

-- Sin política ni GRANT de DELETE, a propósito: la baja de cuenta (US-1.6)
-- es un soft delete (`activo = false`), nunca un borrado real de fila.
grant select, insert, update on public.perfiles to authenticated;

create policy "Ver mi propio perfil" on public.perfiles
  for select to authenticated using (id = auth.uid());

create policy "Crear mi propio perfil" on public.perfiles
  for insert to authenticated with check (id = auth.uid());

create policy "Actualizar mi propio perfil" on public.perfiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ===== sql/002_partidos.sql =====
-- Épica 2: Gestión de Partidos
-- Correr completo en el SQL Editor de Supabase (mismo proyecto app-padel).
-- Nota: la tabla `perfiles` (Épica 1) no tiene su SQL guardado en este
-- repo porque se corrió antes de adoptar esta carpeta -- a partir de acá,
-- toda tabla nueva guarda su script acá para que quede reproducible.

-- =========================================================
-- Tabla: partidos
-- =========================================================
create table public.partidos (
  id uuid primary key default gen_random_uuid(),
  organizador_id uuid not null references public.perfiles(id),
  fecha_hora timestamptz not null,
  cancha text not null,
  -- Decisión (2026-09-05, "Crear la app"): la cantidad de jugadores es
  -- VARIABLE, la especifica el organizador al crear el partido (no fija en
  -- 4) -- así se puede usar para singles, dobles o formatos tipo americano
  -- sin modelar un tipo de partido aparte. Resuelve la pregunta abierta de
  -- US-2.1 en historias-usuario-mvp.md.
  cantidad_jugadores integer not null check (cantidad_jugadores >= 2),
  estado text not null default 'abierto'
    check (estado in ('abierto', 'completo', 'cancelado', 'jugado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_partidos_updated_at
before update on public.partidos
for each row execute function public.set_updated_at();

-- Recordatorio de la Épica 1: el CREATE TABLE no alcanza, Postgres exige
-- además este GRANT básico para el rol `authenticated` (si no, "permission
-- denied" aunque las políticas de RLS estén bien).
grant select, insert, update on public.partidos to authenticated;

alter table public.partidos enable row level security;

-- Cualquier usuario autenticado puede ver los partidos (para el listado de
-- "abiertos" de US-2.2) -- esta tabla no tiene datos sensibles en sí misma;
-- lo sensible (teléfono) vive en `perfiles` y se protege aparte.
create policy "Ver partidos" on public.partidos
  for select to authenticated
  using (true);

-- Crear un partido: solo como uno mismo de organizador.
create policy "Crear partido propio" on public.partidos
  for insert to authenticated
  with check (organizador_id = auth.uid());

-- Solo el organizador puede tocar su partido, y por ahora la única
-- transición que se permite hacer directamente desde el cliente es
-- cancelarlo (US-2.5). Los pasos a "completo" (todos confirmaron) y a
-- "jugado" (la fecha ya pasó) los maneja el sistema (triggers/función más
-- abajo), no el cliente directamente -- así un jugador no puede forzar por
-- API que un partido pase a "completo" antes de tiempo.
create policy "Organizador cancela su partido" on public.partidos
  for update to authenticated
  using (organizador_id = auth.uid())
  with check (organizador_id = auth.uid() and estado = 'cancelado');

-- =========================================================
-- Tabla: partido_jugadores
-- =========================================================
create table public.partido_jugadores (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos(id),
  jugador_id uuid not null references public.perfiles(id),
  estado text not null default 'anotado'
    check (estado in ('invitado', 'anotado', 'confirmado', 'rechazado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partido_id, jugador_id) -- no puedo sumarme dos veces al mismo partido (US-2.2)
);

create trigger trg_partido_jugadores_updated_at
before update on public.partido_jugadores
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.partido_jugadores to authenticated;

alter table public.partido_jugadores enable row level security;

-- Veo las filas de un partido si yo participo en él (como jugador o
-- organizador) -- así veo el resto del plantel de cualquier partido que
-- comparto (US-1.4/US-2.2), pero no el de partidos ajenos.
create policy "Ver participantes de mis partidos" on public.partido_jugadores
  for select to authenticated
  using (
    jugador_id = auth.uid()
    or exists (
      select 1 from public.partido_jugadores pj2
      where pj2.partido_id = partido_jugadores.partido_id
        and pj2.jugador_id = auth.uid()
    )
    or exists (
      select 1 from public.partidos pa
      where pa.id = partido_jugadores.partido_id
        and pa.organizador_id = auth.uid()
    )
  );

-- Dos formas de sumar una fila, y ambas las inicia el interesado, nunca en
-- nombre de otro salvo la invitación del organizador:
--  a) Sumarme yo mismo a un partido abierto (US-2.2): estado 'anotado'.
--  b) El organizador invita a otro jugador (US-2.3): estado 'invitado'.
-- El organizador NO se inserta a sí mismo acá -- eso lo hace
-- automáticamente el trigger de más abajo al crear el partido.
create policy "Sumarme o ser invitado" on public.partido_jugadores
  for insert to authenticated
  with check (
    (jugador_id = auth.uid() and estado = 'anotado')
    or (
      estado = 'invitado'
      and exists (
        select 1 from public.partidos pa
        where pa.id = partido_id and pa.organizador_id = auth.uid()
      )
    )
  );

-- Actualizar mi propia fila: aceptar invitación (invitado -> anotado),
-- confirmar asistencia (anotado -> confirmado). Rechazar invitación y
-- cancelar asistencia se hacen con DELETE (más abajo), no con UPDATE, para
-- no dejar estados intermedios raros.
create policy "Actualizar mi propia participación" on public.partido_jugadores
  for update to authenticated
  using (jugador_id = auth.uid())
  with check (jugador_id = auth.uid());

-- Salir de un partido (cancelar mi asistencia) o rechazar una invitación:
-- ambos casos son "sacar mi propia fila", libera el lugar para otros.
create policy "Salir de un partido o rechazar invitación" on public.partido_jugadores
  for delete to authenticated
  using (jugador_id = auth.uid());

-- =========================================================
-- Automatismos del estado del partido (SECURITY DEFINER: corren con más
-- permisos que el usuario que disparó la acción, para poder tocar la fila
-- de `partidos` aunque quien confirmó su asistencia no sea el organizador)
-- =========================================================

-- Al crear un partido, el organizador queda automáticamente anotado y
-- confirmado (US-2.1) -- lo hace el sistema, no un INSERT aparte del
-- cliente (evita tener que permitir por RLS que cualquiera se inserte a sí
-- mismo como "confirmado" directamente).
create or replace function public.agregar_organizador_como_confirmado()
returns trigger as $$
begin
  insert into public.partido_jugadores (partido_id, jugador_id, estado)
  values (new.id, new.organizador_id, 'confirmado');
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_agregar_organizador
after insert on public.partidos
for each row execute function public.agregar_organizador_como_confirmado();

-- Cada vez que cambia una fila de partido_jugadores (alguien confirma,
-- cancela, se suma, sale), recalculamos si el partido pasa a "completo" o
-- vuelve a "abierto" (US-2.4) -- así ningún cliente fuerza ese estado
-- directamente, lo calcula siempre el sistema a partir de los confirmados.
create or replace function public.recalcular_estado_partido()
returns trigger as $$
declare
  v_partido_id uuid := coalesce(new.partido_id, old.partido_id);
  v_cantidad integer;
  v_estado_actual text;
  v_confirmados integer;
begin
  select cantidad_jugadores, estado into v_cantidad, v_estado_actual
  from public.partidos where id = v_partido_id;

  select count(*) into v_confirmados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado = 'confirmado';

  if v_estado_actual = 'abierto' and v_confirmados >= v_cantidad then
    update public.partidos set estado = 'completo' where id = v_partido_id;
  elsif v_estado_actual = 'completo' and v_confirmados < v_cantidad then
    update public.partidos set estado = 'abierto' where id = v_partido_id;
  end if;

  return null;
end;
$$ language plpgsql security definer;

create trigger trg_recalcular_estado_partido
after insert or update or delete on public.partido_jugadores
for each row execute function public.recalcular_estado_partido();

-- Transición a "jugado" (US-2.5): no hay infraestructura de cron en este
-- proyecto, así que se recalcula "perezosamente" -- el frontend llama a
-- esta función (RPC) al cargar el listado/detalle de partidos, y acá se
-- marcan como jugados los que ya pasaron de fecha.
create or replace function public.marcar_partidos_jugados()
returns void as $$
begin
  update public.partidos
  set estado = 'jugado'
  where estado = 'completo' and fecha_hora < now();
end;
$$ language plpgsql security definer;

grant execute on function public.marcar_partidos_jugados() to authenticated;

-- ===== sql/003_partidos_validaciones.sql =====
-- Épica 2: Validaciones de "Crear partido" (BUG-004, BUG-005)
-- Correr en el SQL Editor de Supabase, después de 002_partidos.sql.
--
-- Contexto: al probar "Crear partido" a mano se detectó que las dos
-- validaciones del formulario (fecha a futuro, cantidad de jugadores)
-- solo existían en el frontend -- alguien podía saltearlas insertando
-- directo contra la API de Supabase (mismo tipo de gap que ya se vio en
-- la Épica 1). Estas dos correcciones las llevan a la base.

-- =========================================================
-- BUG-004: cantidad_jugadores sin tope superior (aceptaba, ej., 1000)
-- =========================================================
-- Decisión (2026-09-05, confirmada por el usuario): tope MVP en 4
-- (dobles estándar de pádel). El campo se mantiene variable entre 2 y 4
-- en vez de fijo en 4 para no perder la flexibilidad ya decidida en
-- historias-usuario-mvp.md (soporta singles=2); formatos más grandes
-- (americano, torneos) quedan fuera del MVP.
-- Limpieza previa: el partido de prueba creado al reproducir BUG-004
-- (cantidad_jugadores = 1000) viola la constraint nueva antes de poder
-- crearla. Es dato de prueba, no de un usuario real -- se borra para
-- poder aplicar el tope. Se borra primero `partido_jugadores` (la fila
-- del organizador que el trigger `trg_agregar_organizador` crea sola) por
-- la foreign key. Si en el futuro hay partidos reales fuera de rango por
-- otro motivo, revisar antes de correr este DELETE de nuevo.
delete from public.partido_jugadores
where partido_id in (
  select id from public.partidos where cantidad_jugadores not between 2 and 4
);

delete from public.partidos where cantidad_jugadores not between 2 and 4;

alter table public.partidos
  drop constraint if exists partidos_cantidad_jugadores_check;

alter table public.partidos
  add constraint partidos_cantidad_jugadores_check
  check (cantidad_jugadores between 2 and 4);

-- =========================================================
-- BUG-005: fecha_hora en el pasado no se validaba en el servidor
-- =========================================================
-- No se usa un CHECK constraint acá a propósito: un CHECK se
-- reevalúa en cada UPDATE, no solo en el INSERT, así que un partido
-- creado a futuro que luego se cancela (UPDATE) después de que su fecha
-- ya pasó rompería el UPDATE si comparáramos contra now() en un CHECK.
-- Un trigger BEFORE INSERT valida solo en el momento de la creación.
create or replace function public.validar_fecha_futura_partido()
returns trigger as $$
begin
  if new.fecha_hora <= now() then
    raise exception 'La fecha y hora del partido tienen que ser a futuro.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validar_fecha_futura_partido
before insert on public.partidos
for each row execute function public.validar_fecha_futura_partido();

-- ===== sql/004_fix_recursion_partido_jugadores.sql =====
-- Épica 2: BUG-006 -- recursión infinita en la política RLS de
-- partido_jugadores. Correr en el SQL Editor de Supabase, después de
-- 003_partidos_validaciones.sql.
--
-- Causa: la política "Ver participantes de mis partidos" tiene una
-- subconsulta que vuelve a leer `partido_jugadores` (para chequear "¿hay
-- otra fila mía en este mismo partido?"). Postgres tiene que aplicar la
-- política de RLS también dentro de esa subconsulta -- y esa aplicación
-- vuelve a disparar la misma subconsulta, en bucle. Resultado: cualquier
-- SELECT (o DELETE, que internamente hace un SELECT) sobre esta tabla
-- rompe con "infinite recursion detected in policy" (código 42P17).
--
-- Fix recomendado por la propia documentación de Supabase para este
-- patrón: mover la subconsulta a una función SECURITY DEFINER. Al ser
-- SECURITY DEFINER, la función corre con los permisos de quien la creó
-- (acá, el rol de administrador de Supabase, que sí puede leer la tabla
-- sin que se le aplique RLS) -- así la subconsulta ya no dispara la
-- política de nuevo y se corta el bucle.
create or replace function public.soy_participante_de(p_partido_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.partido_jugadores
    where partido_id = p_partido_id and jugador_id = auth.uid()
  );
$$;

drop policy if exists "Ver participantes de mis partidos" on public.partido_jugadores;

create policy "Ver participantes de mis partidos" on public.partido_jugadores
  for select to authenticated
  using (
    jugador_id = auth.uid()
    or public.soy_participante_de(partido_jugadores.partido_id)
    or exists (
      select 1 from public.partidos pa
      where pa.id = partido_jugadores.partido_id
        and pa.organizador_id = auth.uid()
    )
  );

-- ===== sql/005_us2_2_listado_y_cupo.sql =====
-- Épica 2: US-2.2 (ver partidos abiertos y sumarme)
-- Correr en el SQL Editor de Supabase, después de 004_fix_recursion_partido_jugadores.sql.
--
-- Necesidad: el listado de "Partidos abiertos" tiene que mostrar cupos
-- ocupados/totales de CUALQUIER partido (no solo los propios), pero las
-- filas de `partido_jugadores` de otra gente no son visibles para mí por
-- RLS (a propósito, por privacidad -- ver US-2.6). Solución: guardar el
-- conteo como una columna en `partidos`, que sí es visible para
-- cualquier autenticado (política "Ver partidos", using(true)).
--
-- Distinción importante: `lugares_ocupados` cuenta anotados + confirmados
-- (cualquiera con un lugar reservado, todavía no confirmado o ya
-- confirmado) -- es lo que determina si "Sumarme" sigue disponible. Es
-- DISTINTO del campo `estado` del partido (abierto/completo), que sigue
-- dependiendo solo de los CONFIRMADOS (US-2.4: "completo" recién cuando
-- todos confirmaron, no cuando todos se anotaron).

alter table public.partidos
  add column if not exists lugares_ocupados integer not null default 0;

-- Se reemplaza la función existente para que además actualice
-- `lugares_ocupados` en cada cambio de `partido_jugadores` (mismo
-- trigger que ya corría, no hace falta uno nuevo).
create or replace function public.recalcular_estado_partido()
returns trigger as $$
declare
  v_partido_id uuid := coalesce(new.partido_id, old.partido_id);
  v_cantidad integer;
  v_estado_actual text;
  v_confirmados integer;
  v_ocupados integer;
begin
  select cantidad_jugadores, estado into v_cantidad, v_estado_actual
  from public.partidos where id = v_partido_id;

  select count(*) into v_confirmados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado = 'confirmado';

  select count(*) into v_ocupados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado in ('anotado', 'confirmado');

  update public.partidos set lugares_ocupados = v_ocupados where id = v_partido_id;

  if v_estado_actual = 'abierto' and v_confirmados >= v_cantidad then
    update public.partidos set estado = 'completo' where id = v_partido_id;
  elsif v_estado_actual = 'completo' and v_confirmados < v_cantidad then
    update public.partidos set estado = 'abierto' where id = v_partido_id;
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- Cupo: nadie puede "sumarse" (anotarse) a un partido que ya tiene tantos
-- anotados+confirmados como `cantidad_jugadores` -- sin esto, cualquiera
-- podía anotarse sin límite (el `INSERT` solo chequeaba "soy yo mismo",
-- nunca cupo disponible). No aplica a las filas que inserta el sistema
-- (organizador al crear el partido, invitaciones del organizador vía
-- US-2.3) -- solo al auto-anotarse.
create or replace function public.validar_cupo_para_anotarse()
returns trigger as $$
declare
  v_cantidad integer;
  v_ocupados integer;
begin
  if new.estado = 'anotado' then
    select cantidad_jugadores into v_cantidad
    from public.partidos where id = new.partido_id;

    select count(*) into v_ocupados
    from public.partido_jugadores
    where partido_id = new.partido_id and estado in ('anotado', 'confirmado');

    if v_ocupados >= v_cantidad then
      raise exception 'El partido ya no tiene lugares disponibles.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validar_cupo_para_anotarse
before insert on public.partido_jugadores
for each row execute function public.validar_cupo_para_anotarse();

-- ===== sql/006_us2_3_invitar_jugadores.sql =====
-- Épica 2: US-2.3 (invitar jugadores a un partido)
-- Correr en el SQL Editor de Supabase, después de 005_us2_2_listado_y_cupo.sql.

-- =========================================================
-- Buscar jugadores para invitar
-- =========================================================
-- Problema a resolver: `perfiles` solo tiene RLS de "ver mi propio
-- perfil" (Épica 1) -- necesario para poder buscar a OTRO jugador por
-- nombre e invitarlo, pero sin abrir la tabla entera (eso expondría
-- `telefono` de cualquiera a cualquiera, adelantándose sin querer a la
-- regla de privacidad de US-2.6, que todavía no está construida). En
-- vez de ampliar la política de `perfiles`, se expone una función
-- SECURITY DEFINER que devuelve solo `id` y `nombre` -- lo mínimo para
-- buscar e invitar, nada sensible.
--
-- Excluye: al que busca (no puede invitarse a sí mismo), cuentas dadas
-- de baja (`activo = false`), y quienes ya tienen una fila en el
-- partido (invitado, anotado, confirmado o rechazado) -- no tiene
-- sentido ofrecerlos de nuevo en la búsqueda.
create or replace function public.buscar_jugadores_para_invitar(p_partido_id uuid, p_termino text)
returns table(id uuid, nombre text)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.nombre
  from public.perfiles p
  where p.activo = true
    and p.id <> auth.uid()
    and p.nombre ilike '%' || p_termino || '%'
    and not exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = p_partido_id and pj.jugador_id = p.id
    )
  order by p.nombre
  limit 20;
$$;

grant execute on function public.buscar_jugadores_para_invitar(uuid, text) to authenticated;

-- =========================================================
-- Cupo: extender el chequeo también a UPDATE (aceptar invitación)
-- =========================================================
-- El trigger de 005 solo corría en INSERT (cubre "Sumarme"). Aceptar
-- una invitación es un UPDATE (invitado -> anotado), y el criterio de
-- aceptación de US-2.3 pide explícitamente rechazar esa aceptación si
-- el cupo ya se llenó por otro lado mientras la invitación esperaba.
create or replace function public.validar_cupo_para_anotarse()
returns trigger as $$
declare
  v_cantidad integer;
  v_ocupados integer;
begin
  if new.estado = 'anotado' and (tg_op = 'insert' or old.estado is distinct from 'anotado') then
    select cantidad_jugadores into v_cantidad
    from public.partidos where id = new.partido_id;

    select count(*) into v_ocupados
    from public.partido_jugadores
    where partido_id = new.partido_id and estado in ('anotado', 'confirmado');

    if v_ocupados >= v_cantidad then
      raise exception 'El partido ya no tiene lugares disponibles.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validar_cupo_para_anotarse on public.partido_jugadores;

create trigger trg_validar_cupo_para_anotarse
before insert or update on public.partido_jugadores
for each row execute function public.validar_cupo_para_anotarse();

-- ===== sql/007_us2_4_confirmar_asistencia.sql =====
-- Épica 2: US-2.4 (confirmar / cancelar asistencia)
-- Correr en el SQL Editor de Supabase, después de 006_us2_3_invitar_jugadores.sql.
--
-- No hace falta tocar RLS para "confirmar asistencia" (UPDATE a
-- "confirmado") ni para el cálculo de completo/abierto -- ya funcionan
-- con lo que existe desde 002/005 (política "Actualizar mi propia
-- participación" + `recalcular_estado_partido`).
--
-- Lo que sí es nuevo: la decisión del usuario de que salir de un partido
-- (anotado o confirmado) solo se permite hasta 1 hora antes de la fecha
-- del partido -- evita bajas de último momento que dejan al resto sin
-- poder reemplazarlo a tiempo, sea cual sea el estado del jugador. No
-- aplica a rechazar una invitación (estado "invitado"): ahí nunca hubo
-- un lugar realmente ocupado, así que no hay nada que "liberar tarde".
create or replace function public.validar_cancelacion_confirmado()
returns trigger as $$
declare
  v_fecha_hora timestamptz;
begin
  if old.estado in ('anotado', 'confirmado') then
    select fecha_hora into v_fecha_hora
    from public.partidos where id = old.partido_id;

    if v_fecha_hora - now() < interval '1 hour' then
      raise exception 'Ya no podés salir del partido: falta menos de 1 hora para el partido.';
    end if;
  end if;

  return old;
end;
$$ language plpgsql;

create trigger trg_validar_cancelacion_confirmado
before delete on public.partido_jugadores
for each row execute function public.validar_cancelacion_confirmado();

-- ===== sql/008_us2_5_us2_6_estado_y_privacidad.sql =====
-- Épica 2: US-2.5 (ver/cancelar estado del partido) y US-2.6 (privacidad
-- del teléfono según confirmación). Correr en el SQL Editor de Supabase.

-- US-2.5: la política "Organizador cancela su partido" y la función
-- marcar_partidos_jugados() ya existían desde 002_partidos.sql (nadie las
-- usaba todavía desde el frontend) -- no hace falta SQL nuevo para esta
-- historia, solo construir la UI que las use.

-- =========================================================
-- US-2.6: ver participantes de un partido, con teléfono visible SOLO para
-- los que confirmaron asistencia (nunca para anotados/invitados/rechazados)
-- =========================================================
create or replace function public.ver_participantes_partido(p_partido_id uuid)
returns table (
  jugador_id uuid,
  nombre text,
  nivel integer,
  mano_habil text,
  posicion text,
  estado text,
  telefono text
)
language plpgsql
security definer
stable
as $$
begin
  -- Mismo criterio de autorización que ya protege el SELECT de
  -- partido_jugadores: solo puede ver el plantel quien participa del
  -- partido o es su organizador.
  if not exists (
    select 1 from public.partido_jugadores pj
    where pj.partido_id = p_partido_id and pj.jugador_id = auth.uid()
  ) and not exists (
    select 1 from public.partidos pa
    where pa.id = p_partido_id and pa.organizador_id = auth.uid()
  ) then
    return;
  end if;

  return query
  select
    pe.id,
    pe.nombre,
    pe.nivel::integer,
    pe.mano_habil,
    pe.posicion,
    pj.estado,
    case when pj.estado = 'confirmado' then pe.telefono else null end
  from public.partido_jugadores pj
  join public.perfiles pe on pe.id = pj.jugador_id
  where pj.partido_id = p_partido_id
  order by (pj.estado = 'confirmado') desc, pe.nombre asc;
end;
$$;

grant execute on function public.ver_participantes_partido(uuid) to authenticated;

-- ===== sql/009_us2_7_marcador_en_vivo.sql =====
-- Épica 2: US-2.7 (marcador en vivo) + primera pieza de US-3.1 (ranking por
-- puntos, Épica 3), que se dispara automáticamente al cerrarse un partido
-- desde acá. Correr en el SQL Editor de Supabase.
-- IMPORTANTE (paso manual fuera de SQL): en el dashboard de Supabase, ir a
-- Database → Replication y habilitar la tabla `resultados_partido` para que
-- Supabase Realtime pueda notificar cambios en vivo entre los dispositivos
-- de los jugadores.

-- Punto de oro (US-2.7): el organizador lo elige al crear el partido.
alter table public.partidos
  add column punto_de_oro boolean not null default false;

-- Equipo (pareja A/B) de cada jugador dentro de un partido -- necesario
-- para interpretar el marcador (quién suma a quién) y para repartir los
-- puntos de ranking (US-3.1) al equipo correcto. Se asigna la primera vez
-- que se abre el marcador (por orden de confirmación: los 2 primeros
-- confirmados = equipo A, los 2 siguientes = equipo B), no antes -- así no
-- hace falta pedirle al organizador que arme los equipos a mano.
alter table public.partido_jugadores
  add column equipo text check (equipo in ('A', 'B'));

-- Puntos de ranking acumulados (US-3.1, Épica 3): acumulado de por vida,
-- se sube automáticamente al finalizar un partido (ver trigger más abajo).
alter table public.perfiles
  add column puntos_ranking integer not null default 0;

-- =========================================================
-- Tabla: resultados_partido (estado en vivo + resultado final)
-- =========================================================
create table public.resultados_partido (
  partido_id uuid primary key references public.partidos(id),
  estado jsonb not null default '{
    "setsA": [0], "setsB": [0],
    "puntosA": 0, "puntosB": 0,
    "tiebreak": false, "saque": "A"
  }'::jsonb,
  finalizado boolean not null default false,
  ganador text check (ganador in ('A', 'B')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_resultados_partido_updated_at
before update on public.resultados_partido
for each row execute function public.set_updated_at();

grant select, insert, update on public.resultados_partido to authenticated;

alter table public.resultados_partido enable row level security;

-- Cualquiera de los 4 jugadores del partido puede ver y actualizar el
-- marcador -- por diseño (US-2.7): cualquiera de las dos parejas puede
-- cantar el punto, no hay un único "dueño" del marcador.
create policy "Participantes ven el marcador" on public.resultados_partido
  for select to authenticated
  using (
    exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = resultados_partido.partido_id and pj.jugador_id = auth.uid()
    )
  );

create policy "Participantes crean el marcador" on public.resultados_partido
  for insert to authenticated
  with check (
    exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = resultados_partido.partido_id and pj.jugador_id = auth.uid()
    )
  );

create policy "Participantes actualizan el marcador" on public.resultados_partido
  for update to authenticated
  using (
    exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = resultados_partido.partido_id and pj.jugador_id = auth.uid()
    )
  );

-- =========================================================
-- Al finalizar un partido (finalizado pasa a true): marca el partido como
-- "jugado" y aplica los puntos de ranking (US-3.1) -- 2 puntos por cada
-- game ganado (ambas parejas) + 5 de bono para la pareja ganadora,
-- acumulado de por vida en perfiles.puntos_ranking.
-- =========================================================
create or replace function public.aplicar_resultado_partido()
returns trigger as $$
declare
  v_games_a integer;
  v_games_b integer;
  v_jugador uuid;
begin
  if new.finalizado = true and (tg_op = 'INSERT' or old.finalizado is distinct from true) then
    update public.partidos set estado = 'jugado' where id = new.partido_id;

    select coalesce(sum(g::int), 0) into v_games_a
      from jsonb_array_elements_text(new.estado -> 'setsA') as g;
    select coalesce(sum(g::int), 0) into v_games_b
      from jsonb_array_elements_text(new.estado -> 'setsB') as g;

    for v_jugador in
      select jugador_id from public.partido_jugadores
      where partido_id = new.partido_id and equipo = 'A'
    loop
      update public.perfiles
      set puntos_ranking = puntos_ranking + v_games_a * 2 + (case when new.ganador = 'A' then 5 else 0 end)
      where id = v_jugador;
    end loop;

    for v_jugador in
      select jugador_id from public.partido_jugadores
      where partido_id = new.partido_id and equipo = 'B'
    loop
      update public.perfiles
      set puntos_ranking = puntos_ranking + v_games_b * 2 + (case when new.ganador = 'B' then 5 else 0 end)
      where id = v_jugador;
    end loop;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_aplicar_resultado_partido on public.resultados_partido;

create trigger trg_aplicar_resultado_partido
after insert or update on public.resultados_partido
for each row execute function public.aplicar_resultado_partido();

-- ===== sql/010_us2_8_marcador_libre_adhoc.sql =====
-- Épica 2: US-2.8 (registrar un partido jugado fuera de la app / modo
-- ad-hoc). Correr en el SQL Editor de Supabase, después de 009.
--
-- Nota técnica (ya anticipada en historias-usuario-mvp.md): un partido
-- ad-hoc se juega en el momento, no se agenda a futuro -- choca con el
-- trigger de BUG-005 (003_partidos_validaciones.sql) que rechaza cualquier
-- fecha_hora no futura. Se resuelve con una columna `es_adhoc` que el
-- trigger respeta. Además, hasta 3 de los 4 jugadores pueden ser
-- invitados libres sin cuenta -- se resuelve con `jugador_id` nullable +
-- `invitado_nombre`.

-- =========================================================
-- Columna es_adhoc en partidos
-- =========================================================
alter table public.partidos
  add column es_adhoc boolean not null default false;

-- El trigger de fecha futura (BUG-005) ya existía -- se reemplaza para
-- exceptuar a los partidos ad-hoc, que se juegan ahora mismo.
create or replace function public.validar_fecha_futura_partido()
returns trigger as $$
begin
  if new.es_adhoc = false and new.fecha_hora <= now() then
    raise exception 'La fecha y hora del partido tienen que ser a futuro.';
  end if;
  return new;
end;
$$ language plpgsql;

-- =========================================================
-- Invitados libres sin cuenta en partido_jugadores
-- =========================================================
alter table public.partido_jugadores
  alter column jugador_id drop not null;

alter table public.partido_jugadores
  add column invitado_nombre text;

alter table public.partido_jugadores
  add constraint partido_jugadores_jugador_o_invitado_check
  check (jugador_id is not null or invitado_nombre is not null);

-- El UNIQUE(partido_id, jugador_id) original no molesta a los invitados
-- libres (jugador_id null no choca con la unicidad en Postgres -- NULL
-- nunca es igual a NULL a los efectos de UNIQUE).

-- El organizador de un partido ad-hoc arma su propio plantel completo de
-- una sola vez (self + hasta 3 más, cada uno con cuenta real o como
-- invitado libre), todos ya "confirmado" -- no hay flujo de invitación
-- previo, el partido arranca ya mismo.
create policy "Organizador arma su partido ad-hoc" on public.partido_jugadores
  for insert to authenticated
  with check (
    estado = 'confirmado'
    and exists (
      select 1 from public.partidos pa
      where pa.id = partido_id and pa.organizador_id = auth.uid() and pa.es_adhoc = true
    )
  );

-- =========================================================
-- Buscador general de jugadores (sin partido todavía, para armar el
-- plantel del marcador libre) -- distinto de buscar_jugadores_para_invitar
-- (US-2.3), que excluye a quienes ya participan de un partido puntual.
-- =========================================================
create or replace function public.buscar_jugadores(p_termino text)
returns table (id uuid, nombre text)
language plpgsql
security definer
stable
as $$
begin
  return query
  select pe.id, pe.nombre
  from public.perfiles pe
  where pe.activo = true
    and pe.id <> auth.uid()
    and pe.nombre ilike '%' || p_termino || '%'
  order by pe.nombre asc
  limit 10;
end;
$$;

grant execute on function public.buscar_jugadores(text) to authenticated;

-- =========================================================
-- ver_participantes_partido (US-2.6): se actualiza para incluir a los
-- invitados libres (jugador_id null), que antes quedaban afuera del JOIN.
-- =========================================================
create or replace function public.ver_participantes_partido(p_partido_id uuid)
returns table (
  jugador_id uuid,
  nombre text,
  nivel integer,
  mano_habil text,
  posicion text,
  estado text,
  telefono text
)
language plpgsql
security definer
stable
as $$
begin
  if not exists (
    select 1 from public.partido_jugadores pj
    where pj.partido_id = p_partido_id and pj.jugador_id = auth.uid()
  ) and not exists (
    select 1 from public.partidos pa
    where pa.id = p_partido_id and pa.organizador_id = auth.uid()
  ) then
    return;
  end if;

  return query
  select
    pj.jugador_id,
    coalesce(pe.nombre, pj.invitado_nombre) as nombre,
    pe.nivel,
    pe.mano_habil,
    pe.posicion,
    pj.estado,
    case when pj.estado = 'confirmado' then pe.telefono else null end
  from public.partido_jugadores pj
  left join public.perfiles pe on pe.id = pj.jugador_id
  where pj.partido_id = p_partido_id
  order by (pj.estado = 'confirmado') desc, nombre asc;
end;
$$;

-- ===== sql/011_canchas_predictivo.sql =====
-- Adelanto chico de la Épica 4 (Directorio de Canchas), a pedido del
-- usuario: el campo "Cancha" de Crear partido y Marcador libre pasa a ser
-- predictivo (mismo patrón que la búsqueda de jugadores) en vez de texto
-- libre siempre. Esto NO reemplaza la Épica 4 completa (listado, detalle,
-- valores, horario, etc. quedan para cuando le toque el turno) -- es solo
-- la tabla mínima + semilla para que el campo tenga con qué autocompletar.
-- Datos: `semilla-canchas-epica4.md` (20 canchas reales de Mendoza,
-- investigadas vía Bing Maps).

create table public.canchas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  zona text,
  telefono text,
  created_at timestamptz not null default now()
);

grant select on public.canchas to authenticated;

alter table public.canchas enable row level security;

create policy "Ver canchas" on public.canchas
  for select to authenticated
  using (true);

insert into public.canchas (nombre, direccion, zona, telefono) values
  ('Canchas de Padel las cañas', 'Calle 25 de Mayo 2425, Villa Nueva', 'Guaymallén', '0261 383-0999'),
  ('La Nave Padel', 'Calle Perú 1110', 'Las Heras', '0261 342-6111'),
  ('Arena Padel Mendoza', 'Calle Pedro del Castillo 3050, Villa Nueva', 'Guaymallén', '0261 557-7800'),
  ('Canchas de Pádel Banco Previsión', 'Calle Salta 2739', 'Ciudad de Mendoza', '0261 537-5810'),
  ('UMaza Padel', 'Dr. Adolfo Calle 4136, Villa Nueva', 'Guaymallén', '0261 674-2993'),
  ('Las Vias Padel', 'Calle Pedro Pascual Segura 1852', 'Godoy Cruz', '0261 720-0538'),
  ('Padel House', 'Cnel. Juan Esteban Rodríguez 205', 'Ciudad de Mendoza', '0261 588-4379'),
  ('Padel Mendoza Tenis', 'Boulogne Sur Mer 520', 'Ciudad de Mendoza', null),
  ('CANO PADEL', 'Timoteo Gordillo 505', 'Ciudad de Mendoza', '0261 246-7277'),
  ('De Volea Padel', 'Juan Isuani 1832, Campo Papa', 'Guaymallén', '0261 485-3697'),
  ('Punto Padel (punto para los amigos)', 'Calle Chacabuco 78', 'Godoy Cruz', '0261 517-4665'),
  ('Punto de Oro Club de Padel', 'Altos Hornos de Zapla 2138', 'Godoy Cruz', '0261 15-774-2319'),
  ('Pádel Club Libertad', 'España 575', 'Godoy Cruz', '0261 661-1734'),
  ('Padel Canchas', 'Independencia 595', 'Godoy Cruz', '0261 419-1991'),
  ('Terrada Padel Club', 'Perdriel', 'Luján de Cuyo', '0261 566-9774'),
  ('VyV Pádel', 'Nahuel Huapí 7721, Chacras de Coria', 'Luján de Cuyo', '0261 15-665-5792'),
  ('Top Padel Guaymallén', 'Europa 9526, Rodeo de la Cruz', 'Guaymallén', '0261 15-279-4975'),
  ('Padel Hípico Mendoza', 'Av. Carlos Thays', 'Ciudad de Mendoza', '0261 533-9531'),
  ('Bandera Center Padel', 'Calle Bandera de los Andes 4397, Villa Nueva', 'Guaymallén', null),
  ('Padel Las Vayas', 'Calle Sarmiento 2945', 'Maipú', '0261 300-8536');

-- ===== sql/012_mas_canchas_mendoza.sql =====
-- Ampliación de la semilla de canchas (a pedido del usuario, 2026-09-05):
-- 20 canchas más de pádel en Mendoza, esta vez investigadas directo en
-- Google Maps (nombre, dirección, teléfono -- mismo criterio de datos
-- públicos ya usado para las primeras 20 en 011). Correr después de 011.
insert into public.canchas (nombre, direccion, zona, telefono) values
  ('Pacífico Padel y Fútbol', 'Av. Perú 2280', 'Ciudad de Mendoza', '0261 205-4178'),
  ('Jaime Serrano Padel', 'Carlos Washington Lencinas', 'Ciudad de Mendoza', '0261 599-3232'),
  ('Las Cañas Padel Club', 'Las Cañas 1511', 'Guaymallén', '0261 15-767-9227'),
  ('Padel Nino - Padel Patricias', 'Patricias Mendocinas 721', 'Ciudad de Mendoza', '0261 319-0012'),
  ('Club Social y Deportivo Barrio Cano', 'Gordillo', 'Ciudad de Mendoza', '0261 346-5283'),
  ('Indoor Efecto Padel', 'Hornos de Zapla 1710', 'Godoy Cruz', '0261 702-2127'),
  ('FOX Padel', 'Carril Rodríguez Peña 2032', 'Godoy Cruz', '0261 15-399-4317'),
  ('Mozart Padel', null, 'Godoy Cruz', '0261 626-9923'),
  ('Canchas de Padel Parque Deportivo San Vicente', null, 'Godoy Cruz', '0261 442-9337'),
  ('Canchas de Paddle Tie Break', 'Pres. Quintana 235', 'Godoy Cruz', '0261 424-3907'),
  ('UNIMEV PADEL', 'Pedro Vargas 2860', 'Guaymallén', '0261 242-9190'),
  ('Academia Arena Pádel', 'Pedro del Castillo 3050', 'Guaymallén', '0261 15-755-4991'),
  ('Garden Padel', 'C. Tapón Moyano S/N', 'Guaymallén', '0261 663-0522'),
  ('Pádel Club de Campo', 'Elpidio González 3195', 'Guaymallén', null),
  ('HACHE CLUB', 'Terrada 7551', 'Luján de Cuyo', '0261 711-0615'),
  ('Arauca Padel', 'Barrio Villa Arauca', 'Las Heras', '0261 384-1199'),
  ('Indoor Mendoza', null, 'Ciudad de Mendoza', null),
  ('Luján Padel Club', 'Lamadrid 220', 'Luján de Cuyo', '0261 15-346-3901'),
  ('Terra Padel Club', null, 'Luján de Cuyo', '0261 15-416-4666'),
  ('J3 Sport Padel', 'Almte. Brown', 'Luján de Cuyo', '0261 242-6398');

-- ===== sql/013_provincia_perfil.sql =====
-- Campo "Provincia" en el perfil (US-1.2/US-1.3), a pedido del usuario
-- (2026-09-05): hoy toda la app asume Mendoza (zona, canchas). Se agrega
-- este campo ahora para poder, más adelante (no en este cambio), filtrar
-- el directorio de canchas según la provincia elegida en el perfil -- ej.
-- cuando se cargue una semilla de canchas de San Juan, un jugador de esa
-- provincia vería esas en vez de las de Mendoza. Por ahora `zona` y las
-- canchas sembradas siguen siendo solo de Mendoza.
alter table public.perfiles
  add column provincia text not null default 'mendoza';

-- ===== sql/014_avatar_perfil.sql =====
-- Avatar de perfil (a pedido del usuario, 2026-09-05): imagen de la
-- persona, opcional (no es uno de los 7 campos obligatorios de US-1.2).
-- Usa Supabase Storage (bucket público "avatars"), cada usuario solo puede
-- subir/reemplazar dentro de su propia carpeta (<user_id>/...).

alter table public.perfiles
  add column avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar publico para lectura" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Subir mi propio avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Reemplazar mi propio avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== sql/015_canchas_otras_provincias_mock.sql =====
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

-- ===== sql/016_us3_5_directorio_jugadores.sql =====
-- Épica 3: US-3.5 (Directorio de jugadores) -- lista filtrable de
-- jugadores activos con su vista reducida de perfil (nombre, nivel,
-- ranking por puntos, mano hábil, sexo -- sin teléfono ni otros datos de
-- contacto), ordenada por ranking. Resuelve la pregunta abierta de
-- privacidad de US-1.4: ya no hace falta compartir un partido para ver
-- esta vista reducida de otro jugador.
--
-- Nota (2026-09-05): los campos se castean explícitamente (::text/::int)
-- porque "structure of query does not match function result type" indica
-- que `sexo` (no usado en ninguna función anterior) no es exactamente
-- `text` en la tabla real -- probablemente un tipo enum de Postgres en vez
-- de texto + CHECK. Castear evita tener que confirmar el tipo exacto.
create or replace function public.listar_directorio_jugadores(
  p_nombre text default null,
  p_nivel integer default null,
  p_sexo text default null
)
returns table (
  id uuid,
  nombre text,
  nivel integer,
  mano_habil text,
  posicion text,
  sexo text,
  puntos_ranking integer
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    pe.id,
    pe.nombre::text,
    pe.nivel::integer,
    pe.mano_habil::text,
    pe.posicion::text,
    pe.sexo::text,
    pe.puntos_ranking::integer
  from public.perfiles pe
  where pe.activo = true
    and pe.id <> auth.uid()
    and (p_nombre is null or pe.nombre ilike '%' || p_nombre || '%')
    and (p_nivel is null or pe.nivel = p_nivel)
    and (p_sexo is null or pe.sexo::text = p_sexo)
  order by pe.puntos_ranking desc, pe.nombre asc
  limit 200;
end;
$$;

grant execute on function public.listar_directorio_jugadores(text, integer, text) to authenticated;

-- ===== sql/017_us5_3_resumen_home.sql =====
-- Épica 5: US-5.3 (Pantalla principal / Home) -- un solo RPC que agrega
-- todo lo que necesita el resumen personalizado (próximo partido,
-- invitaciones pendientes, último partido jugado, racha, posición en el
-- ranking, estadística rápida) en una sola llamada, en vez de que el
-- frontend arme varias consultas + joins complejos por su cuenta.
create or replace function public.resumen_home()
returns jsonb
language plpgsql
security definer
stable
as $$
declare
  v_user uuid := auth.uid();
  v_proximo jsonb;
  v_invitaciones integer;
  v_ultimo jsonb;
  v_racha integer := 0;
  v_streak_roto boolean := false;
  v_posicion integer;
  v_total integer;
  v_jugados integer := 0;
  v_ganados integer := 0;
  r record;
begin
  select jsonb_build_object('partido_id', pa.id, 'fecha_hora', pa.fecha_hora, 'cancha', pa.cancha)
  into v_proximo
  from public.partido_jugadores pj
  join public.partidos pa on pa.id = pj.partido_id
  where pj.jugador_id = v_user
    and pj.estado in ('anotado', 'confirmado')
    and pa.estado <> 'cancelado'
    and pa.fecha_hora > now()
  order by pa.fecha_hora asc
  limit 1;

  select count(*) into v_invitaciones
  from public.partido_jugadores
  where jugador_id = v_user and estado = 'invitado';

  for r in
    select rp.partido_id, rp.estado, rp.ganador, pj.equipo as mi_equipo
    from public.resultados_partido rp
    join public.partido_jugadores pj on pj.partido_id = rp.partido_id and pj.jugador_id = v_user
    where rp.finalizado = true
    order by rp.updated_at desc
    limit 20
  loop
    v_jugados := v_jugados + 1;

    if r.ganador = r.mi_equipo then
      v_ganados := v_ganados + 1;
      if not v_streak_roto then
        v_racha := v_racha + 1;
      end if;
    else
      v_streak_roto := true;
    end if;

    if v_ultimo is null then
      v_ultimo := jsonb_build_object(
        'partido_id', r.partido_id,
        'gano', r.ganador = r.mi_equipo,
        'sets_a', r.estado -> 'setsA',
        'sets_b', r.estado -> 'setsB',
        'rival_nombres', (
          select string_agg(coalesce(pe.nombre, pj2.invitado_nombre), ' / ')
          from public.partido_jugadores pj2
          left join public.perfiles pe on pe.id = pj2.jugador_id
          where pj2.partido_id = r.partido_id and pj2.equipo <> r.mi_equipo
        )
      );
    end if;
  end loop;

  select count(*) + 1 into v_posicion
  from public.perfiles
  where activo = true
    and puntos_ranking > (select puntos_ranking from public.perfiles where id = v_user);

  select count(*) into v_total from public.perfiles where activo = true;

  return jsonb_build_object(
    'proximo_partido', v_proximo,
    'invitaciones_pendientes', v_invitaciones,
    'ultimo_partido', v_ultimo,
    'racha_actual', v_racha,
    'posicion_ranking', v_posicion,
    'total_jugadores', v_total,
    'partidos_jugados', v_jugados,
    'porcentaje_victorias', case when v_jugados > 0 then round(100.0 * v_ganados / v_jugados) else 0 end
  );
end;
$$;

grant execute on function public.resumen_home() to authenticated;

-- ===== sql/018_historial_demo_y_stats_directorio.sql =====
-- A pedido del usuario (2026-09-05): que los jugadores demo tengan
-- historial real de partidos jugados (no solo un puntos_ranking suelto),
-- para que % de victorias y cantidad de partidos jugados tengan datos
-- reales detrás -- y sumar esas dos columnas al Directorio (US-3.5).
--
-- Nota (2026-09-05, tercera vuelta): la versión anterior (barajar
-- v_demo_ids con unnest + order by random(), tomar los primeros 4) NO
-- randomizaba de verdad -- los 40 partidos generados terminaron con
-- exactamente los mismos 4 jugadores siempre (confirmado por el usuario
-- corriendo un SELECT de diagnóstico). Se reemplaza por una consulta
-- directa a la tabla con `order by random() limit 4` en cada iteración,
-- que es el patrón estándar y confiable para esto -- ya no depende de
-- barajar un array guardado en una variable.
do $$
declare
  v_n integer;
  v_barajados uuid[];
  v_a1 uuid; v_a2 uuid; v_b1 uuid; v_b2 uuid;
  v_partido_id uuid;
  v_sets_a integer[]; v_sets_b integer[];
  v_ganador text;
  v_games_a integer; v_games_b integer;
  v_cancha text;
  i integer;
  s integer;
  v_num_sets integer;
  v_ga integer; v_gb integer;
  v_sa integer; v_sb integer;
  v_ok integer := 0;
begin
  select count(*) into v_n from public.perfiles where nombre ilike '%(demo %' and activo = true;
  if v_n < 4 then
    raise notice 'No hay suficientes jugadores demo (%), se aborta.', v_n;
    return;
  end if;

  -- Limpieza de los datos generados por la corrida anterior (con el bug
  -- de siempre los mismos 4 jugadores), para partir de cero. Solo borra
  -- partidos organizados por un jugador demo -- no toca partidos ad-hoc
  -- reales que hayas probado vos con tu propia cuenta.
  --
  -- El trigger de US-2.4 (no se puede "salir" de un partido con menos de
  -- 1 hora de anticipación) se dispara también con este DELETE de
  -- limpieza porque los partidos están en el pasado -- se desactiva nada
  -- más para este borrado puntual, no queda desactivado después.
  alter table public.partido_jugadores disable trigger trg_validar_cancelacion_confirmado;

  delete from public.resultados_partido
  where partido_id in (
    select id from public.partidos
    where es_adhoc = true and estado = 'jugado'
      and organizador_id in (select id from public.perfiles where nombre ilike '%(demo %')
  );
  delete from public.partido_jugadores
  where partido_id in (
    select id from public.partidos
    where es_adhoc = true and estado = 'jugado'
      and organizador_id in (select id from public.perfiles where nombre ilike '%(demo %')
  );
  delete from public.partidos
  where es_adhoc = true and estado = 'jugado'
    and organizador_id in (select id from public.perfiles where nombre ilike '%(demo %');

  alter table public.partido_jugadores enable trigger trg_validar_cancelacion_confirmado;

  update public.perfiles set puntos_ranking = 0 where nombre ilike '%(demo %';

  for i in 1..40 loop
    begin
      select array_agg(id) into v_barajados
      from (
        select id from public.perfiles
        where nombre ilike '%(demo %' and activo = true
        order by random()
        limit 4
      ) sub;

      v_a1 := v_barajados[1];
      v_a2 := v_barajados[2];
      v_b1 := v_barajados[3];
      v_b2 := v_barajados[4];

      select nombre into v_cancha from public.canchas order by random() limit 1;

      insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado, es_adhoc)
      values (v_a1, now() - (random() * interval '60 days'), coalesce(v_cancha, 'Cancha de prueba'), 4, 'jugado', true)
      returning id into v_partido_id;

      update public.partido_jugadores set equipo = 'A' where partido_id = v_partido_id and jugador_id = v_a1;

      v_num_sets := case when random() < 0.6 then 2 else 3 end;
      v_sets_a := array[]::integer[];
      v_sets_b := array[]::integer[];
      v_games_a := 0;
      v_games_b := 0;

      for s in 1..v_num_sets loop
        if random() < 0.5 then
          v_ga := 6;
          v_gb := (array[0, 1, 2, 3, 4])[1 + floor(random() * 5)::int];
        else
          v_gb := 6;
          v_ga := (array[0, 1, 2, 3, 4])[1 + floor(random() * 5)::int];
        end if;
        v_sets_a := v_sets_a || v_ga;
        v_sets_b := v_sets_b || v_gb;
        v_games_a := v_games_a + v_ga;
        v_games_b := v_games_b + v_gb;
      end loop;

      v_sa := 0;
      v_sb := 0;
      for s in 1..v_num_sets loop
        if v_sets_a[s] > v_sets_b[s] then v_sa := v_sa + 1; else v_sb := v_sb + 1; end if;
      end loop;
      v_ganador := case when v_sa > v_sb then 'A' else 'B' end;

      insert into public.partido_jugadores (partido_id, jugador_id, equipo, estado)
      values
        (v_partido_id, v_a2, 'A', 'confirmado'),
        (v_partido_id, v_b1, 'B', 'confirmado'),
        (v_partido_id, v_b2, 'B', 'confirmado');

      insert into public.resultados_partido (partido_id, estado, finalizado, ganador)
      values (
        v_partido_id,
        jsonb_build_object(
          'setsA', to_jsonb(v_sets_a), 'setsB', to_jsonb(v_sets_b),
          'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
          'historial', '[]'::jsonb, 'pausado', false
        ),
        true,
        v_ganador
      );

      update public.perfiles
      set puntos_ranking = puntos_ranking + v_games_a * 2 + (case when v_ganador = 'A' then 5 else 0 end)
      where id in (v_a1, v_a2);

      update public.perfiles
      set puntos_ranking = puntos_ranking + v_games_b * 2 + (case when v_ganador = 'B' then 5 else 0 end)
      where id in (v_b1, v_b2);

      v_ok := v_ok + 1;
    exception when others then
      raise notice 'Partido % salteado por error: %', i, sqlerrm;
    end;
  end loop;

  raise notice 'Listo: % de 40 partidos ficticios generados.', v_ok;
end $$;

-- ===== sql/019_mi_historial_partidos.sql =====
-- Home (US-5.3): al tocar "Racha" o "% jugados", se muestra el historial
-- de partidos jugados (rival, resultado, gané/perdí) -- a pedido del
-- usuario (2026-09-05). Devuelve todos los partidos finalizados del
-- usuario logueado, más recientes primero.
create or replace function public.mi_historial_partidos()
returns table (
  partido_id uuid,
  fecha_hora timestamptz,
  cancha text,
  gano boolean,
  sets_a jsonb,
  sets_b jsonb,
  mi_equipo text,
  rival_nombres text
)
language plpgsql
security definer
stable
as $$
declare
  v_user uuid := auth.uid();
begin
  return query
  select
    rp.partido_id,
    pa.fecha_hora,
    pa.cancha,
    (rp.ganador = pj.equipo) as gano,
    rp.estado -> 'setsA',
    rp.estado -> 'setsB',
    pj.equipo,
    (
      select string_agg(coalesce(pe.nombre, pj2.invitado_nombre), ' / ')
      from public.partido_jugadores pj2
      left join public.perfiles pe on pe.id = pj2.jugador_id
      where pj2.partido_id = rp.partido_id and pj2.equipo <> pj.equipo
    )
  from public.resultados_partido rp
  join public.partido_jugadores pj on pj.partido_id = rp.partido_id and pj.jugador_id = v_user
  join public.partidos pa on pa.id = rp.partido_id
  where rp.finalizado = true
  order by pa.fecha_hora desc
  limit 50;
end;
$$;

grant execute on function public.mi_historial_partidos() to authenticated;

-- ===== sql/020_ver_perfil_jugador.sql =====
-- Al tocar un jugador en el Directorio (US-3.5), ver su perfil reducido
-- (US-1.4) -- mismos datos que ya se muestran en el listado (nada de
-- teléfono ni otros datos de contacto, eso solo se habilita compartiendo
-- un partido y confirmando, US-2.6).
create or replace function public.ver_perfil_jugador(p_id uuid)
returns table (
  id uuid,
  nombre text,
  avatar_url text,
  nivel integer,
  mano_habil text,
  posicion text,
  sexo text,
  puntos_ranking integer,
  partidos_jugados integer,
  porcentaje_victorias integer
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    pe.id,
    pe.nombre::text,
    pe.avatar_url,
    pe.nivel::integer,
    pe.mano_habil::text,
    pe.posicion::text,
    pe.sexo::text,
    pe.puntos_ranking::integer,
    coalesce(stats.jugados, 0)::integer,
    coalesce(stats.pct, 0)::integer
  from public.perfiles pe
  left join lateral (
    select
      count(*) as jugados,
      round(100.0 * count(*) filter (where rp.ganador = pj.equipo) / nullif(count(*), 0)) as pct
    from public.partido_jugadores pj
    join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
    where pj.jugador_id = pe.id
  ) stats on true
  where pe.id = p_id and pe.activo = true;
end;
$$;

grant execute on function public.ver_perfil_jugador(uuid) to authenticated;

-- ===== sql/021_us2_9_apelaciones.sql =====
-- Épica 2: US-2.9 (apelar y corregir un resultado en disputa).
-- Rol de superusuario: campo real en perfiles (no hardcodeado a una
-- cuenta), pensado para poder sumar más de uno en el futuro.
alter table public.perfiles
  add column es_superusuario boolean not null default false;

-- =========================================================
-- Tabla: apelaciones
-- =========================================================
create table public.apelaciones (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos(id),
  apelante_id uuid not null references public.perfiles(id),
  motivo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'resuelta')),
  resultado_anterior jsonb,
  resultado_nuevo jsonb,
  resuelto_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz
);

grant select, insert on public.apelaciones to authenticated;

alter table public.apelaciones enable row level security;

-- Veo mis propias apelaciones, o todas si soy superusuario.
create policy "Ver apelaciones" on public.apelaciones
  for select to authenticated
  using (
    apelante_id = auth.uid()
    or exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );

-- Apelar: solo un participante real del partido, en nombre propio, y solo
-- si el partido ya tiene un resultado guardado (US-2.9 no tiene plazo
-- límite -- decisión del usuario, 2026-09-05 -- así que no se valida
-- antigüedad acá).
create policy "Apelar mi propio partido" on public.apelaciones
  for insert to authenticated
  with check (
    apelante_id = auth.uid()
    and exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = apelaciones.partido_id and pj.jugador_id = auth.uid()
    )
  );

-- =========================================================
-- Resolver una apelación (solo superusuario): corrige el resultado del
-- partido y recalcula los puntos de ranking (resta lo que se había
-- aplicado con el resultado viejo, aplica lo nuevo) -- resuelve la
-- pregunta abierta de US-2.9 sobre qué pasa con el ranking al corregir.
-- =========================================================
create or replace function public.resolver_apelacion(
  p_apelacion_id uuid,
  p_sets_a integer[],
  p_sets_b integer[],
  p_ganador text
)
returns void
language plpgsql
security definer
as $$
declare
  v_es_super boolean;
  v_partido_id uuid;
  v_estado_anterior jsonb;
  v_ganador_anterior text;
  v_games_a_viejo integer;
  v_games_b_viejo integer;
  v_games_a_nuevo integer;
  v_games_b_nuevo integer;
  v_jugador uuid;
  v_nuevo_estado jsonb;
begin
  select es_superusuario into v_es_super from public.perfiles where id = auth.uid();
  if not coalesce(v_es_super, false) then
    raise exception 'Solo un superusuario puede resolver apelaciones.';
  end if;

  select partido_id into v_partido_id from public.apelaciones where id = p_apelacion_id and estado = 'pendiente';
  if v_partido_id is null then
    raise exception 'Apelación no encontrada o ya resuelta.';
  end if;

  select estado, ganador into v_estado_anterior, v_ganador_anterior
  from public.resultados_partido where partido_id = v_partido_id;

  select coalesce(sum(g::int), 0) into v_games_a_viejo from jsonb_array_elements_text(v_estado_anterior -> 'setsA') as g;
  select coalesce(sum(g::int), 0) into v_games_b_viejo from jsonb_array_elements_text(v_estado_anterior -> 'setsB') as g;

  -- Revierte los puntos que había otorgado el resultado viejo.
  for v_jugador in select jugador_id from public.partido_jugadores where partido_id = v_partido_id and equipo = 'A' loop
    update public.perfiles set puntos_ranking = puntos_ranking - (v_games_a_viejo * 2 + case when v_ganador_anterior = 'A' then 5 else 0 end)
    where id = v_jugador;
  end loop;
  for v_jugador in select jugador_id from public.partido_jugadores where partido_id = v_partido_id and equipo = 'B' loop
    update public.perfiles set puntos_ranking = puntos_ranking - (v_games_b_viejo * 2 + case when v_ganador_anterior = 'B' then 5 else 0 end)
    where id = v_jugador;
  end loop;

  v_games_a_nuevo := (select coalesce(sum(g), 0) from unnest(p_sets_a) as g);
  v_games_b_nuevo := (select coalesce(sum(g), 0) from unnest(p_sets_b) as g);

  v_nuevo_estado := jsonb_build_object(
    'setsA', to_jsonb(p_sets_a), 'setsB', to_jsonb(p_sets_b),
    'puntosA', 0, 'puntosB', 0, 'tiebreak', false, 'saque', 'A',
    'historial', '[]'::jsonb, 'pausado', false
  );

  update public.resultados_partido
  set estado = v_nuevo_estado, finalizado = true, ganador = p_ganador
  where partido_id = v_partido_id;

  -- Aplica los puntos del resultado corregido.
  for v_jugador in select jugador_id from public.partido_jugadores where partido_id = v_partido_id and equipo = 'A' loop
    update public.perfiles set puntos_ranking = puntos_ranking + (v_games_a_nuevo * 2 + case when p_ganador = 'A' then 5 else 0 end)
    where id = v_jugador;
  end loop;
  for v_jugador in select jugador_id from public.partido_jugadores where partido_id = v_partido_id and equipo = 'B' loop
    update public.perfiles set puntos_ranking = puntos_ranking + (v_games_b_nuevo * 2 + case when p_ganador = 'B' then 5 else 0 end)
    where id = v_jugador;
  end loop;

  update public.apelaciones
  set estado = 'resuelta',
      resultado_anterior = jsonb_build_object('estado', v_estado_anterior, 'ganador', v_ganador_anterior),
      resultado_nuevo = jsonb_build_object('estado', v_nuevo_estado, 'ganador', p_ganador),
      resuelto_por = auth.uid(),
      resuelto_en = now()
  where id = p_apelacion_id;
end;
$$;

grant execute on function public.resolver_apelacion(uuid, integer[], integer[], text) to authenticated;

-- =========================================================
-- Listar apelaciones con datos legibles (partido, cancha, rivales) -- para
-- la bandeja del superusuario y "mis apelaciones" del jugador.
-- =========================================================
create or replace function public.listar_apelaciones()
returns table (
  id uuid,
  partido_id uuid,
  cancha text,
  fecha_hora timestamptz,
  motivo text,
  estado text,
  apelante_nombre text,
  creado_en timestamptz,
  ganador_actual text,
  sets_a jsonb,
  sets_b jsonb,
  pareja_a text,
  pareja_b text
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    ap.id,
    ap.partido_id,
    pa.cancha,
    pa.fecha_hora,
    ap.motivo,
    ap.estado,
    pe.nombre::text,
    ap.creado_en,
    rp.ganador,
    rp.estado -> 'setsA',
    rp.estado -> 'setsB',
    (
      select string_agg(coalesce(pe2.nombre, pj.invitado_nombre), ' / ')
      from public.partido_jugadores pj
      left join public.perfiles pe2 on pe2.id = pj.jugador_id
      where pj.partido_id = ap.partido_id and pj.equipo = 'A'
    ),
    (
      select string_agg(coalesce(pe2.nombre, pj.invitado_nombre), ' / ')
      from public.partido_jugadores pj
      left join public.perfiles pe2 on pe2.id = pj.jugador_id
      where pj.partido_id = ap.partido_id and pj.equipo = 'B'
    )
  from public.apelaciones ap
  join public.partidos pa on pa.id = ap.partido_id
  join public.perfiles pe on pe.id = ap.apelante_id
  left join public.resultados_partido rp on rp.partido_id = ap.partido_id
  where ap.apelante_id = auth.uid()
     or exists (select 1 from public.perfiles s where s.id = auth.uid() and s.es_superusuario = true)
  order by ap.creado_en desc;
end;
$$;

grant execute on function public.listar_apelaciones() to authenticated;

-- ===== sql/022_us3_4_notificaciones.sql =====
-- Épica 3: US-3.4 (notificaciones de actividad en mis partidos).
-- Decisiones (2026-09-05, a pedido del usuario, preguntas abiertas de la
-- historia): solo dentro de la app (sin push del navegador); no se avisa
-- a nadie por "partido nuevo creado" (evita spam sin un criterio de
-- relevancia real todavía); sí se guarda historial con leída/no leída.

alter table public.perfiles
  add column if not exists notificaciones_activas boolean not null default true;

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.perfiles(id),
  tipo text not null check (tipo in ('invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado')),
  mensaje text not null,
  partido_id uuid references public.partidos(id),
  leida boolean not null default false,
  creado_en timestamptz not null default now()
);

create index if not exists idx_notificaciones_jugador on public.notificaciones(jugador_id, creado_en desc);

grant select, update on public.notificaciones to authenticated;

alter table public.notificaciones enable row level security;

drop policy if exists "Ver mis notificaciones" on public.notificaciones;
create policy "Ver mis notificaciones" on public.notificaciones
  for select to authenticated
  using (jugador_id = auth.uid());

-- Solo puedo tocar `leida` de mis propias notificaciones.
drop policy if exists "Marcar mis notificaciones como leídas" on public.notificaciones;
create policy "Marcar mis notificaciones como leídas" on public.notificaciones
  for update to authenticated
  using (jugador_id = auth.uid())
  with check (jugador_id = auth.uid());

-- =========================================================
-- Avisar al organizador cuando responden su invitación.
-- =========================================================
create or replace function public.notificar_respuesta_invitacion()
returns trigger
language plpgsql
security definer
as $$
declare
  v_organizador uuid;
  v_notif_activas boolean;
  v_nombre_jugador text;
  v_cancha text;
begin
  select p.organizador_id, p.cancha into v_organizador, v_cancha
  from public.partidos p where p.id = coalesce(new.partido_id, old.partido_id);

  select notificaciones_activas into v_notif_activas from public.perfiles where id = v_organizador;
  if not coalesce(v_notif_activas, true) or v_organizador is null then
    return coalesce(new, old);
  end if;

  select nombre into v_nombre_jugador from public.perfiles where id = coalesce(new.jugador_id, old.jugador_id);

  if tg_op = 'UPDATE' and old.estado = 'invitado' and new.estado = 'anotado' then
    insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
    values (v_organizador, 'invitacion_aceptada', coalesce(v_nombre_jugador, 'Un jugador') || ' aceptó tu invitación a ' || v_cancha || '.', new.partido_id);
  elsif tg_op = 'DELETE' and old.estado = 'invitado' then
    insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
    values (v_organizador, 'invitacion_rechazada', coalesce(v_nombre_jugador, 'Un jugador') || ' rechazó tu invitación a ' || v_cancha || '.', old.partido_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_notificar_respuesta_invitacion on public.partido_jugadores;

create trigger trg_notificar_respuesta_invitacion
after update or delete on public.partido_jugadores
for each row execute function public.notificar_respuesta_invitacion();

-- =========================================================
-- Avisar a los participantes cuando el organizador cancela el partido.
-- =========================================================
create or replace function public.notificar_partido_cancelado()
returns trigger
language plpgsql
security definer
as $$
declare
  v_jugador record;
begin
  if old.estado <> 'cancelado' and new.estado = 'cancelado' then
    for v_jugador in
      select pj.jugador_id
      from public.partido_jugadores pj
      where pj.partido_id = new.id
        and pj.jugador_id is not null
        and pj.jugador_id <> new.organizador_id
        and pj.estado in ('anotado', 'confirmado')
    loop
      if coalesce((select notificaciones_activas from public.perfiles where id = v_jugador.jugador_id), true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (v_jugador.jugador_id, 'partido_cancelado', 'Se canceló el partido en ' || new.cancha || '.', new.id);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notificar_partido_cancelado on public.partidos;

create trigger trg_notificar_partido_cancelado
after update on public.partidos
for each row execute function public.notificar_partido_cancelado();

-- =========================================================
-- Listar mis notificaciones (más recientes primero).
-- =========================================================
create or replace function public.listar_notificaciones()
returns table (
  id uuid,
  tipo text,
  mensaje text,
  partido_id uuid,
  leida boolean,
  creado_en timestamptz
)
language sql
security definer
stable
as $$
  select id, tipo, mensaje, partido_id, leida, creado_en
  from public.notificaciones
  where jugador_id = auth.uid()
  order by creado_en desc
  limit 50;
$$;

grant execute on function public.listar_notificaciones() to authenticated;

create or replace function public.marcar_todas_notificaciones_leidas()
returns void
language sql
security definer
as $$
  update public.notificaciones set leida = true where jugador_id = auth.uid() and leida = false;
$$;

grant execute on function public.marcar_todas_notificaciones_leidas() to authenticated;

-- ===== sql/023_us4_1_us4_2_detalle_canchas.sql =====
-- Épica 4: US-4.1 (listado) y US-4.2 (detalle) del Directorio de Canchas.
-- `descripcion` y `valores` quedan nullable a propósito: son datos reales
-- de negocios reales investigados por fuera (ver semilla-canchas-epica4.md)
-- -- no corresponde inventarles descripción/precio ficticios. La UI
-- muestra un fallback ("Consultar valores") cuando no hay dato cargado.
alter table public.canchas
  add column if not exists descripcion text,
  add column if not exists valores text;

-- Lectura de una sola cancha por id (US-4.2) -- la política "Ver canchas"
-- ya cubre esto (using true), no hace falta una función aparte.

-- ===== sql/024_fix_bug009_columnas_sensibles_perfiles.sql =====
-- BUG-009 (crítico, encontrado en la pasada de QA de la Épica 3, 2026-09-06):
-- la política RLS "Actualizar mi perfil" (Épica 1) es solo a nivel de FILA
-- (id = auth.uid()), sin restricción de COLUMNA -- cualquier usuario
-- logueado podía hacer un PATCH directo a /rest/v1/perfiles y modificar
-- sus propios `puntos_ranking` o, más grave, auto-otorgarse
-- `es_superusuario = true`, saltándose por completo la autorización de
-- US-2.9 (apelaciones).
--
-- Fix: en vez de agregar más lógica PL/pgSQL, se usa el sistema de
-- privilegios por columna de Postgres -- revocar el UPDATE genérico y
-- otorgarlo de nuevo solo sobre las columnas que un jugador legítimamente
-- edita por su cuenta. Los triggers/funciones SECURITY DEFINER (el
-- trigger de resultado de partido, resolver_apelacion, etc.) no se ven
-- afectados por esto: corren con los permisos del dueño de la función,
-- no con los del rol `authenticated` que hace el request.
revoke update on public.perfiles from authenticated;

grant update (
  nombre, telefono, sexo, zona, nivel, mano_habil, posicion, provincia,
  avatar_url, notificaciones_activas, activo, dado_de_baja_en
) on public.perfiles to authenticated;

-- `puntos_ranking`, `es_superusuario`, `id`, `created_at`, `updated_at`
-- quedan fuera de la lista a propósito: no son campos que un jugador
-- deba poder tocar directamente nunca.

-- ===== sql/025_fix_bug013_stats_directorio_jugadores.sql =====
-- BUG-013 (encontrado en la pasada de responsive/QA, 2026-09-06): el
-- Directorio de jugadores mostraba "Sin partidos jugados" para TODOS los
-- jugadores, incluso los que sí tienen historial real (ej. las cuentas
-- demo con partidos ya jugados) -- `DirectorioJugadoresForm.js` lee
-- `j.partidos_jugados`/`j.porcentaje_victorias`, pero
-- `listar_directorio_jugadores` nunca los devolvía (se ve que quedaron
-- pendientes de una sesión anterior). `ver_perfil_jugador` (perfil
-- reducido de un jugador, al que se llega tocando una fila del
-- directorio) sí los calcula correctamente -- se reutiliza exactamente
-- el mismo patrón acá.
drop function if exists public.listar_directorio_jugadores(text, integer, text);

create or replace function public.listar_directorio_jugadores(
  p_nombre text default null,
  p_nivel integer default null,
  p_sexo text default null
)
returns table (
  id uuid,
  nombre text,
  nivel integer,
  mano_habil text,
  posicion text,
  sexo text,
  puntos_ranking integer,
  partidos_jugados integer,
  porcentaje_victorias integer
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    pe.id,
    pe.nombre::text,
    pe.nivel::integer,
    pe.mano_habil::text,
    pe.posicion::text,
    pe.sexo::text,
    pe.puntos_ranking::integer,
    coalesce(stats.jugados, 0)::integer,
    coalesce(stats.pct, 0)::integer
  from public.perfiles pe
  left join lateral (
    select
      count(*) as jugados,
      round(100.0 * count(*) filter (where rp.ganador = pj.equipo) / nullif(count(*), 0)) as pct
    from public.partido_jugadores pj
    join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
    where pj.jugador_id = pe.id
  ) stats on true
  where pe.activo = true
    and pe.id <> auth.uid()
    and (p_nombre is null or pe.nombre ilike '%' || p_nombre || '%')
    and (p_nivel is null or pe.nivel = p_nivel)
    and (p_sexo is null or pe.sexo::text = p_sexo)
  order by pe.puntos_ranking desc, pe.nombre asc
  limit 200;
end;
$$;

grant execute on function public.listar_directorio_jugadores(text, integer, text) to authenticated;

-- ===== sql/026_epica6_gestion_avanzada_partidos.sql =====
-- Épica 6: Gestión Avanzada de Partidos (post-MVP).
-- US-6.3: rango de nivel opcional al crear un partido (informativo, no
-- bloqueante -- decisión del usuario, 2026-09-06).
alter table public.partidos
  add column if not exists nivel_min integer check (nivel_min between 1 and 7),
  add column if not exists nivel_max integer check (nivel_max between 1 and 7);

-- US-6.4: lista de espera -- nuevo estado de partido_jugadores que NO
-- ocupa cupo (lugares_ocupados solo cuenta 'anotado'/'confirmado', ver
-- 005_us2_2_listado_y_cupo.sql, así que 'en_espera' queda afuera de ese
-- conteo sin tocar esa lógica).
alter table public.partido_jugadores
  drop constraint if exists partido_jugadores_estado_check;

alter table public.partido_jugadores
  add constraint partido_jugadores_estado_check
  check (estado in ('invitado', 'anotado', 'confirmado', 'rechazado', 'en_espera'));

-- Evita re-notificar a la misma persona de la lista de espera muchas
-- veces si el trigger de recálculo corre de nuevo antes de que confirme.
alter table public.partido_jugadores
  add column if not exists avisado_lista_espera boolean not null default false;

-- US-6.5: no-show -- marcado por el organizador, solo informativo (no
-- afecta ranking ni bloquea nada, decisión del usuario 2026-09-06).
alter table public.partido_jugadores
  add column if not exists no_show boolean not null default false;

-- Sumar 'lugar_disponible' a los tipos de notificación válidos (US-3.4).
alter table public.notificaciones
  drop constraint if exists notificaciones_tipo_check;

alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in ('invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado', 'lugar_disponible'));

-- Extiende el trigger de recálculo de cupo/estado (ya existente) para
-- avisar al primero de la lista de espera cuando se libera un lugar.
create or replace function public.recalcular_estado_partido()
returns trigger as $$
declare
  v_partido_id uuid := coalesce(new.partido_id, old.partido_id);
  v_cantidad integer;
  v_estado_actual text;
  v_confirmados integer;
  v_ocupados integer;
  v_en_espera record;
  v_notif_activas boolean;
begin
  select cantidad_jugadores, estado into v_cantidad, v_estado_actual
  from public.partidos where id = v_partido_id;

  select count(*) into v_confirmados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado = 'confirmado';

  select count(*) into v_ocupados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado in ('anotado', 'confirmado');

  update public.partidos set lugares_ocupados = v_ocupados where id = v_partido_id;

  if v_estado_actual = 'abierto' and v_confirmados >= v_cantidad then
    update public.partidos set estado = 'completo' where id = v_partido_id;
  elsif v_estado_actual = 'completo' and v_confirmados < v_cantidad then
    update public.partidos set estado = 'abierto' where id = v_partido_id;
  end if;

  -- US-6.4: si hay lugar y alguien en la lista de espera sin avisar
  -- todavía, le avisamos (uno solo, el más antiguo).
  if v_ocupados < v_cantidad then
    select * into v_en_espera
    from public.partido_jugadores
    where partido_id = v_partido_id and estado = 'en_espera' and avisado_lista_espera = false
    order by created_at asc
    limit 1;

    if v_en_espera.id is not null then
      select coalesce(notificaciones_activas, true) into v_notif_activas
      from public.perfiles where id = v_en_espera.jugador_id;

      if coalesce(v_notif_activas, true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (v_en_espera.jugador_id, 'lugar_disponible', 'Se liberó un lugar en un partido de tu lista de espera. Confirmá tu lugar antes de que se lo lleve otro.', v_partido_id);
      end if;

      update public.partido_jugadores set avisado_lista_espera = true where id = v_en_espera.id;
    end if;
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- US-6.5: sumar `no_show` al plantel que ya muestra el detalle de
-- partido (US-2.6), para que el organizador pueda marcarlo/desmarcarlo.
drop function if exists public.ver_participantes_partido(uuid);

create or replace function public.ver_participantes_partido(p_partido_id uuid)
returns table (
  jugador_id uuid,
  nombre text,
  nivel integer,
  mano_habil text,
  posicion text,
  estado text,
  telefono text,
  no_show boolean
)
language plpgsql
security definer
stable
as $$
begin
  if not exists (
    select 1 from public.partido_jugadores pj
    where pj.partido_id = p_partido_id and pj.jugador_id = auth.uid()
  ) and not exists (
    select 1 from public.partidos pa
    where pa.id = p_partido_id and pa.organizador_id = auth.uid()
  ) then
    return;
  end if;

  return query
  select
    pe.id,
    pe.nombre,
    pe.nivel::integer,
    pe.mano_habil,
    pe.posicion,
    pj.estado,
    case when pj.estado = 'confirmado' then pe.telefono else null end,
    pj.no_show
  from public.partido_jugadores pj
  join public.perfiles pe on pe.id = pj.jugador_id
  where pj.partido_id = p_partido_id
  order by (pj.estado = 'confirmado') desc, pe.nombre asc;
end;
$$;

grant execute on function public.ver_participantes_partido(uuid) to authenticated;

-- US-6.5: el organizador necesita poder tocar la fila de OTRO jugador
-- (marcar no-show) -- la política existente ("Actualizar mi propia
-- participación") solo permite tocar la fila propia.
drop policy if exists "Organizador marca no-show" on public.partido_jugadores;

create policy "Organizador marca no-show" on public.partido_jugadores
  for update to authenticated
  using (
    exists (
      select 1 from public.partidos pa
      where pa.id = partido_jugadores.partido_id and pa.organizador_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.partidos pa
      where pa.id = partido_jugadores.partido_id and pa.organizador_id = auth.uid()
    )
  );

-- ===== sql/027_us6_7_compartir_partido.sql =====
-- US-6.7: vista pública mínima de un partido (para compartir por link a
-- alguien sin cuenta todavía). Sin teléfono ni nombres de participantes
-- -- eso sigue protegido por US-2.6, esta vista es deliberadamente más
-- chica que ver_participantes_partido.
create or replace function public.ver_partido_publico(p_id uuid)
returns table (
  id uuid,
  fecha_hora timestamptz,
  cancha text,
  cantidad_jugadores integer,
  lugares_ocupados integer,
  estado text
)
language sql
security definer
stable
as $$
  select id, fecha_hora, cancha, cantidad_jugadores, lugares_ocupados, estado
  from public.partidos
  where id = p_id;
$$;

-- A propósito para `anon` además de `authenticated`: alguien sin sesión
-- tiene que poder ver esto al abrir el link compartido.
grant execute on function public.ver_partido_publico(uuid) to anon, authenticated;

-- ===== sql/028_whatsapp_opcional.sql =====
-- A pedido del usuario (2026-09-06): el botón de WhatsApp que aparece
-- junto al teléfono de un jugador confirmado (US-2.6) es riesgoso si es
-- automático -- WhatsApp expone foto de perfil, estado, "en línea", etc.
-- a cualquier confirmado de un partido compartido. Pasa a ser opt-in,
-- por defecto DESACTIVADO (el más privado de los dos defaults posibles).
-- El teléfono en sí sigue visible bajo la misma regla de siempre
-- (confirmado = sí, no confirmado = no) -- esto solo gatea el botón.
alter table public.perfiles
  add column if not exists mostrar_whatsapp boolean not null default false;

-- Sumarlo a las columnas editables por el propio jugador (ver BUG-009,
-- 024_fix_bug009_columnas_sensibles_perfiles.sql -- el UPDATE de
-- `perfiles` está restringido por columna, si no se agrega acá el
-- toggle del perfil fallaría con 403).
grant update (mostrar_whatsapp) on public.perfiles to authenticated;

drop function if exists public.ver_participantes_partido(uuid);

create or replace function public.ver_participantes_partido(p_partido_id uuid)
returns table (
  jugador_id uuid,
  nombre text,
  nivel integer,
  mano_habil text,
  posicion text,
  estado text,
  telefono text,
  no_show boolean,
  mostrar_whatsapp boolean
)
language plpgsql
security definer
stable
as $$
begin
  if not exists (
    select 1 from public.partido_jugadores pj
    where pj.partido_id = p_partido_id and pj.jugador_id = auth.uid()
  ) and not exists (
    select 1 from public.partidos pa
    where pa.id = p_partido_id and pa.organizador_id = auth.uid()
  ) then
    return;
  end if;

  return query
  select
    pe.id,
    pe.nombre,
    pe.nivel::integer,
    pe.mano_habil,
    pe.posicion,
    pj.estado,
    case when pj.estado = 'confirmado' then pe.telefono else null end,
    pj.no_show,
    pe.mostrar_whatsapp
  from public.partido_jugadores pj
  join public.perfiles pe on pe.id = pj.jugador_id
  where pj.partido_id = p_partido_id
  order by (pj.estado = 'confirmado') desc, pe.nombre asc;
end;
$$;

grant execute on function public.ver_participantes_partido(uuid) to authenticated;

-- ===== sql/029_epica7_us7_1_us7_2_us7_3.sql =====
-- Épica 7: Comunidad entre Jugadores (post-MVP).
-- US-7.1: jugadores frecuentes.
create table public.jugadores_frecuentes (
  jugador_id uuid not null references public.perfiles(id),
  frecuente_id uuid not null references public.perfiles(id),
  created_at timestamptz not null default now(),
  primary key (jugador_id, frecuente_id),
  check (jugador_id <> frecuente_id)
);

grant select, insert, delete on public.jugadores_frecuentes to authenticated;

alter table public.jugadores_frecuentes enable row level security;

create policy "Ver mis frecuentes" on public.jugadores_frecuentes
  for select to authenticated
  using (jugador_id = auth.uid());

create policy "Marcar un frecuente" on public.jugadores_frecuentes
  for insert to authenticated
  with check (jugador_id = auth.uid());

create policy "Desmarcar un frecuente" on public.jugadores_frecuentes
  for delete to authenticated
  using (jugador_id = auth.uid());

-- Lista mis frecuentes con nombre, para priorizarlos en el buscador de
-- invitación (US-2.3/US-3.5).
create or replace function public.listar_mis_frecuentes()
returns table (id uuid, nombre text)
language sql
security definer
stable
as $$
  select pe.id, pe.nombre
  from public.jugadores_frecuentes jf
  join public.perfiles pe on pe.id = jf.frecuente_id
  where jf.jugador_id = auth.uid() and pe.activo = true
  order by pe.nombre asc;
$$;

grant execute on function public.listar_mis_frecuentes() to authenticated;

-- US-7.2 (historial entre jugadores) + US-7.3 (compatibilidad de duplas):
-- se agregan al mismo RPC que ya arma el perfil reducido de un jugador
-- (US-1.4/US-3.5), relativos a quien está mirando (auth.uid()).
drop function if exists public.ver_perfil_jugador(uuid);

create or replace function public.ver_perfil_jugador(p_id uuid)
returns table (
  id uuid,
  nombre text,
  avatar_url text,
  nivel integer,
  mano_habil text,
  posicion text,
  sexo text,
  puntos_ranking integer,
  partidos_jugados integer,
  porcentaje_victorias integer,
  es_frecuente boolean,
  veces_con integer,
  veces_contra integer,
  compatibilidad_pct integer
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    pe.id,
    pe.nombre::text,
    pe.avatar_url,
    pe.nivel::integer,
    pe.mano_habil::text,
    pe.posicion::text,
    pe.sexo::text,
    pe.puntos_ranking::integer,
    coalesce(stats.jugados, 0)::integer,
    coalesce(stats.pct, 0)::integer,
    exists (
      select 1 from public.jugadores_frecuentes jf
      where jf.jugador_id = auth.uid() and jf.frecuente_id = p_id
    ),
    coalesce(rel.veces_con, 0)::integer,
    coalesce(rel.veces_contra, 0)::integer,
    -- Solo se muestra si jugaron al menos 2 partidos juntos -- ver
    -- pregunta abierta de US-7.3 resuelta así (evita un "100%" con un
    -- solo partido de muestra).
    case when coalesce(rel.veces_con, 0) >= 2 then rel.compat_pct::integer else null end
  from public.perfiles pe
  left join lateral (
    select
      count(*) as jugados,
      round(100.0 * count(*) filter (where rp.ganador = pj.equipo) / nullif(count(*), 0)) as pct
    from public.partido_jugadores pj
    join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
    where pj.jugador_id = pe.id
  ) stats on true
  left join lateral (
    select
      count(*) filter (where pj_yo.equipo = pj_el.equipo) as veces_con,
      count(*) filter (where pj_yo.equipo <> pj_el.equipo) as veces_contra,
      round(100.0 * count(*) filter (where pj_yo.equipo = pj_el.equipo and rp.ganador = pj_yo.equipo)
        / nullif(count(*) filter (where pj_yo.equipo = pj_el.equipo), 0)) as compat_pct
    from public.partido_jugadores pj_yo
    join public.partido_jugadores pj_el
      on pj_el.partido_id = pj_yo.partido_id and pj_el.jugador_id = pe.id
    join public.resultados_partido rp on rp.partido_id = pj_yo.partido_id and rp.finalizado = true
    where pj_yo.jugador_id = auth.uid()
  ) rel on true
  where pe.id = p_id and pe.activo = true;
end;
$$;

grant execute on function public.ver_perfil_jugador(uuid) to authenticated;

-- ===== sql/030_us7_4_mensajeria.sql =====
-- Épica 7: US-7.4 (mensajería directa entre jugadores).
-- Decisiones (2026-09-06, a pedido del usuario): tiempo real vía Supabase
-- Realtime (mismo patrón que el marcador en vivo, US-2.7); moderación
-- básica -- un reporte solo queda registrado para que el superusuario
-- (rol de US-2.9) lo revise, sin ningún bloqueo automático.

create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  remitente_id uuid not null references public.perfiles(id),
  destinatario_id uuid not null references public.perfiles(id),
  contenido text not null check (char_length(contenido) between 1 and 1000),
  leido boolean not null default false,
  creado_en timestamptz not null default now(),
  check (remitente_id <> destinatario_id)
);

create index idx_mensajes_conversacion on public.mensajes (least(remitente_id, destinatario_id), greatest(remitente_id, destinatario_id), creado_en);

grant select, insert, update (leido) on public.mensajes to authenticated;

alter table public.mensajes enable row level security;

create policy "Ver mis mensajes" on public.mensajes
  for select to authenticated
  using (remitente_id = auth.uid() or destinatario_id = auth.uid());

create policy "Enviar un mensaje" on public.mensajes
  for insert to authenticated
  with check (remitente_id = auth.uid());

-- Solo puedo marcar como leído un mensaje que ME llegó a mí.
create policy "Marcar un mensaje como leído" on public.mensajes
  for update to authenticated
  using (destinatario_id = auth.uid())
  with check (destinatario_id = auth.uid());

-- IMPORTANTE (paso manual fuera de SQL): en el dashboard de Supabase, ir
-- a Database → Replication y habilitar la tabla `mensajes` para que
-- Realtime pueda notificar mensajes nuevos en vivo (mismo paso que ya se
-- pidió para `resultados_partido` en US-2.7).

-- Sumar 'mensaje_nuevo' a los tipos de notificación válidos (US-3.4).
alter table public.notificaciones
  drop constraint if exists notificaciones_tipo_check;

alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in ('invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado', 'lugar_disponible', 'mensaje_nuevo'));

-- Enviar un mensaje: valida longitud/remitente vía RLS de la tabla, y de
-- paso genera la notificación al destinatario (mismo mecanismo que ya
-- usa el resto de US-3.4).
create or replace function public.enviar_mensaje(p_destinatario_id uuid, p_contenido text)
returns void
language plpgsql
security definer
as $$
declare
  v_remitente_nombre text;
  v_notif_activas boolean;
begin
  insert into public.mensajes (remitente_id, destinatario_id, contenido)
  values (auth.uid(), p_destinatario_id, p_contenido);

  select coalesce(notificaciones_activas, true) into v_notif_activas
  from public.perfiles where id = p_destinatario_id;

  if coalesce(v_notif_activas, true) then
    select nombre into v_remitente_nombre from public.perfiles where id = auth.uid();
    insert into public.notificaciones (jugador_id, tipo, mensaje)
    values (p_destinatario_id, 'mensaje_nuevo', coalesce(v_remitente_nombre, 'Un jugador') || ' te envió un mensaje.');
  end if;
end;
$$;

grant execute on function public.enviar_mensaje(uuid, text) to authenticated;

-- Marca como leídos todos los mensajes de una conversación puntual.
create or replace function public.marcar_conversacion_leida(p_otro_id uuid)
returns void
language sql
security definer
as $$
  update public.mensajes
  set leido = true
  where remitente_id = p_otro_id and destinatario_id = auth.uid() and leido = false;
$$;

grant execute on function public.marcar_conversacion_leida(uuid) to authenticated;

-- Lista de conversaciones (una fila por persona con la que hablé), con
-- último mensaje y cantidad de no leídos -- para la bandeja de "Mensajes".
create or replace function public.listar_conversaciones()
returns table (
  jugador_id uuid,
  nombre text,
  avatar_url text,
  ultimo_mensaje text,
  ultimo_mensaje_en timestamptz,
  no_leidos integer
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    otro.id,
    otro.nombre,
    otro.avatar_url,
    ultimo.contenido,
    ultimo.creado_en,
    coalesce(nl.cnt, 0)::integer
  from (
    select distinct
      case when remitente_id = auth.uid() then destinatario_id else remitente_id end as otro_id
    from public.mensajes
    where remitente_id = auth.uid() or destinatario_id = auth.uid()
  ) pares
  join public.perfiles otro on otro.id = pares.otro_id
  left join lateral (
    select contenido, creado_en
    from public.mensajes m
    where (m.remitente_id = auth.uid() and m.destinatario_id = otro.id)
       or (m.remitente_id = otro.id and m.destinatario_id = auth.uid())
    order by creado_en desc
    limit 1
  ) ultimo on true
  left join lateral (
    select count(*) as cnt
    from public.mensajes m
    where m.remitente_id = otro.id and m.destinatario_id = auth.uid() and m.leido = false
  ) nl on true
  order by ultimo.creado_en desc nulls last;
end;
$$;

grant execute on function public.listar_conversaciones() to authenticated;

-- =========================================================
-- Moderación básica (solo registro, sin bloqueo automático).
-- =========================================================
create table public.reportes_mensajes (
  id uuid primary key default gen_random_uuid(),
  reportado_por uuid not null references public.perfiles(id),
  reportado_id uuid not null references public.perfiles(id),
  motivo text not null,
  creado_en timestamptz not null default now()
);

grant select, insert on public.reportes_mensajes to authenticated;

alter table public.reportes_mensajes enable row level security;

create policy "Crear un reporte" on public.reportes_mensajes
  for insert to authenticated
  with check (reportado_por = auth.uid());

-- El superusuario (rol de US-2.9) es quien revisa los reportes.
create policy "Superusuario ve los reportes" on public.reportes_mensajes
  for select to authenticated
  using (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );

-- ===== sql/031_fix_reportes_mensajes_policy.sql =====
-- Reaplica las políticas de reportes_mensajes por si no quedaron
-- aplicadas correctamente en 030_us7_4_mensajeria.sql.
drop policy if exists "Crear un reporte" on public.reportes_mensajes;
drop policy if exists "Superusuario ve los reportes" on public.reportes_mensajes;

create policy "Crear un reporte" on public.reportes_mensajes
  for insert to authenticated
  with check (reportado_por = auth.uid());

create policy "Superusuario ve los reportes" on public.reportes_mensajes
  for select to authenticated
  using (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );

-- ===== sql/032_epica9_canchas.sql =====
-- Épica 9: Mejoras al Directorio de Canchas (post-MVP).
-- US-9.1: reseñas y puntuación de canchas.
create table public.resenas_canchas (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid not null references public.canchas(id),
  jugador_id uuid not null references public.perfiles(id),
  puntuacion integer not null check (puntuacion between 1 and 5),
  comentario text,
  creado_en timestamptz not null default now(),
  unique (cancha_id, jugador_id)
);

grant select, insert on public.resenas_canchas to authenticated;

alter table public.resenas_canchas enable row level security;

create policy "Ver reseñas" on public.resenas_canchas
  for select to authenticated
  using (true);

-- Solo puedo reseñar una cancha donde jugué un partido con resultado
-- guardado -- el match cancha del partido <-> cancha del directorio es
-- por nombre exacto, mismo criterio heurístico que ya resolvió BUG-012
-- (US-4.3), porque `partidos.cancha` siempre fue texto libre.
create policy "Dejar mi reseña" on public.resenas_canchas
  for insert to authenticated
  with check (
    jugador_id = auth.uid()
    and exists (
      select 1
      from public.partido_jugadores pj
      join public.partidos pa on pa.id = pj.partido_id
      join public.resultados_partido rp on rp.partido_id = pa.id and rp.finalizado = true
      join public.canchas c on c.nombre = pa.cancha
      where pj.jugador_id = auth.uid() and c.id = resenas_canchas.cancha_id
    )
  );

-- Lista de reseñas de una cancha con el nombre de quien la dejó -- vía
-- RPC porque `perfiles` solo se puede leer directo para el propio (RLS,
-- Épica 1).
create or replace function public.listar_resenas_cancha(p_cancha_id uuid)
returns table (nombre text, puntuacion integer, comentario text, creado_en timestamptz)
language sql
security definer
stable
as $$
  select pe.nombre, r.puntuacion, r.comentario, r.creado_en
  from public.resenas_canchas r
  join public.perfiles pe on pe.id = r.jugador_id
  where r.cancha_id = p_cancha_id
  order by r.creado_en desc;
$$;

grant execute on function public.listar_resenas_cancha(uuid) to authenticated;

-- =========================================================
-- US-9.2: panel de administración de canchas (solo superusuario, mismo
-- rol de US-2.9 -- no es un rol nuevo).
-- =========================================================
grant insert, update on public.canchas to authenticated;

create policy "Superusuario crea canchas" on public.canchas
  for insert to authenticated
  with check (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );

create policy "Superusuario edita canchas" on public.canchas
  for update to authenticated
  using (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  )
  with check (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );

-- ===== sql/033_epica10_us10_1_gastos.sql =====
-- Épica 10: Economía del Partido (post-MVP).
-- US-10.1: calculadora de gastos -- solo informativa, no procesa pagos
-- reales (decisión explícita del usuario, 2026-09-06).
alter table public.partidos
  add column if not exists costo_cancha numeric;

-- El organizador es quien carga el costo (mismo criterio que "Cancelar
-- partido", solo el dueño del partido lo toca); ver/calcular el
-- desglose es para todos los participantes vía RLS de select ya
-- existente ("Ver partidos", using(true)).
create policy "Organizador carga el costo de cancha" on public.partidos
  for update to authenticated
  using (organizador_id = auth.uid())
  with check (organizador_id = auth.uid());

-- ===== sql/034_us10_1_gastos_v2_splitwise.sql =====
-- US-10.1 (rediseño, 2026-09-06, a pedido del usuario): en vez de un solo
-- costo total dividido en partes iguales, se carga cuánto gastó cada
-- persona (nombre libre, sin vincularlo a una cuenta real ni tablas
-- nuevas -- decisión explícita del usuario, "no es necesario crear una
-- conexión entre jugadores") y se calculan los saldos: quién le debe a
-- quién y cuánto. Reemplaza el costo único de la versión anterior.
alter table public.partidos
  add column if not exists gastos jsonb;

-- No hace falta una política nueva: "Organizador carga el costo de
-- cancha" (033) ya permite al organizador actualizar cualquier columna
-- de su propio partido, `gastos` incluida.

-- ===== sql/035_us10_1_notificar_saldos.sql =====
-- US-10.1 (extensión, 2026-09-06, a pedido del usuario): si un gasto
-- quedó vinculado a una cuenta real (buscar_jugadores, mismo patrón que
-- US-2.8), se le notifica su saldo neto ("te deben $X" / "debés $X") al
-- guardar los gastos -- no el detalle de a quién le paga cada quién
-- (eso ya se ve en la propia pantalla), solo su saldo personal.
alter table public.notificaciones
  drop constraint if exists notificaciones_tipo_check;

alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in (
    'invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado',
    'lugar_disponible', 'mensaje_nuevo', 'saldo_gastos'
  ));

create or replace function public.guardar_gastos_y_notificar(p_partido_id uuid, p_gastos jsonb)
returns void
language plpgsql
security definer
as $$
declare
  v_organizador uuid;
  v_cancha text;
  v_total numeric := 0;
  v_cantidad integer;
  v_parte numeric;
  v_item jsonb;
  v_jugador_id uuid;
  v_monto numeric;
  v_saldo numeric;
  v_notif_activas boolean;
begin
  select organizador_id, cancha into v_organizador, v_cancha
  from public.partidos where id = p_partido_id;

  if v_organizador is distinct from auth.uid() then
    raise exception 'Solo el organizador puede cargar los gastos.';
  end if;

  update public.partidos set gastos = p_gastos where id = p_partido_id;

  v_cantidad := jsonb_array_length(p_gastos);
  if v_cantidad = 0 then
    return;
  end if;

  select sum((item->>'monto')::numeric) into v_total from jsonb_array_elements(p_gastos) as item;
  v_parte := v_total / v_cantidad;

  for v_item in select * from jsonb_array_elements(p_gastos)
  loop
    v_jugador_id := nullif(v_item->>'jugador_id', '')::uuid;
    v_monto := coalesce((v_item->>'monto')::numeric, 0);
    v_saldo := v_monto - v_parte;

    if v_jugador_id is not null and abs(v_saldo) > 0.01 then
      select coalesce(notificaciones_activas, true) into v_notif_activas
      from public.perfiles where id = v_jugador_id;

      if coalesce(v_notif_activas, true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (
          v_jugador_id,
          'saldo_gastos',
          case
            when v_saldo > 0 then 'Te deben $' || round(v_saldo) || ' de los gastos del partido en ' || v_cancha || '.'
            else 'Debés $' || round(abs(v_saldo)) || ' de los gastos del partido en ' || v_cancha || '.'
          end,
          p_partido_id
        );
      end if;
    end if;
  end loop;
end;
$$;

grant execute on function public.guardar_gastos_y_notificar(uuid, jsonb) to authenticated;

-- ===== sql/036_feedback_app.sql =====
-- Espacio de comentarios/feedback general de la app (a pedido del
-- usuario, 2026-09-06) -- no es una historia de usuario formal, es un
-- canal simple para que cualquier jugador deje una sugerencia o
-- comentario libre. Solo el superusuario lo revisa (mismo patrón que
-- reportes_mensajes, US-7.4).
create table public.feedback_app (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.perfiles(id),
  comentario text not null check (char_length(comentario) between 1 and 1000),
  creado_en timestamptz not null default now()
);

grant select, insert on public.feedback_app to authenticated;

alter table public.feedback_app enable row level security;

create policy "Dejar mi comentario" on public.feedback_app
  for insert to authenticated
  with check (jugador_id = auth.uid());

create policy "Superusuario ve el feedback" on public.feedback_app
  for select to authenticated
  using (
    exists (select 1 from public.perfiles pe where pe.id = auth.uid() and pe.es_superusuario = true)
  );

-- ===== sql/037_epica8_matchmaking.sql =====
-- Épica 8: Matchmaking Proactivo (post-MVP, última épica del backlog).
-- =========================================================
-- US-8.1: disponibilidad habitual + sugerencias de grupo
-- =========================================================
create table public.disponibilidad_habitual (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.perfiles(id),
  dia_semana text not null check (dia_semana in ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')),
  franja text not null check (franja in ('manana','tarde','noche')),
  created_at timestamptz not null default now(),
  unique (jugador_id, dia_semana, franja)
);

grant select, insert, delete on public.disponibilidad_habitual to authenticated;
alter table public.disponibilidad_habitual enable row level security;

create policy "Ver mi disponibilidad" on public.disponibilidad_habitual
  for select to authenticated using (jugador_id = auth.uid());
create policy "Cargar mi disponibilidad" on public.disponibilidad_habitual
  for insert to authenticated with check (jugador_id = auth.uid());
create policy "Borrar mi disponibilidad" on public.disponibilidad_habitual
  for delete to authenticated using (jugador_id = auth.uid());

create table public.grupos_sugeridos (
  id uuid primary key default gen_random_uuid(),
  dia_semana text not null,
  franja text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'concretado', 'roto')),
  partido_id uuid references public.partidos(id),
  creado_en timestamptz not null default now()
);

create table public.grupos_sugeridos_jugadores (
  grupo_id uuid not null references public.grupos_sugeridos(id),
  jugador_id uuid not null references public.perfiles(id),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptado', 'rechazado')),
  primary key (grupo_id, jugador_id)
);

grant select on public.grupos_sugeridos to authenticated;
grant select, update (estado) on public.grupos_sugeridos_jugadores to authenticated;

alter table public.grupos_sugeridos enable row level security;
alter table public.grupos_sugeridos_jugadores enable row level security;

create policy "Ver grupos donde participo" on public.grupos_sugeridos
  for select to authenticated
  using (exists (select 1 from public.grupos_sugeridos_jugadores gsj where gsj.grupo_id = grupos_sugeridos.id and gsj.jugador_id = auth.uid()));

create policy "Ver mi fila del grupo" on public.grupos_sugeridos_jugadores
  for select to authenticated using (jugador_id = auth.uid());
create policy "Responder mi fila del grupo" on public.grupos_sugeridos_jugadores
  for update to authenticated using (jugador_id = auth.uid()) with check (jugador_id = auth.uid());

alter table public.notificaciones
  drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in (
    'invitacion_aceptada', 'invitacion_rechazada', 'partido_cancelado', 'lugar_disponible',
    'mensaje_nuevo', 'saldo_gastos', 'sugerencia_grupo', 'dupla_vinculada'
  ));

-- Guarda una disponibilidad y, si con ella ya somos 4 compatibles (mismo
-- día/franja/zona, nivel parecido) sin un grupo pendiente entre ellos,
-- arma la sugerencia y notifica a los 4.
create or replace function public.guardar_disponibilidad(p_dia_semana text, p_franja text)
returns void
language plpgsql
security definer
as $$
declare
  v_mi_zona text;
  v_mi_nivel integer;
  v_candidatos uuid[];
  v_grupo_id uuid;
  v_jugador uuid;
begin
  insert into public.disponibilidad_habitual (jugador_id, dia_semana, franja)
  values (auth.uid(), p_dia_semana, p_franja)
  on conflict (jugador_id, dia_semana, franja) do nothing;

  select zona, nivel into v_mi_zona, v_mi_nivel from public.perfiles where id = auth.uid();

  if exists (
    select 1 from public.grupos_sugeridos_jugadores gsj
    join public.grupos_sugeridos g on g.id = gsj.grupo_id
    where gsj.jugador_id = auth.uid() and g.estado = 'pendiente'
      and g.dia_semana = p_dia_semana and g.franja = p_franja
  ) then
    return;
  end if;

  select array_agg(dh.jugador_id) into v_candidatos
  from public.disponibilidad_habitual dh
  join public.perfiles pe on pe.id = dh.jugador_id
  where dh.dia_semana = p_dia_semana and dh.franja = p_franja
    and dh.jugador_id <> auth.uid()
    and pe.activo = true
    and pe.zona = v_mi_zona
    and abs(pe.nivel - v_mi_nivel) <= 1
    and not exists (
      select 1 from public.grupos_sugeridos_jugadores gsj2
      join public.grupos_sugeridos g2 on g2.id = gsj2.grupo_id
      where gsj2.jugador_id = dh.jugador_id and g2.estado = 'pendiente'
        and g2.dia_semana = p_dia_semana and g2.franja = p_franja
    )
  limit 3;

  if coalesce(array_length(v_candidatos, 1), 0) >= 3 then
    insert into public.grupos_sugeridos (dia_semana, franja) values (p_dia_semana, p_franja)
    returning id into v_grupo_id;

    insert into public.grupos_sugeridos_jugadores (grupo_id, jugador_id) values (v_grupo_id, auth.uid());

    foreach v_jugador in array v_candidatos[1:3] loop
      insert into public.grupos_sugeridos_jugadores (grupo_id, jugador_id) values (v_grupo_id, v_jugador);
      if coalesce((select notificaciones_activas from public.perfiles where id = v_jugador), true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje)
        values (v_jugador, 'sugerencia_grupo', 'Encontramos un grupo compatible para jugar los ' || p_dia_semana || ' de ' || p_franja || '. ¡Confirmá si te sumás!');
      end if;
    end loop;

    if coalesce((select notificaciones_activas from public.perfiles where id = auth.uid()), true) then
      insert into public.notificaciones (jugador_id, tipo, mensaje)
      values (auth.uid(), 'sugerencia_grupo', 'Encontramos un grupo compatible para jugar los ' || p_dia_semana || ' de ' || p_franja || '. ¡Confirmá si te sumás!');
    end if;
  end if;
end;
$$;

grant execute on function public.guardar_disponibilidad(text, text) to authenticated;

create or replace function public.listar_mi_disponibilidad()
returns table (id uuid, dia_semana text, franja text)
language sql
security definer
stable
as $$
  select id, dia_semana, franja from public.disponibilidad_habitual
  where jugador_id = auth.uid()
  order by dia_semana, franja;
$$;

grant execute on function public.listar_mi_disponibilidad() to authenticated;

create or replace function public.listar_mis_sugerencias_grupo()
returns table (grupo_id uuid, dia_semana text, franja text, mi_estado text, total integer, aceptados integer)
language sql
security definer
stable
as $$
  select
    g.id, g.dia_semana, g.franja, gsj.estado,
    (select count(*)::integer from public.grupos_sugeridos_jugadores where grupo_id = g.id),
    (select count(*)::integer from public.grupos_sugeridos_jugadores where grupo_id = g.id and estado = 'aceptado')
  from public.grupos_sugeridos g
  join public.grupos_sugeridos_jugadores gsj on gsj.grupo_id = g.id and gsj.jugador_id = auth.uid()
  where g.estado = 'pendiente'
  order by g.creado_en desc;
$$;

grant execute on function public.listar_mis_sugerencias_grupo() to authenticated;

-- Acepta o rechaza una sugerencia. Si con mi aceptación quedan los 4
-- aceptados, arma el partido real (organizador: el de id más chico,
-- criterio arbitrario pero determinístico) y notifica a todos.
create or replace function public.responder_sugerencia_grupo(p_grupo_id uuid, p_acepto boolean)
returns void
language plpgsql
security definer
as $$
declare
  v_total integer;
  v_aceptados integer;
  v_dia text;
  v_franja text;
  v_partido_id uuid;
  v_jugador uuid;
  v_primero uuid;
begin
  update public.grupos_sugeridos_jugadores
  set estado = case when p_acepto then 'aceptado' else 'rechazado' end
  where grupo_id = p_grupo_id and jugador_id = auth.uid();

  if not p_acepto then
    update public.grupos_sugeridos set estado = 'roto' where id = p_grupo_id;
    return;
  end if;

  select count(*), count(*) filter (where estado = 'aceptado')
  into v_total, v_aceptados
  from public.grupos_sugeridos_jugadores where grupo_id = p_grupo_id;

  if v_total = v_aceptados then
    select dia_semana, franja into v_dia, v_franja from public.grupos_sugeridos where id = p_grupo_id;
    select min(jugador_id) into v_primero from public.grupos_sugeridos_jugadores where grupo_id = p_grupo_id;

    insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado)
    values (v_primero, now() + interval '7 days', 'A coordinar (grupo de ' || v_dia || ' ' || v_franja || ')', 4, 'abierto')
    returning id into v_partido_id;

    for v_jugador in
      select jugador_id from public.grupos_sugeridos_jugadores
      where grupo_id = p_grupo_id and jugador_id <> v_primero
    loop
      insert into public.partido_jugadores (partido_id, jugador_id, estado) values (v_partido_id, v_jugador, 'confirmado');
      if coalesce((select notificaciones_activas from public.perfiles where id = v_jugador), true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (v_jugador, 'sugerencia_grupo', '¡Se armó tu partido de matchmaking! Coordinen la cancha entre todos.', v_partido_id);
      end if;
    end loop;

    if coalesce((select notificaciones_activas from public.perfiles where id = v_primero), true) then
      insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
      values (v_primero, 'sugerencia_grupo', '¡Se armó tu partido de matchmaking! Quedaste como organizador, coordinen la cancha entre todos.', v_partido_id);
    end if;

    update public.grupos_sugeridos set estado = 'concretado', partido_id = v_partido_id where id = p_grupo_id;
  end if;
end;
$$;

grant execute on function public.responder_sugerencia_grupo(uuid, boolean) to authenticated;

-- =========================================================
-- US-8.2: buscar compañero fijo (dupla estable)
-- =========================================================
alter table public.perfiles
  add column if not exists busca_companero boolean not null default false;

grant update (busca_companero) on public.perfiles to authenticated;

create table public.intereses_dupla (
  de_jugador_id uuid not null references public.perfiles(id),
  a_jugador_id uuid not null references public.perfiles(id),
  creado_en timestamptz not null default now(),
  primary key (de_jugador_id, a_jugador_id),
  check (de_jugador_id <> a_jugador_id)
);

grant select, insert on public.intereses_dupla to authenticated;
alter table public.intereses_dupla enable row level security;

create policy "Ver intereses donde participo" on public.intereses_dupla
  for select to authenticated
  using (de_jugador_id = auth.uid() or a_jugador_id = auth.uid());

create policy "Marcar mi interés" on public.intereses_dupla
  for insert to authenticated
  with check (de_jugador_id = auth.uid());

create table public.duplas (
  id uuid primary key default gen_random_uuid(),
  jugador_a uuid not null references public.perfiles(id),
  jugador_b uuid not null references public.perfiles(id),
  creado_en timestamptz not null default now()
);

grant select on public.duplas to authenticated;
alter table public.duplas enable row level security;

create policy "Ver mis duplas" on public.duplas
  for select to authenticated
  using (jugador_a = auth.uid() or jugador_b = auth.uid());

-- Candidatos: activos, buscando compañero, posición complementaria a la
-- mía (drive busca revés y viceversa), excluyéndome a mí mismo.
create or replace function public.buscar_candidatos_dupla()
returns table (id uuid, nombre text, nivel integer, posicion text, zona text)
language plpgsql
security definer
stable
as $$
declare
  v_mi_posicion text;
begin
  select posicion into v_mi_posicion from public.perfiles where id = auth.uid();

  return query
  select pe.id, pe.nombre, pe.nivel::integer, pe.posicion, pe.zona
  from public.perfiles pe
  where pe.activo = true
    and pe.busca_companero = true
    and pe.id <> auth.uid()
    and pe.posicion <> v_mi_posicion
  order by pe.nombre asc
  limit 30;
end;
$$;

grant execute on function public.buscar_candidatos_dupla() to authenticated;

-- Marca interés; si ya existía el interés inverso, queda vinculado como
-- dupla (match mutuo, mismo patrón de "me gusta" de otras apps).
create or replace function public.marcar_interes_dupla(p_a_jugador_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_mutuo boolean;
begin
  insert into public.intereses_dupla (de_jugador_id, a_jugador_id)
  values (auth.uid(), p_a_jugador_id)
  on conflict do nothing;

  select exists(
    select 1 from public.intereses_dupla
    where de_jugador_id = p_a_jugador_id and a_jugador_id = auth.uid()
  ) into v_mutuo;

  if v_mutuo then
    insert into public.duplas (jugador_a, jugador_b) values (auth.uid(), p_a_jugador_id);
    if coalesce((select notificaciones_activas from public.perfiles where id = p_a_jugador_id), true) then
      insert into public.notificaciones (jugador_id, tipo, mensaje)
      values (
        p_a_jugador_id, 'dupla_vinculada',
        coalesce((select nombre from public.perfiles where id = auth.uid()), 'Un jugador') || ' confirmó que quiere ser tu dupla estable.'
      );
    end if;
  end if;

  return coalesce(v_mutuo, false);
end;
$$;

grant execute on function public.marcar_interes_dupla(uuid) to authenticated;

create or replace function public.listar_mis_duplas()
returns table (jugador_id uuid, nombre text)
language sql
security definer
stable
as $$
  select pe.id, pe.nombre
  from public.duplas d
  join public.perfiles pe on pe.id = (case when d.jugador_a = auth.uid() then d.jugador_b else d.jugador_a end)
  where d.jugador_a = auth.uid() or d.jugador_b = auth.uid();
$$;

grant execute on function public.listar_mis_duplas() to authenticated;

-- ===== sql/038_fix_bug017_min_uuid.sql =====
-- BUG-017: responder_sugerencia_grupo usaba min(jugador_id) para elegir
-- organizador, pero Postgres no tiene la función min() para el tipo uuid
-- ("function min(uuid) does not exist"). Se reemplaza por order by + limit 1,
-- que da el mismo resultado determinístico (el id "más chico").
create or replace function public.responder_sugerencia_grupo(p_grupo_id uuid, p_acepto boolean)
returns void
language plpgsql
security definer
as $$
declare
  v_total integer;
  v_aceptados integer;
  v_dia text;
  v_franja text;
  v_partido_id uuid;
  v_jugador uuid;
  v_primero uuid;
begin
  update public.grupos_sugeridos_jugadores
  set estado = case when p_acepto then 'aceptado' else 'rechazado' end
  where grupo_id = p_grupo_id and jugador_id = auth.uid();

  if not p_acepto then
    update public.grupos_sugeridos set estado = 'roto' where id = p_grupo_id;
    return;
  end if;

  select count(*), count(*) filter (where estado = 'aceptado')
  into v_total, v_aceptados
  from public.grupos_sugeridos_jugadores where grupo_id = p_grupo_id;

  if v_total = v_aceptados then
    select dia_semana, franja into v_dia, v_franja from public.grupos_sugeridos where id = p_grupo_id;
    select jugador_id into v_primero
    from public.grupos_sugeridos_jugadores
    where grupo_id = p_grupo_id
    order by jugador_id
    limit 1;

    insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado)
    values (v_primero, now() + interval '7 days', 'A coordinar (grupo de ' || v_dia || ' ' || v_franja || ')', 4, 'abierto')
    returning id into v_partido_id;

    for v_jugador in
      select jugador_id from public.grupos_sugeridos_jugadores
      where grupo_id = p_grupo_id and jugador_id <> v_primero
    loop
      insert into public.partido_jugadores (partido_id, jugador_id, estado) values (v_partido_id, v_jugador, 'confirmado');
      if coalesce((select notificaciones_activas from public.perfiles where id = v_jugador), true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (v_jugador, 'sugerencia_grupo', '¡Se armó tu partido de matchmaking! Coordinen la cancha entre todos.', v_partido_id);
      end if;
    end loop;

    if coalesce((select notificaciones_activas from public.perfiles where id = v_primero), true) then
      insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
      values (v_primero, 'sugerencia_grupo', '¡Se armó tu partido de matchmaking! Quedaste como organizador, coordinen la cancha entre todos.', v_partido_id);
    end if;

    update public.grupos_sugeridos set estado = 'concretado', partido_id = v_partido_id where id = p_grupo_id;
  end if;
end;
$$;

-- ===== sql/039_fix_bug018_ambiguedad_posicion.sql =====
-- BUG-018: buscar_candidatos_dupla fallaba con
-- "column reference posicion is ambiguous" (42702). El "returns table(...)"
-- declara una columna de salida llamada posicion, que plpgsql expone como
-- variable dentro del cuerpo de la función -- choca con perfiles.posicion
-- si no se califica con el alias de la tabla.
create or replace function public.buscar_candidatos_dupla()
returns table (id uuid, nombre text, nivel integer, posicion text, zona text)
language plpgsql
security definer
stable
as $$
declare
  v_mi_posicion text;
begin
  select pe.posicion into v_mi_posicion from public.perfiles pe where pe.id = auth.uid();

  return query
  select pe.id, pe.nombre, pe.nivel::integer, pe.posicion, pe.zona
  from public.perfiles pe
  where pe.activo = true
    and pe.busca_companero = true
    and pe.id <> auth.uid()
    and pe.posicion <> v_mi_posicion
  order by pe.nombre asc
  limit 30;
end;
$$;

-- ===== sql/040_fix_bug019_no_show_columna_abierta.sql =====
-- BUG-019 (crítico, mismo patrón que BUG-009): la política "Organizador
-- marca no-show" (026_epica6_gestion_avanzada_partidos.sql) es correcta a
-- nivel de FILA (organizador de ese partido), pero partido_jugadores nunca
-- tuvo el GRANT de UPDATE restringido por columna (a diferencia de
-- perfiles, ver 024_fix_bug009_...). Combinadas, el organizador podía
-- reescribir el `estado` (o cualquier otra columna) de CUALQUIER otro
-- jugador de su partido con un PATCH directo -- no solo `no_show` -- lo
-- que rompe por completo el flujo de confirmación de asistencia (US-2.4):
-- un organizador podía "confirmar" o "rechazar" gente sin su consentimiento.
--
-- Corrección: se saca la política amplia y se reemplaza por una función
-- SECURITY DEFINER que solo toca la columna no_show, y además valida en
-- el backend las mismas condiciones que ya exigía el frontend (partido
-- jugado, jugador confirmado) -- cerrando también ese gap.
drop policy if exists "Organizador marca no-show" on public.partido_jugadores;

create or replace function public.marcar_no_show(p_partido_id uuid, p_jugador_id uuid, p_no_show boolean)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from public.partidos
    where id = p_partido_id and organizador_id = auth.uid() and estado = 'jugado'
  ) then
    raise exception 'No autorizado o el partido todavía no se jugó.';
  end if;

  update public.partido_jugadores
  set no_show = p_no_show
  where partido_id = p_partido_id
    and jugador_id = p_jugador_id
    and estado = 'confirmado'
    and jugador_id <> auth.uid();
end;
$$;

grant execute on function public.marcar_no_show(uuid, uuid, boolean) to authenticated;

-- ===== sql/041_seed_datos_demo_epicas_6_10.sql =====
-- Seed de datos demo para las tablas nuevas de las Épicas 6-10, que
-- 018_historial_demo_y_stats_directorio.sql no cubre (esa solo sembró
-- partidos/resultados). A pedido del usuario (2026-09-06): que con los
-- mocks alcance para recrear un estado de demo razonable si hace falta
-- reconstruir la base de cero -- ver `schema-completo.sql`.
--
-- Reutiliza las cuentas demo ya creadas por
-- app/frontend/scripts/seed-jugadores-demo.js (nombre ilike '%(demo %') y
-- el historial de 018 -- no crea cuentas nuevas. Idempotente: si se corre
-- de nuevo, borra lo que él mismo sembró antes de reinsertar.
do $$
declare
  v_jugador_a uuid; v_jugador_b uuid; v_jugador_c uuid; v_jugador_d uuid;
  v_partido_con_cancha_real uuid;
  v_cancha_id uuid;
  v_organizador_partido uuid;
begin
  if (select count(*) from public.perfiles where nombre ilike '%(demo %' and activo = true) < 4 then
    raise notice 'No hay suficientes jugadores demo, se aborta.';
    return;
  end if;

  -- Limpieza de una corrida anterior de este mismo script (no toca datos
  -- reales de cuentas no-demo).
  delete from public.resenas_canchas where jugador_id in (select id from public.perfiles where nombre ilike '%(demo %');
  delete from public.mensajes where remitente_id in (select id from public.perfiles where nombre ilike '%(demo %');
  delete from public.duplas where jugador_a in (select id from public.perfiles where nombre ilike '%(demo %');
  delete from public.intereses_dupla where de_jugador_id in (select id from public.perfiles where nombre ilike '%(demo %');
  delete from public.disponibilidad_habitual where jugador_id in (select id from public.perfiles where nombre ilike '%(demo %');

  -- 1) Reseña de cancha (US-9.1): busca un partido demo ya jugado cuya
  -- cancha coincida con una real del Directorio (mismo criterio heurístico
  -- de siempre, por nombre) y deja una reseña de su organizador.
  select pa.id, c.id, pa.organizador_id
    into v_partido_con_cancha_real, v_cancha_id, v_organizador_partido
  from public.partidos pa
  join public.canchas c on c.nombre = pa.cancha
  join public.resultados_partido rp on rp.partido_id = pa.id and rp.finalizado = true
  where pa.organizador_id in (select id from public.perfiles where nombre ilike '%(demo %')
  order by random()
  limit 1;

  if v_cancha_id is not null then
    insert into public.resenas_canchas (cancha_id, jugador_id, puntuacion, comentario)
    values (v_cancha_id, v_organizador_partido, 4, 'Cancha en buen estado, fácil de coordinar. (reseña demo)')
    on conflict (cancha_id, jugador_id) do nothing;
  else
    raise notice 'No se encontró un partido demo con cancha real coincidente, se salteó la reseña.';
  end if;

  -- 2) Gastos del partido (US-10.1): carga un desglose tipo Splitwise en
  -- un partido demo jugado, con un jugador con cuenta real (para que se
  -- vea el saldo calculado) y uno "a mano" (sin cuenta).
  select id into v_organizador_partido
  from public.partidos
  where organizador_id in (select id from public.perfiles where nombre ilike '%(demo %') and estado = 'jugado'
  order by random() limit 1;

  if v_organizador_partido is not null then
    select organizador_id into v_jugador_a from public.partidos where id = v_organizador_partido;
    select jugador_id into v_jugador_b from public.partido_jugadores
      where partido_id = v_organizador_partido and jugador_id <> v_jugador_a limit 1;

    update public.partidos
    set gastos = jsonb_build_array(
      jsonb_build_object('nombre', (select nombre from public.perfiles where id = v_jugador_a), 'monto', 6000, 'jugador_id', v_jugador_a),
      jsonb_build_object('nombre', coalesce((select nombre from public.perfiles where id = v_jugador_b), 'Invitado sin cuenta'), 'monto', 0, 'jugador_id', v_jugador_b),
      jsonb_build_object('nombre', 'Invitado de la cancha', 'monto', 0, 'jugador_id', null)
    )
    where id = v_organizador_partido;
  end if;

  -- 3) Mensajería (US-7.4): una conversación corta entre 2 demo.
  select id into v_jugador_a from public.perfiles where nombre ilike '%(demo %' order by random() limit 1;
  select id into v_jugador_b from public.perfiles where nombre ilike '%(demo %' and id <> v_jugador_a order by random() limit 1;

  insert into public.mensajes (remitente_id, destinatario_id, contenido, leido)
  values
    (v_jugador_a, v_jugador_b, '¿Jugamos el sábado a las 18? (mensaje demo)', true),
    (v_jugador_b, v_jugador_a, 'Dale, te confirmo la cancha. (mensaje demo)', false);

  -- 4) Disponibilidad + dupla vinculada (Épica 8): 2 demo con posición
  -- complementaria, disponibilidad igual y match mutuo ya concretado.
  select id into v_jugador_c from public.perfiles where nombre ilike '%(demo %' and posicion = 'drive' order by random() limit 1;
  select id into v_jugador_d from public.perfiles where nombre ilike '%(demo %' and posicion = 'reves' and id <> v_jugador_c order by random() limit 1;

  if v_jugador_c is not null and v_jugador_d is not null then
    insert into public.disponibilidad_habitual (jugador_id, dia_semana, franja) values
      (v_jugador_c, 'sabado', 'tarde'), (v_jugador_d, 'sabado', 'tarde')
    on conflict do nothing;

    update public.perfiles set busca_companero = true where id in (v_jugador_c, v_jugador_d);

    insert into public.intereses_dupla (de_jugador_id, a_jugador_id) values
      (v_jugador_c, v_jugador_d), (v_jugador_d, v_jugador_c)
    on conflict do nothing;

    insert into public.duplas (jugador_a, jugador_b)
    select v_jugador_c, v_jugador_d
    where not exists (
      select 1 from public.duplas
      where (jugador_a = v_jugador_c and jugador_b = v_jugador_d)
         or (jugador_a = v_jugador_d and jugador_b = v_jugador_c)
    );
  else
    raise notice 'No se encontró un par demo drive/revés para dupla, se salteó.';
  end if;

  raise notice 'Seed de Épicas 6-10 completado.';
end $$;

-- ===== sql/042_fix_bug020_contador_no_show_perfil.sql =====
-- BUG-020: US-6.5 pide que el no-show sea "visible en el perfil (mismo
-- criterio de visibilidad que el ranking -- público)", pero 026 solo
-- expone `no_show` por partido (ver_participantes_partido) -- nunca se
-- sumó un contador agregado a ningún lado. Se agrega a ver_perfil_jugador
-- (el perfil reducido de OTRO jugador, US-3.5/US-7.x), que es el lugar
-- donde tiene sentido de negocio (decidir si invitar a alguien).
drop function if exists public.ver_perfil_jugador(uuid);

create or replace function public.ver_perfil_jugador(p_id uuid)
returns table (
  id uuid,
  nombre text,
  avatar_url text,
  nivel integer,
  mano_habil text,
  posicion text,
  sexo text,
  puntos_ranking integer,
  partidos_jugados integer,
  porcentaje_victorias integer,
  no_shows integer,
  es_frecuente boolean,
  veces_con integer,
  veces_contra integer,
  compatibilidad_pct integer
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    pe.id,
    pe.nombre::text,
    pe.avatar_url,
    pe.nivel::integer,
    pe.mano_habil::text,
    pe.posicion::text,
    pe.sexo::text,
    pe.puntos_ranking::integer,
    coalesce(stats.jugados, 0)::integer,
    coalesce(stats.pct, 0)::integer,
    coalesce(stats.no_shows, 0)::integer,
    exists (
      select 1 from public.jugadores_frecuentes jf
      where jf.jugador_id = auth.uid() and jf.frecuente_id = p_id
    ),
    coalesce(rel.veces_con, 0)::integer,
    coalesce(rel.veces_contra, 0)::integer,
    case when coalesce(rel.veces_con, 0) >= 2 then rel.compat_pct::integer else null end
  from public.perfiles pe
  left join lateral (
    select
      count(*) as jugados,
      round(100.0 * count(*) filter (where rp.ganador = pj.equipo) / nullif(count(*), 0)) as pct,
      count(*) filter (where pj.no_show = true) as no_shows
    from public.partido_jugadores pj
    join public.resultados_partido rp on rp.partido_id = pj.partido_id and rp.finalizado = true
    where pj.jugador_id = pe.id
  ) stats on true
  left join lateral (
    select
      count(*) filter (where pj_yo.equipo = pj_el.equipo) as veces_con,
      count(*) filter (where pj_yo.equipo <> pj_el.equipo) as veces_contra,
      round(100.0 * count(*) filter (where pj_yo.equipo = pj_el.equipo and rp.ganador = pj_yo.equipo)
        / nullif(count(*) filter (where pj_yo.equipo = pj_el.equipo), 0)) as compat_pct
    from public.partido_jugadores pj_yo
    join public.partido_jugadores pj_el
      on pj_el.partido_id = pj_yo.partido_id and pj_el.jugador_id = pe.id
    join public.resultados_partido rp on rp.partido_id = pj_yo.partido_id and rp.finalizado = true
    where pj_yo.jugador_id = auth.uid()
  ) rel on true
  where pe.id = p_id and pe.activo = true;
end;
$$;

grant execute on function public.ver_perfil_jugador(uuid) to authenticated;

-- ===== sql/043_fix_bug021_bug022_lista_de_espera.sql =====
-- BUG-022 (crítico -- feature entera rota): US-6.4 (lista de espera) nunca
-- funcionó -- la política de INSERT "Sumarme o ser invitado" (002) solo
-- permite estado 'anotado' (para uno mismo) o 'invitado' (organizador), y
-- 026_epica6_gestion_avanzada_partidos.sql sumó 'en_espera' al CHECK de la
-- columna pero se olvidó de sumarlo también acá -- todo intento real de
-- anotarse en lista de espera (handleAnotarmeEnEspera) daba 403 RLS.
drop policy if exists "Sumarme o ser invitado" on public.partido_jugadores;

create policy "Sumarme o ser invitado" on public.partido_jugadores
  for insert to authenticated
  with check (
    (jugador_id = auth.uid() and estado in ('anotado', 'en_espera'))
    or (
      estado = 'invitado'
      and exists (
        select 1 from public.partidos pa
        where pa.id = partido_id and pa.organizador_id = auth.uid()
      )
    )
  );

-- BUG-021: el chequeo de cupo al anotarse (006_us2_3_invitar_jugadores.sql)
-- comparaba `tg_op = 'insert'` en minúsculas -- TG_OP siempre devuelve
-- 'INSERT'/'UPDATE' en MAYÚSCULAS, así que esa comparación nunca era
-- cierta. En la práctica el resto de la condición (`old.estado is distinct
-- from 'anotado'`) igual debería cubrir el caso de INSERT, pero se
-- reescribe de forma explícita y a prueba de dudas -- separando INSERT de
-- UPDATE en vez de depender de un solo OR difícil de leer -- para dejar
-- 100% claro y verificado que un partido no puede sobrellenarse por
-- ninguna de las dos vías (anotarse directo, o aceptar una invitación).
create or replace function public.validar_cupo_para_anotarse()
returns trigger as $$
declare
  v_cantidad integer;
  v_ocupados integer;
  v_debe_chequear boolean;
begin
  if tg_op = 'INSERT' then
    v_debe_chequear := (new.estado = 'anotado');
  else
    v_debe_chequear := (new.estado = 'anotado' and old.estado is distinct from 'anotado');
  end if;

  if v_debe_chequear then
    select cantidad_jugadores into v_cantidad
    from public.partidos where id = new.partido_id;

    select count(*) into v_ocupados
    from public.partido_jugadores
    where partido_id = new.partido_id and estado in ('anotado', 'confirmado');

    if v_ocupados >= v_cantidad then
      raise exception 'El partido ya no tiene lugares disponibles.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validar_cupo_para_anotarse on public.partido_jugadores;

create trigger trg_validar_cupo_para_anotarse
before insert or update on public.partido_jugadores
for each row execute function public.validar_cupo_para_anotarse();

-- ===== sql/044_fix_bug021_security_definer_validar_cupo.sql =====
-- BUG-021 (causa raíz real, más profunda de lo que 043 corrigió): el
-- chequeo de cupo al anotarse nunca funcionó de verdad para el caso más
-- común -- un jugador sumándose a un partido abierto del que TODAVÍA no
-- participa. `validar_cupo_para_anotarse()` nunca se declaró `security
-- definer` (a diferencia de `recalcular_estado_partido`, que sí lo es
-- desde el principio) -- corre como SECURITY INVOKER, así que su propio
-- `select count(*) from partido_jugadores` queda sujeto a la política RLS
-- "Ver participantes de mis partidos" **del usuario que se está anotando**.
-- Como esa persona todavía no es participante ni organizador en el momento
-- del chequeo (BEFORE INSERT, la fila propia todavía no existe), esa
-- política le devuelve CERO filas -- el conteo siempre daba 0, y "0 >=
-- cantidad_jugadores" nunca es cierto. El cupo jamás estuvo realmente
-- garantizado a nivel de servidor para el camino de "Sumarme" (US-2.2),
-- solo lo evitaba la UI ocultando el botón cuando ya se veía completo.
--
-- Encontrado recién ahora (2026-09-06) probando la lista de espera de
-- US-6.4 con cuentas que todavía no eran parte del partido -- el 043
-- (arreglo del bug de mayúsculas en tg_op) era necesario pero no
-- suficiente; sin este fix el chequeo seguía sin frenar a nadie.
create or replace function public.validar_cupo_para_anotarse()
returns trigger as $$
declare
  v_cantidad integer;
  v_ocupados integer;
  v_debe_chequear boolean;
begin
  if tg_op = 'INSERT' then
    v_debe_chequear := (new.estado = 'anotado');
  else
    v_debe_chequear := (new.estado = 'anotado' and old.estado is distinct from 'anotado');
  end if;

  if v_debe_chequear then
    select cantidad_jugadores into v_cantidad
    from public.partidos where id = new.partido_id;

    select count(*) into v_ocupados
    from public.partido_jugadores
    where partido_id = new.partido_id and estado in ('anotado', 'confirmado');

    if v_ocupados >= v_cantidad then
      raise exception 'El partido ya no tiene lugares disponibles.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ===== sql/045_fix_bug025_cascada_aviso_lista_espera.sql =====
-- BUG-025: al liberarse un lugar, se avisaba a TODA la lista de espera en
-- vez de solo al primero. Causa: `recalcular_estado_partido` está
-- declarado `AFTER INSERT OR DELETE OR UPDATE`, y el propio cuerpo de la
-- función hace `update partido_jugadores set avisado_lista_espera = true`
-- para marcar a quien avisa -- ese UPDATE vuelve a disparar EL MISMO
-- trigger (recursión vía trigger, no vía llamada directa a la función).
-- En esa segunda pasada, "hay lugar" sigue siendo cierto (nadie ocupó el
-- lugar todavía, solo se lo avisamos) y `avisado_lista_espera=false` ya no
-- incluye al primero -- así que encuentra y avisa al segundo. Y así en
-- cascada con el resto de la lista, todo dentro de la misma transacción.
--
-- Fix: `pg_trigger_depth()` -- built-in de Postgres, cuenta cuántos
-- niveles de trigger anidados hay activos ahora mismo. La invocación
-- original (disparada por el DELETE/INSERT/UPDATE real del cliente) corre
-- en profundidad 1; la invocación recursiva causada por el UPDATE interno
-- de esta misma función corre en profundidad 2. Se restringe el bloque de
-- aviso de lista de espera a solo la profundidad 1 -- así se avisa a lo
-- sumo a una persona por cada liberación real de lugar, tal como pide el
-- criterio de aceptación de US-6.4.
create or replace function public.recalcular_estado_partido()
returns trigger as $$
declare
  v_partido_id uuid := coalesce(new.partido_id, old.partido_id);
  v_cantidad integer;
  v_estado_actual text;
  v_confirmados integer;
  v_ocupados integer;
  v_en_espera record;
  v_notif_activas boolean;
begin
  select cantidad_jugadores, estado into v_cantidad, v_estado_actual
  from public.partidos where id = v_partido_id;

  select count(*) into v_confirmados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado = 'confirmado';

  select count(*) into v_ocupados
  from public.partido_jugadores
  where partido_id = v_partido_id and estado in ('anotado', 'confirmado');

  update public.partidos set lugares_ocupados = v_ocupados where id = v_partido_id;

  if v_estado_actual = 'abierto' and v_confirmados >= v_cantidad then
    update public.partidos set estado = 'completo' where id = v_partido_id;
  elsif v_estado_actual = 'completo' and v_confirmados < v_cantidad then
    update public.partidos set estado = 'abierto' where id = v_partido_id;
  end if;

  -- US-6.4: si hay lugar y alguien en la lista de espera sin avisar
  -- todavía, le avisamos (uno solo, el más antiguo) -- solo en la
  -- invocación de primer nivel, para no reprocesar por el UPDATE propio.
  if v_ocupados < v_cantidad and pg_trigger_depth() <= 1 then
    select * into v_en_espera
    from public.partido_jugadores
    where partido_id = v_partido_id and estado = 'en_espera' and avisado_lista_espera = false
    order by created_at asc
    limit 1;

    if v_en_espera.id is not null then
      select coalesce(notificaciones_activas, true) into v_notif_activas
      from public.perfiles where id = v_en_espera.jugador_id;

      if coalesce(v_notif_activas, true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (v_en_espera.jugador_id, 'lugar_disponible', 'Se liberó un lugar en un partido de tu lista de espera. Confirmá tu lugar antes de que se lo lleve otro.', v_partido_id);
      end if;

      update public.partido_jugadores set avisado_lista_espera = true where id = v_en_espera.id;
    end if;
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- ===== sql/046_fix_bug028_reemplazo_sugerencia_grupo.sql =====
-- BUG-028: cuando alguien rechazaba una sugerencia de grupo (US-8.1), el
-- sistema rompía TODO el grupo (estado='roto') en vez de "seguir buscando
-- un reemplazo compatible", como pide el criterio de aceptación explícito
-- de la historia. Probado en vivo con 4 cuentas frescas: 3 ya habían
-- confirmado, y al rechazar la 4ta las otras 3 perdían la sugerencia sin
-- aviso ni reemplazo.
--
-- Decisión del usuario (2026-09-07, resolviendo la pregunta abierta de la
-- historia): al rechazar, buscar UN solo reemplazo compatible (mismo
-- día/franja/zona/nivel que ya usa el grupo) -- sin mandarle la sugerencia
-- a más de un candidato nuevo a la vez. Si se encuentra reemplazo, los que
-- ya habían confirmado vuelven a "pendiente" (tienen que reconfirmar con
-- la nueva formación) y se notifica solo al candidato nuevo + a quienes
-- deben reconfirmar. Si no se encuentra reemplazo todavía, el lugar queda
-- abierto (el grupo sigue "pendiente", ya no se rompe) -- pero no se
-- extiende acá `guardar_disponibilidad` para que una futura declaración
-- ocupe ese lugar abierto automáticamente; queda como límite conocido a
-- resolver más adelante si hace falta.
create or replace function public.responder_sugerencia_grupo(p_grupo_id uuid, p_acepto boolean)
returns void
language plpgsql
security definer
as $$
declare
  v_total integer;
  v_aceptados integer;
  v_dia text;
  v_franja text;
  v_partido_id uuid;
  v_jugador uuid;
  v_primero uuid;
  v_zona_ref text;
  v_nivel_ref integer;
  v_reemplazo uuid;
begin
  if not p_acepto then
    update public.grupos_sugeridos_jugadores
    set estado = 'rechazado'
    where grupo_id = p_grupo_id and jugador_id = auth.uid();

    select dia_semana, franja into v_dia, v_franja from public.grupos_sugeridos where id = p_grupo_id;

    select pe.zona, pe.nivel into v_zona_ref, v_nivel_ref
    from public.grupos_sugeridos_jugadores gsj
    join public.perfiles pe on pe.id = gsj.jugador_id
    where gsj.grupo_id = p_grupo_id and gsj.jugador_id <> auth.uid()
    limit 1;

    select dh.jugador_id into v_reemplazo
    from public.disponibilidad_habitual dh
    join public.perfiles pe on pe.id = dh.jugador_id
    where dh.dia_semana = v_dia and dh.franja = v_franja
      and pe.activo = true
      and pe.zona = v_zona_ref
      and abs(pe.nivel - v_nivel_ref) <= 1
      and dh.jugador_id <> auth.uid()
      and not exists (
        select 1 from public.grupos_sugeridos_jugadores
        where grupo_id = p_grupo_id and jugador_id = dh.jugador_id
      )
      and not exists (
        select 1 from public.grupos_sugeridos_jugadores gsj2
        join public.grupos_sugeridos g2 on g2.id = gsj2.grupo_id
        where gsj2.jugador_id = dh.jugador_id and g2.estado = 'pendiente'
          and g2.dia_semana = v_dia and g2.franja = v_franja
      )
    limit 1;

    if v_reemplazo is not null then
      delete from public.grupos_sugeridos_jugadores where grupo_id = p_grupo_id and jugador_id = auth.uid();
      insert into public.grupos_sugeridos_jugadores (grupo_id, jugador_id, estado) values (p_grupo_id, v_reemplazo, 'pendiente');
      update public.grupos_sugeridos_jugadores set estado = 'pendiente' where grupo_id = p_grupo_id and jugador_id <> v_reemplazo;

      if coalesce((select notificaciones_activas from public.perfiles where id = v_reemplazo), true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje)
        values (v_reemplazo, 'sugerencia_grupo', 'Encontramos un grupo compatible para jugar los ' || v_dia || ' de ' || v_franja || '. ¡Confirmá si te sumás!');
      end if;

      for v_jugador in
        select jugador_id from public.grupos_sugeridos_jugadores
        where grupo_id = p_grupo_id and jugador_id <> v_reemplazo
      loop
        if coalesce((select notificaciones_activas from public.perfiles where id = v_jugador), true) then
          insert into public.notificaciones (jugador_id, tipo, mensaje)
          values (v_jugador, 'sugerencia_grupo', 'Uno de los jugadores del grupo no pudo sumarse, pero encontramos un reemplazo. Confirmá de nuevo con la nueva formación.');
        end if;
      end loop;
    end if;
    -- Si no hay reemplazo todavía, no se hace nada más: el grupo sigue
    -- "pendiente" con el lugar del rechazo abierto, ya no se rompe.

    return;
  end if;

  update public.grupos_sugeridos_jugadores
  set estado = 'aceptado'
  where grupo_id = p_grupo_id and jugador_id = auth.uid();

  select count(*), count(*) filter (where estado = 'aceptado')
  into v_total, v_aceptados
  from public.grupos_sugeridos_jugadores where grupo_id = p_grupo_id;

  if v_total = v_aceptados then
    select dia_semana, franja into v_dia, v_franja from public.grupos_sugeridos where id = p_grupo_id;
    select jugador_id into v_primero
    from public.grupos_sugeridos_jugadores
    where grupo_id = p_grupo_id
    order by jugador_id
    limit 1;

    insert into public.partidos (organizador_id, fecha_hora, cancha, cantidad_jugadores, estado)
    values (v_primero, now() + interval '7 days', 'A coordinar (grupo de ' || v_dia || ' ' || v_franja || ')', 4, 'abierto')
    returning id into v_partido_id;

    for v_jugador in
      select jugador_id from public.grupos_sugeridos_jugadores
      where grupo_id = p_grupo_id and jugador_id <> v_primero
    loop
      insert into public.partido_jugadores (partido_id, jugador_id, estado) values (v_partido_id, v_jugador, 'confirmado');
      if coalesce((select notificaciones_activas from public.perfiles where id = v_jugador), true) then
        insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
        values (v_jugador, 'sugerencia_grupo', '¡Se armó tu partido de matchmaking! Coordinen la cancha entre todos.', v_partido_id);
      end if;
    end loop;

    if coalesce((select notificaciones_activas from public.perfiles where id = v_primero), true) then
      insert into public.notificaciones (jugador_id, tipo, mensaje, partido_id)
      values (v_primero, 'sugerencia_grupo', '¡Se armó tu partido de matchmaking! Quedaste como organizador, coordinen la cancha entre todos.', v_partido_id);
    end if;

    update public.grupos_sugeridos set estado = 'concretado', partido_id = v_partido_id where id = p_grupo_id;
  end if;
end;
$$;

