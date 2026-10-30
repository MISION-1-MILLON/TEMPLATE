import { FilterChips, PageHeader } from "@/components/PageHeader";
import { requireModule } from "@/lib/auth";
import { BolsaView } from "./BolsaView";
import { InternetView } from "./InternetView";

export const metadata = { title: "Proveedores" };
export const maxDuration = 300;

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams;
  await requireModule("proveedores");
  const internet = vista === "internet";
  return (
    <>
      <PageHeader title="Proveedores" subtitle="Dónde conseguir lo que vendes y lo que compras, al mejor precio." />
      <div className="mb-6">
        <FilterChips items={[
          { label: "Bolsa de productos", href: "/panel/proveedores", active: !internet },
          { label: "Buscar en internet", href: "/panel/proveedores?vista=internet", active: internet },
        ]} />
      </div>
      {internet ? <InternetView /> : <BolsaView />}
    </>
  );
}
