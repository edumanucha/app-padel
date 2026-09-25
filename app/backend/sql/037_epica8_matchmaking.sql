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
