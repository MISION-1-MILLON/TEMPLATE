import Link from "next/link";
import { RegisterForm } from "./RegisterForm";
import { SECTOR_LIST } from "@/sectors";

export const metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ sector?: string }> }) {
  const { sector } = await searchParams;
  const sectors = SECTOR_LIST.map((s) => ({ id: s.id, name: s.name, tagline: s.tagline, accent: s.accent }));
  return (
    <div className="card w-full max-w-2xl p-6 sm:p-8">
      <h1 className="display text-3xl">Crea tu cuenta gratis</h1>
      <p className="mt-1 text-slate-600">Elige tu sector y dejamos el panel preparado para tu negocio.</p>
      <RegisterForm sectors={sectors} defaultSector={sector} />
      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta? <Link href="/acceder" className="font-semibold text-brand-600">Accede</Link>
      </p>
    </div>
  );
}
