import { PageHeader } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { PLANS } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { SECTOR_LIST } from "@/sectors";
import { changePlan, changeSector } from "./actions";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage() {
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

        <section id="plan" className="card p-6">
          <h2 className="font-bold">Plan</h2>
          <p className="mt-1 text-sm text-slate-500">El cobro con tarjeta (Stripe) está pendiente de conectar; de momento el cambio es inmediato.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {PLANS.map((p) => (
              <form key={p.id} action={changePlan} className={cn("rounded-xl border p-4", org.plan === p.id ? "border-brand-600 ring-1 ring-brand-600" : "border-slate-200")}>
                <input type="hidden" name="plan" value={p.id} />
                <p className="display text-xl uppercase">{p.name}</p>
                <p className="text-sm text-slate-500">{p.priceMonthly} €/mes</p>
                <button className="btn-secondary mt-3 w-full" disabled={org.plan === p.id}>
                  {org.plan === p.id ? "Plan actual" : "Cambiar"}
                </button>
              </form>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
