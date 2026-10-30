import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Acceder" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="card w-full max-w-sm p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Accede a tu panel</h1>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Aún no tienes cuenta? <Link href="/registro" className="font-medium text-ink underline-offset-2 hover:underline">Empieza gratis</Link>
      </p>
    </div>
  );
}
