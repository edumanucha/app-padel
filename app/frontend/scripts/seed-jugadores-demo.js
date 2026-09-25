// Script de seed (cubre MEJ-016 del backlog): crea jugadores de prueba con
// ranking variado, para que el directorio/ranking no se vea vacío en
// demos. A pedido explícito del usuario (2026-09-05).
//
// Cada jugador es una cuenta REAL de Supabase Auth (perfiles.id referencia
// auth.users.id, no se puede insertar un perfil "suelto") -- se crea con
// el mismo mecanismo que el login de prueba de la Épica 1 (email+contraseña
// derivados, sin pasar por Google). Los puntos de ranking se asignan
// directo (no jugaron partidos reales, no hay otra forma de tener puntos).
//
// Uso: node scripts/seed-jugadores-demo.js   (parado en app/frontend)

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function cargarEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const contenido = fs.readFileSync(envPath, "utf-8");
  const vars = {};
  contenido.split("\n").forEach((linea) => {
    const match = linea.match(/^([A-Z_]+)=(.*)$/);
    if (match) vars[match[1]] = match[2].trim();
  });
  return vars;
}

const env = cargarEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// La contraseña de las cuentas demo vive en .env.local (SEED_DEMO_PASSWORD),
// no en el código: el repo es público (2026-09-25).
const PASSWORD_DEMO = env.SEED_DEMO_PASSWORD;
if (!PASSWORD_DEMO) {
  console.error("Falta SEED_DEMO_PASSWORD en .env.local");
  process.exit(1);
}

const NOMBRES = [
  "Lucas", "Martina", "Facundo", "Valentina", "Nicolás", "Camila", "Tomás", "Sofía",
  "Agustín", "Julieta", "Franco", "Micaela", "Bruno", "Antonella", "Ignacio", "Delfina",
  "Santiago", "Florencia", "Joaquín", "Catalina", "Mateo", "Abril", "Emiliano", "Rocío",
  "Gonzalo", "Milagros", "Federico", "Josefina", "Ramiro", "Victoria", "Lautaro", "Guadalupe",
  "Maximiliano", "Pilar", "Rodrigo", "Lucía", "Alejo", "Morena", "Benjamín", "Ornella",
  "Cristian", "Agostina", "Diego", "Candela", "Matías", "Zoe", "Leandro", "Malena",
  "Sebastián", "Brisa",
];
const APELLIDOS = [
  "Gómez", "Fernández", "Rodríguez", "López", "Martínez", "Díaz", "Pérez", "Sánchez",
  "Romero", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores", "Acosta", "Benítez",
  "Medina", "Herrera", "Suárez", "Rojas", "Vega", "Molina", "Ortiz", "Silva", "Núñez",
];

const ZONAS = ["ciudad_de_mendoza", "godoy_cruz", "guaymallen", "las_heras", "lujan_de_cuyo", "maipu"];
const MANOS = ["diestro", "zurdo"];
const POSICIONES = ["drive", "reves"];
const SEXOS = ["masculino", "femenino"];

function elegir(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function generarJugador(i) {
  const nombre = elegir(NOMBRES);
  const apellido = elegir(APELLIDOS);
  return {
    nombreCompleto: `${nombre} ${apellido} (demo ${i})`,
    email: `demo.jugador.${i}@seed.local`,
    password: PASSWORD_DEMO,
    sexo: elegir(SEXOS),
    zona: elegir(ZONAS),
    nivel: 1 + Math.floor(Math.random() * 7),
    manoHabil: elegir(MANOS),
    posicion: elegir(POSICIONES),
    // Variado a propósito: desde "recién empezando" hasta "juega hace
    // años", para que el ranking no se vea todos iguales.
    puntosRanking: Math.floor(Math.random() * 1200),
  };
}

async function main() {
  let creados = 0;
  let yaExistian = 0;

  for (let i = 1; i <= 50; i++) {
    const j = generarJugador(i);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: j.email,
      password: j.password,
    });

    if (signUpError) {
      console.log(`[${i}] No se pudo crear la cuenta (${j.email}): ${signUpError.message}`);
      continue;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      console.log(`[${i}] signUp no devolvió usuario para ${j.email}, se salta.`);
      continue;
    }

    const { error: perfilError } = await supabase.from("perfiles").insert({
      id: userId,
      nombre: j.nombreCompleto,
      telefono: "2610000000",
      sexo: j.sexo,
      provincia: "mendoza",
      zona: j.zona,
      nivel: j.nivel,
      mano_habil: j.manoHabil,
      posicion: j.posicion,
      puntos_ranking: j.puntosRanking,
    });

    if (perfilError) {
      if (perfilError.code === "23505") {
        yaExistian++;
      } else {
        console.log(`[${i}] Cuenta creada pero falló el perfil (${j.email}): ${perfilError.message}`);
      }
      continue;
    }

    creados++;
    console.log(`[${i}] OK: ${j.nombreCompleto} — ${j.puntosRanking} pts`);

    // Evita saturar el rate-limit de signups de Supabase Auth.
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nListo. Creados: ${creados}. Ya existían: ${yaExistian}.`);
}

main().catch((e) => {
  console.error("Error inesperado:", e);
  process.exit(1);
});
