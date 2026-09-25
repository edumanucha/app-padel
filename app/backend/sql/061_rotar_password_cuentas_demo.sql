-- La contraseña de las cuentas demo (demo.jugador.N@seed.local) quedó
-- expuesta en el repo público el 2026-09-25. Acá se reemplaza por una
-- contraseña aleatoria distinta por cuenta, que nadie conoce: las cuentas
-- demo siguen existiendo (ranking, directorio, partidos), pero ya nadie
-- puede iniciar sesión con ellas.
--
-- Si más adelante se vuelve a correr scripts/seed-jugadores-demo.js, crea
-- cuentas nuevas con la contraseña de SEED_DEMO_PASSWORD (.env.local).
update auth.users
set encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
    updated_at = now()
where email like 'demo.jugador.%@seed.local';
