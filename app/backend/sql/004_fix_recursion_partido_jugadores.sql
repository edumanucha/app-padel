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
