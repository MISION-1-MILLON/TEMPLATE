import Link from "next/link";
import { RegisterForm } from "./RegisterForm";
import { SECTOR_LIST } from "@/sectors";

export const metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ sector?: string }> }) {
  const { sector } = await searchParams;
  const sectors = SECTOR_LIST.map((s) => ({ id: s.id, name: s.name, tagline: s.tagline }));
  return (
    <div className="card w-full max-w-2xl p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Crea tu centro de mando</h1>
      <p className="mt-1 text-slate-600">Elige tu sector y lo dejamos preparado: vocabulario, campos y herramientas.</p>
      <RegisterForm sectors={sectors} defaultSector={sector} />
      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta? <Link href="/acceder" className="font-medium text-ink underline-offset-2 hover:underline">Accede</Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-500">¿Trabajas en un negocio que ya usa Nexo? No crees una cuenta: abre el enlace de invitación que te enviaron.</p>
    </div>
  );
}
