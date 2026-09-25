// Punto de entrada: toma la app configurada en app.js y la pone a escuchar.
// Separado de app.js para que la configuración de Express sea importable
// (por tests) sin levantar un puerto real cada vez.

const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});
