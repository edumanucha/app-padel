-- Aviso al celu del superusuario cuando alguien crea su cuenta (2026-10-10,
-- pedido del usuario). El aviso de la campana ya existía (082); ahora además
-- llega como notificación push y abre /admin/estadisticas. El "ya son N"
-- cuenta igual que las estadísticas (sin demo, sin cuentas de prueba).
-- Correr después de 097.

create or replace function public.avisar_usuario_nuevo()
returns trigger as $$
declare
  v_total integer;
  v_super record;
begin
  if coalesce(new.es_demo, false) or coalesce(new.es_superusuario, false) then return new; end if;
  select count(*) into v_total from public.usuarios_para_metricas();
  for v_super in select id from public.perfiles where es_superusuario = true loop
    insert into public.notificaciones (jugador_id, tipo, mensaje)
    values (v_super.id, 'usuario_nuevo', 'Se unió alguien nuevo a Padelito: ya son ' || v_total || ' usuarios. Tocá para ver las estadísticas.');
  end loop;
  return new;
exception when others then
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Igual que el 084, más el tipo usuario_nuevo.
create or replace function public.enviar_push_notificacion()
returns trigger as $$
declare
  v_config record;
  v_subs jsonb;
  v_titulo text;
  v_url text;
begin
  v_titulo := case new.tipo
    when 'marcadorcito_nuevo' then 'Empezó tu partido'
    when 'mensaje_nuevo' then 'Mensaje nuevo'
    when 'invitacion_partido' then 'Te invitaron a jugar'
    when 'partido_cargado' then 'Cargaron un partido tuyo'
    when 'resultado_corregido' then 'Corrigieron un resultado'
    when 'partido_cancelado' then 'Partido cancelado'
    when 'usuario_nuevo' then 'Usuario nuevo en Padelito'
    else null
  end;
  if v_titulo is null then
    return new;
  end if;

  select url, secreto into v_config from public.push_config where id = 1;
  if v_config.url is null then
    return new;
  end if;

  select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
    into v_subs
    from public.push_suscripciones s
   where s.jugador_id = new.jugador_id;
  if v_subs is null then
    return new;
  end if;

  v_url := case
    when new.tipo = 'mensaje_nuevo' then '/mensajes'
    when new.tipo = 'invitacion_partido' then '/invitaciones'
    when new.tipo = 'usuario_nuevo' then '/admin/estadisticas'
    when new.tipo = 'marcadorcito_nuevo' and new.partido_id is not null then '/partido/' || new.partido_id || '/marcador'
    when new.partido_id is not null then '/partido/' || new.partido_id
    else '/'
  end;

  perform net.http_post(
    url := v_config.url,
    body := jsonb_build_object(
      'suscripciones', v_subs,
      'titulo', v_titulo,
      'cuerpo', new.mensaje,
      'url', v_url,
      'etiqueta', new.tipo || coalesce(':' || new.partido_id::text, '')
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secreto', v_config.secreto),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  -- el push nunca frena la notificación de la campana
  return new;
end;
$$ language plpgsql security definer set search_path = public, net;

-- Para revisar: ¿tenés el celu suscripto a las notificaciones?
select count(*) as celus_suscriptos_del_superusuario
  from public.push_suscripciones s
  join public.perfiles p on p.id = s.jugador_id
 where p.es_superusuario;
