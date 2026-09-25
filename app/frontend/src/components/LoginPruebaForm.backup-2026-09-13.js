"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";

// Login de prueba: para poder probar la app con varios "usuarios"
// distintos sin tener que crear cuentas de Gmail reales. A partir de
// Nombre + Apellido arma un email falso y usa el apellido como
// contraseña, contra el mecanismo REAL de Supabase Auth (no es un login
// inventado aparte).
// No dibuja su propia tarjeta: el componente padre (LoginForm) es el
// dueño de esa tarjeta compartida. Arranca colapsado (solo un botón) y
// al tocarlo despliega el formulario debajo, en el mismo lugar. Al
// loguearse redirige a /perfil, igual que el login con Google (para
// probar con otro usuario de prueba, se cierra sesión desde /perfil).
export default function LoginPruebaForm() {
  const router = useRouter();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Boton "Entrar" deshabilitado hasta que los dos campos esten
  // completos (y el apellido tenga el largo minimo que exige la
  // contrasena de Supabase).
  const formularioCompleto = nombre.trim() !== "" && apellido.trim().length >= 6;

  function armarEmail(nombreCrudo) {
    const limpio = nombreCrudo
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // saca acentos
      .replace(/[^a-z0-9]/g, ""); // saca espacios y símbolos
    return `${limpio}@test.local`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const email = armarEmail(nombre);
    // Antes se usaba el apellido tal cual escrito (case-sensitive) como
    // contraseña -- si la primera vez se tipeó "Perez" y la siguiente
    // "perez", Supabase las trata como contraseñas distintas: el login
    // fallaba silenciosamente y cae al signUp de abajo, que como el
    // usuario YA existe, no deja entrar (2026-09-12, a pedido del
    // usuario: "pongo un usuario creado... y lo intenta crear en vez de
    // dejarme entrar"). Se normaliza a minúsculas, igual que el email.
    const password = apellido.trim().toLowerCase();

    if (password.length < 6) {
      setError(
        "El apellido tiene que tener al menos 6 letras (Supabase exige contraseñas de 6 caracteres como mínimo)."
      );
      return;
    }

    setCargando(true);

    // 1. Probamos iniciar sesión primero (usuario de prueba ya existente).
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!loginError) {
      router.push("/");
      return;
    }

    // 2. Si no existía, lo registramos (crea el usuario y lo loguea).
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setCargando(false);

    if (signUpError) {
      // Supabase devuelve el mismo tipo de error tanto si el usuario no
      // existe como si existe pero la contraseña está mal (por diseño,
      // para no revelar qué emails están registrados) -- como acá ya
      // sabemos que el signIn también falló, lo más probable es que el
      // apellido tipeado no sea el mismo que la primera vez.
      const yaExistia = /already registered|already exists/i.test(signUpError.message);
      setError(
        yaExistia
          ? "Ya existe un usuario de prueba con ese nombre, pero el apellido (contraseña) no coincide con el que usaste la primera vez."
          : `No se pudo iniciar sesión ni crear el usuario: ${signUpError.message}`
      );
      return;
    }

    router.push("/");
  }

  if (!mostrarFormulario) {
    return (
      <button
        onClick={() => setMostrarFormulario(true)}
        className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
      >
        Entrar con usuario de prueba
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-t-2 border-outline/30 pt-4"
    >
      <p className="text-muted text-xs">
        Solo para testing: ingresá un nombre y un apellido para crear o
        entrar a un usuario de prueba (sin usar Gmail real).
      </p>

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">Nombre</span>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="rounded-xl bg-bg px-3 py-2 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">
          Apellido (se usa como contraseña, mínimo 6 letras)
        </span>
        <input
          type="text"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          required
          className="rounded-xl bg-bg px-3 py-2 text-ink"
        />
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={cargando || !formularioCompleto}
        className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {cargando && <PelotaLoader />}
        {cargando ? "Ingresando..." : "Entrar"}
      </button>
    </form>
  );
}
