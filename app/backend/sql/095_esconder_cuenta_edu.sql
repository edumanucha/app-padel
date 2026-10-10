-- Esconde la cuenta "edu" (2026-10-10, pedido del usuario: "es otra mía",
-- "escondela"). Es una cuenta de prueba del propio usuario que había quedado
-- marcada como demo por el 063 y el 093 devolvió a su nombre original. Queda
-- inactiva: no aparece en el directorio, el ranking ni las invitaciones. La
-- cuenta no se borra (se puede seguir entrando).

update public.perfiles p
   set activo = false
  from auth.users u
 where u.id = p.id
   and u.email = 'eduardomanucha@gmail.com';

-- Para revisar: los jugadores reales que ve la gente.
select nombre from public.perfiles where activo order by nombre;
