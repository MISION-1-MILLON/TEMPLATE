import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { BolsaView } from "./BolsaView";
import { InternetView } from "./InternetView";

export const metadata = { title: "Proveedores" };
export const maxDuration = 300;

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams;
  const internet = vista === "internet";
  return (
    <>
      <PageHeader title="Proveedores" subtitle="Dónde conseguir lo que vendes y lo que compras, al mejor precio." />
      <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:inline-flex">
        <Link href="/panel/proveedores" className={cn("flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold", !internet ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
          🤝 Bolsa de productos
        </Link>
        <Link href="/panel/proveedores?vista=internet" className={cn("flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold", internet ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
          🔎 Buscar en internet
        </Link>
      </div>
      {internet ? <InternetView /> : <BolsaView />}
    </>
  );
}
