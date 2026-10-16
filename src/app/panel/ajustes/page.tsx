import { PageHeader } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { SECTOR_LIST } from "@/sectors";
import { changeSector } from "./actions";
import { BillingSection } from "./BillingSection";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ pago?: string; detalle?: string }> }) {
  const { pago, detalle } = await searchParams;
  const { org, sector } = await requireSession();
  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="space-y-6">
        <SettingsForm
          values={{
            name: org.name, slug: org.slug, taxId: org.taxId ?? "", address: org.address ?? "", phone: org.phone ?? "",
            email: org.email ?? "", invoicePrefix: org.invoicePrefix, taxRate: String(org.taxRateBp / 100),
          }}
        />

        <section className="card p-6">
          <h2 className="font-bold">Sector</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ahora: <strong>{sector.name}</strong>. Cambiarlo adapta campos, vocabulario y plantillas. No se borra ningún dato.
          </p>
          <form action={changeSector} className="mt-4 flex flex-wrap gap-2">
            <select name="sector" className="input max-w-xs" defaultValue={sector.id}>
              {SECTOR_LIST.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn-secondary">Cambiar sector</button>
          </form>
        </section>

        <BillingSection org={org} status={pago} detail={detalle} />
      </div>
    </>
  );
}
