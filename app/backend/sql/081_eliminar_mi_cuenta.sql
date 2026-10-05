-- Eliminar mi cuenta (2026-10-05, para el MVP): borra los datos personales y
-- deja los partidos en los que se jugó con el nombre "Jugador eliminado", así
-- a los demás jugadores no se les rompe el historial ni las estadísticas.
-- Es la "opción 1" que se charló con el usuario. No se puede deshacer.
--
-- Qué hace, en orden:
--  1. Anonimiza el perfil (primero, así los avisos que salten después ya
--     dicen "Jugador eliminado").
--  2. Cancela los partidos que organizaba y todavía no se jugaron, y lo saca
--     de los partidos de otros que tampoco se jugaron.
--  3. Borra los torneos que organizaba y siguen en juego; en los demás
--     torneos su nombre pasa a "Jugador eliminado".
--  4. Grupos: si creó uno con más miembros, pasa al miembro más antiguo; si
--     era el único, el grupo se borra. Sale de los demás.
--  5. Borra mensajes, notificaciones, disponibilidad, compañeros fijos,
--     frecuentes, sugerencias, reseñas y lo que reportó o le reportaron.
--  6. Deja el acceso inutilizable (sin mail, sin Google, sin sesiones).
-- Correr en el SQL Editor de Supabase, después de 080.

create or replace function public.eliminar_mi_cuenta(p_confirmacion text)
returns void as $$
declare
  v_uid uuid := auth.uid();
  v_grupo record;
  v_nuevo uuid;
begin
  if v_uid is null then raise exception 'no_autenticado'; end if;
  if p_confirmacion is distinct from 'ELIMINAR' then raise exception 'confirmacion_invalida'; end if;
  if not exists (select 1 from public.perfiles where id = v_uid and nombre <> 'Jugador eliminado') then
    raise exception 'cuenta_inexistente';
  end if;

  -- 1. Perfil anonimizado. Los campos obligatorios quedan con valores neutros
  -- que no dicen nada de la persona (el perfil queda inactivo y fuera de los
  -- rankings y de los buscadores).
  update public.perfiles
     set nombre = 'Jugador eliminado',
         telefono = '',
         sexo = 'masculino',
         zona = 'otra_zona',
         provincia = 'mendoza',
         nivel = 1,
         mano_habil = 'diestro',
         posicion = 'drive',
         avatar_url = null,
         activo = false,
         dado_de_baja_en = now(),
         mostrar_whatsapp = false,
         mostrar_telefono = false,
         busca_companero = false,
         notificaciones_activas = false,
         puntos_ranking = 0,
         es_superusuario = false
   where id = v_uid;

  -- 2. Partidos que organizaba y no se jugaron: se cancelan.
  update public.partidos set estado = 'cancelado'
   where organizador_id = v_uid and estado in ('abierto', 'completo');

  -- De los partidos de otros que no se jugaron, sale (primero "rechazado",
  -- porque la base no deja borrar a un jugador confirmado).
  update public.partido_jugadores pj set estado = 'rechazado'
    from public.partidos pa
   where pa.id = pj.partido_id and pj.jugador_id = v_uid
     and pa.organizador_id <> v_uid and pa.estado in ('abierto', 'completo');
  delete from public.partido_jugadores pj
   using public.partidos pa
   where pa.id = pj.partido_id and pj.jugador_id = v_uid
     and pa.organizador_id <> v_uid and pa.estado in ('abierto', 'completo');
  -- Invitaciones y anotaciones sin confirmar en cualquier partido.
  delete from public.partido_jugadores where jugador_id = v_uid and estado <> 'confirmado';

  -- 3. Torneos.
  delete from public.torneos where organizador_id = v_uid and estado = 'en_juego';
  update public.torneo_participantes set nombre = 'Jugador eliminado' where jugador_id = v_uid;

  -- 4. Grupos.
  for v_grupo in select id from public.grupos where creador_id = v_uid loop
    select jugador_id into v_nuevo
      from public.grupo_miembros
     where grupo_id = v_grupo.id and jugador_id <> v_uid
     order by created_at
     limit 1;
    if v_nuevo is not null then
      update public.grupos set creador_id = v_nuevo where id = v_grupo.id;
      update public.grupo_miembros set rol = 'admin' where grupo_id = v_grupo.id and jugador_id = v_nuevo;
    else
      delete from public.grupos where id = v_grupo.id;
    end if;
    v_nuevo := null;
  end loop;
  delete from public.grupo_miembros where jugador_id = v_uid;
  delete from public.grupo_invitaciones where jugador_id = v_uid or invitado_por = v_uid;
  delete from public.grupos_sugeridos_jugadores where jugador_id = v_uid;

  -- 5. Datos personales.
  delete from public.mensajes where remitente_id = v_uid or destinatario_id = v_uid;
  delete from public.reportes_mensajes where reportado_por = v_uid or reportado_id = v_uid;
  delete from public.notificaciones where jugador_id = v_uid;
  delete from public.disponibilidad_habitual where jugador_id = v_uid;
  delete from public.duplas where jugador_a = v_uid or jugador_b = v_uid;
  delete from public.intereses_dupla where de_jugador_id = v_uid or a_jugador_id = v_uid;
  delete from public.jugadores_frecuentes where jugador_id = v_uid or frecuente_id = v_uid;
  delete from public.feedback_app where jugador_id = v_uid;
  delete from public.resenas_canchas where jugador_id = v_uid;

  -- 6. Acceso: sin mail, sin Google, sin sesiones y bloqueado para siempre.
  delete from auth.identities where user_id = v_uid;
  delete from auth.sessions where user_id = v_uid;
  update auth.users
     set email = 'eliminada-' || v_uid::text || '@eliminada.invalid',
         phone = null,
         encrypted_password = '',
         raw_user_meta_data = '{}'::jsonb,
         banned_until = 'infinity'
   where id = v_uid;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.eliminar_mi_cuenta(text) from public, anon;
grant execute on function public.eliminar_mi_cuenta(text) to authenticated;
