-- =========================================================
-- 068 · Destacados del perfil (opción C "Cara a cara", 2026-10-02)
-- =========================================================
-- El perfil muestra "Tu mejor dupla", "Tu cuenta pendiente" (el rival
-- que más te cuesta) y "Tu cancha". Para eso hacen falta los nombres de
-- los otros 3 jugadores de cada partido terminado, pero la RLS de
-- `perfiles` solo deja leer el perfil propio (mismo motivo que BUG-031).
--
-- Esta función devuelve, para cada partido TERMINADO de la persona
-- logueada, una fila por cada OTRO jugador (compañero o rival), con su
-- nombre. Usa auth.uid(), no recibe un id: cada uno solo ve sus partidos.
-- Incluye invitados sin cuenta (invitado_nombre).
--
-- Correr una vez en el SQL Editor de Supabase.

create or replace function public.mis_cruces_partidos()
returns table (
  partido_id uuid,
  fecha_hora timestamptz,
  cancha text,
  mi_equipo text,
  ganador text,
  sets_a jsonb,
  sets_b jsonb,
  otro_id uuid,
  otro_nombre text,
  otro_equipo text
)
language sql
security definer
stable
set search_path = public
as $$
  with mios as (
    select pa.id, pa.fecha_hora, pa.cancha, yo.equipo, rp.ganador, rp.estado
    from public.partido_jugadores yo
    join public.partidos pa on pa.id = yo.partido_id
    join public.resultados_partido rp on rp.partido_id = pa.id and rp.finalizado = true
    where yo.jugador_id = auth.uid()
      and yo.equipo is not null
    order by pa.fecha_hora desc
    limit 200
  )
  select
    m.id,
    m.fecha_hora,
    m.cancha,
    m.equipo,
    m.ganador,
    m.estado -> 'setsA',
    m.estado -> 'setsB',
    otro.jugador_id,
    coalesce(pe.nombre, otro.invitado_nombre),
    otro.equipo
  from mios m
  join public.partido_jugadores otro
    on otro.partido_id = m.id
   and otro.equipo is not null
   and otro.jugador_id is distinct from auth.uid()
  left join public.perfiles pe on pe.id = otro.jugador_id
  order by m.fecha_hora desc;
$$;

revoke all on function public.mis_cruces_partidos() from public, anon;
grant execute on function public.mis_cruces_partidos() to authenticated;

-- Prueba (logueado no aplica en el SQL Editor: auth.uid() es null ahí y
-- devuelve 0 filas, es lo esperado). Para verificar que existe:
-- select proname from pg_proc where proname = 'mis_cruces_partidos';
