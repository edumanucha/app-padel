import LoginForm from "@/components/LoginForm";

// Ruta: /login
export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <LoginForm />
    </main>
  );
}
