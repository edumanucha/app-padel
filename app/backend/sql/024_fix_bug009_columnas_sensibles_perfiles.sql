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
