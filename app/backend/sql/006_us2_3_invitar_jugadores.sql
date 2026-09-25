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
