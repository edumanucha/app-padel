-- Un solo responsable del marcador (2026-10-04, pedido del usuario): solo
-- quien lleva el Marcadorcito suma puntos, deshace y cierra el partido; los
-- demás jugadores lo ven en vivo (y en su reloj) pero no pueden anotar.
-- El responsable puede pasar el control a otro jugador del partido.
-- Correr en el SQL Editor de Supabase, después de 071.

alter table public.resultados_partido
  add column if not exists anota_id uuid references public.perfiles(id);

-- Marcadores que ya existen: lleva los puntos quien organizó el partido.
update public.resultados_partido r
   set anota_id = p.organizador_id
  from public.partidos p
 where p.id = r.partido_id and r.anota_id is null;

-- Marcadores nuevos: lleva los puntos quien lo crea (abre el Marcadorcito).
create or replace function public.asignar_anotador()
returns trigger as $$
begin
  if new.anota_id is null then
    new.anota_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_asignar_anotador on public.resultados_partido;
create trigger trg_asignar_anotador
  before insert on public.resultados_partido
  for each row execute function public.asignar_anotador();

-- Solo el responsable puede actualizar el marcador (y debe jugar el partido).
drop policy if exists "Participantes actualizan el marcador" on public.resultados_partido;
create policy "El anotador actualiza el marcador" on public.resultados_partido
  for update to authenticated
  using (
    (anota_id = auth.uid() or anota_id is null)
    and exists (
      select 1 from public.partido_jugadores pj
      where pj.partido_id = resultados_partido.partido_id and pj.jugador_id = auth.uid()
    )
  );

-- Pasar el control a otro jugador del mismo partido.
create or replace function public.pasar_control_marcador(p_partido uuid, p_nuevo uuid)
returns void as $$
begin
  if not exists (
    select 1 from public.resultados_partido
     where partido_id = p_partido and (anota_id = auth.uid() or anota_id is null)
  ) then
    raise exception 'solo_anotador';
  end if;
  if not exists (
    select 1 from public.partido_jugadores
     where partido_id = p_partido and jugador_id = p_nuevo
  ) then
    raise exception 'no_es_jugador';
  end if;
  update public.resultados_partido set anota_id = p_nuevo where partido_id = p_partido;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.pasar_control_marcador(uuid, uuid) to authenticated;
