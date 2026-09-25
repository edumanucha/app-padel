// Un único lugar donde se crea el cliente de Supabase, para no repetir
// esta configuración en cada archivo que necesite hablar con la base de datos.
// Si en el futuro cambia la forma de inicializarlo (por ejemplo, para usar
// la service_role key en alguna operación admin), se cambia acá una sola vez.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Falla rápido y con un mensaje claro en vez de un error críptico más
  // adelante cuando se intente usar un cliente mal configurado.
  throw new Error(
    'Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY en el archivo .env. ' +
    'Copiá .env.example a .env y completá los valores de tu proyecto en supabase.com.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = supabase;
