// Configuración de la app Express, separada de "arrancar a escuchar".
// Por qué: así podemos importar `app` desde un test (Playwright/Jest,
// o un script de verificación) sin necesariamente levantar un puerto real
// cada vez -- es una práctica estándar para que el código sea testeable.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// GET /health -> confirma que el servidor está vivo.
// Patrón estándar: cualquier servicio real expone un endpoint así para
// que herramientas de monitoreo (o nosotros, en Postman más adelante)
// puedan chequear el estado sin tocar lógica de negocio.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'app-padel-backend' });
});

// GET /health/supabase -> confirma que el backend puede autenticarse y
// hablar con Supabase usando las credenciales del .env, SIN exponer esas
// credenciales en la respuesta ni en los logs.
//
// Truco: como todavía no existe ninguna tabla real, consultamos una tabla
// que sabemos que no existe. Si Supabase responde con el error específico
// "la tabla no existe" (código 42P01), significa que la URL y la API key
// SÍ son válidas y que llegamos hasta la base de datos -- solo falta esa
// tabla, que es justamente lo que esperamos en este punto del proyecto.
// Cualquier otro tipo de error (401, timeout, etc.) indica un problema
// real de configuración.
app.get('/health/supabase', async (req, res) => {
  const supabase = require('./supabaseClient');

  const { error } = await supabase
    .from('__conexion_de_prueba_no_existe__')
    .select('*')
    .limit(1);

  // Supabase (PostgREST) puede devolver el "no existe" con distintos
  // códigos según la versión: el código Postgres crudo (42P01) o el
  // código propio de PostgREST cuando no encuentra la tabla en su
  // cache de esquema (PGRST205). Aceptamos cualquiera de los dos como
  // prueba válida de que la conexión y la autenticación funcionan.
  const esTablaInexistente =
    error && (error.code === '42P01' || error.code === 'PGRST205');

  if (esTablaInexistente) {
    // "relation does not exist" -> llegamos hasta Postgres autenticados.
    return res.json({
      status: 'ok',
      message: 'Conexión a Supabase verificada correctamente (URL y API key válidas).',
    });
  }

  if (error) {
    return res.status(502).json({
      status: 'error',
      message: 'No se pudo verificar la conexión a Supabase.',
      detail: error.message,
    });
  }

  // Caso inesperado: si esa tabla llegara a existir de verdad.
  res.json({ status: 'ok', message: 'Conexión a Supabase verificada.' });
});

module.exports = app;
