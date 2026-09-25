"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PelotaLoader from "@/components/PelotaLoader";
import { useLocale } from "@/i18n/LocaleContext";

// Login por email real (2026-09-13, a pedido del usuario: "agregar el
// botón de ingresar con cualquier mail"). Alcance original: SOLO iniciar
// sesión, no daba de alta cuentas nuevas -- servía para entrar con un
// email+contraseña que ya existiera (por ejemplo, un usuario de prueba
// creado desde LoginPruebaForm.js).
// Alta real agregada (2026-09-19, a pedido del usuario: "quería
// mostrárselo a mis amigos hoy... que ellos puedan crearse usuarios con
// sus correos"). Ahora tiene dos modos (`login`/`signup`) que comparten
// el mismo formulario de email+contraseña. En signup se usa
// `supabase.auth.signUp` en vez de `signInWithPassword` -- con la
// confirmación de mail activada en Supabase (default), no devuelve
// sesión todavía, así que se muestra un cartel de "revisá tu email" en
// vez de entrar directo; si la confirmación estuviera desactivada,
// `data.session` viene con valor y entra directo, sin pedirle nada más.
// No dibuja su propia tarjeta: el componente padre (LoginForm) es el
// dueño de esa tarjeta compartida. Arranca colapsado, igual que el login
// de prueba.
export default function LoginEmailForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modo, setModo] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [cuentaCreada, setCuentaCreada] = useState(false);

  const formularioCompleto = email.trim() !== "" && password.trim() !== "";

  function cambiarModo(nuevo) {
    setModo(nuevo);
    setError("");
    setCuentaCreada(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    if (modo === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      setCargando(false);

      if (signUpError) {
        const yaExistia = /already registered|already exists/i.test(signUpError.message);
        setError(yaExistia ? t("loginEmail.yaExiste") : `${t("loginEmail.errorCrear")} ${signUpError.message}`);
        return;
      }

      if (data.session) {
        // Confirmación de mail desactivada en Supabase: ya quedó logueado.
        router.push("/");
        return;
      }

      setCuentaCreada(true);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setCargando(false);

    if (loginError) {
      setError(t("loginEmail.credencialesIncorrectas"));
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
        {t("loginEmail.ingresarConEmail")}
      </button>
    );
  }

  if (cuentaCreada) {
    return (
      <div className="flex flex-col gap-2 border-t-2 border-outline/30 pt-4">
        <p className="text-sm">{t("loginEmail.cuentaCreada")}</p>
        <button
          type="button"
          onClick={() => cambiarModo("login")}
          className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer self-start"
        >
          {t("loginEmail.entrar")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t-2 border-outline/30 pt-4">
      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("loginEmail.email")}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-xl bg-bg px-3 py-2 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-heading text-sm">{t("loginEmail.contrasena")}</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
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
        {cargando
          ? modo === "signup"
            ? t("loginEmail.creando")
            : t("loginEmail.ingresando")
          : modo === "signup"
          ? t("loginEmail.crearCuenta")
          : t("loginEmail.entrar")}
      </button>

      <button
        type="button"
        onClick={() => cambiarModo(modo === "login" ? "signup" : "login")}
        className="font-body text-xs text-muted underline self-start cursor-pointer"
      >
        {modo === "login" ? t("loginEmail.irACrearCuenta") : t("loginEmail.irAIniciarSesion")}
      </button>
    </form>
  );
}
