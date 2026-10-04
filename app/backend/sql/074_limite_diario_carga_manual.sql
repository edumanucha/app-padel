-- Límite de partidos cargados a mano (2026-10-04, pedido del usuario): una
-- persona puede cargar como máximo UN partido jugado sin Marcadorcito por día
-- (día de Argentina), para que no se pueda abusar del ranking.
-- Correr en el SQL Editor de Supabase, después de 073.

-- ¿Ya cargué un partido a mano hoy?
create or replace function public.cargue_partido_hoy()
returns boolean as $$
  select exists (
    select 1
      from public.resultados_partido rp
      join public.partidos pa on pa.id = rp.partido_id
     where pa.organizador_id = auth.uid()
       and coalesce(rp.estado ->> 'cargadoAMano', 'false') = 'true'
       and (rp.created_at at time zone 'America/Argentina/Buenos_Aires')::date
           = (now() at time zone 'America/Argentina/Buenos_Aires')::date
  );
$$ language sql stable security definer set search_path = public;

grant execute on function public.cargue_partido_hoy() to authenticated;

-- Respaldo en la base: aunque se saltee la app, no entra el segundo del día.
create or replace function public.limitar_carga_manual_diaria()
returns trigger as $$
declare
  v_organizador uuid;
begin
  if coalesce(new.estado ->> 'cargadoAMano', 'false') <> 'true' then
    return new;
  end if;
  select organizador_id into v_organizador from public.partidos where id = new.partido_id;
  if exists (
    select 1
      from public.resultados_partido rp
      join public.partidos pa on pa.id = rp.partido_id
     where pa.organizador_id = v_organizador
       and coalesce(rp.estado ->> 'cargadoAMano', 'false') = 'true'
       and (rp.created_at at time zone 'America/Argentina/Buenos_Aires')::date
           = (now() at time zone 'America/Argentina/Buenos_Aires')::date
  ) then
    raise exception 'limite_diario_carga';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_limitar_carga_manual_diaria on public.resultados_partido;
create trigger trg_limitar_carga_manual_diaria
  before insert on public.resultados_partido
  for each row execute function public.limitar_carga_manual_diaria();
