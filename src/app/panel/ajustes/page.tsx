import { PageHeader } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { SECTOR_LIST } from "@/sectors";
import { changeSector, savePoolSettings } from "./actions";
import { BRAND } from "@/lib/brand";
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

        <section id="bolsa" className="card p-6">
          <h2 className="font-bold">🤝 Bolsa de productos</h2>
          <p className="mt-1 text-sm text-slate-500">
            La bolsa junta los productos de todos los negocios de {BRAND.name} para que cada uno vea a qué precio se venden.
            Solo se comparte el <strong>nombre y el precio de venta</strong> de tus productos. Lo que te cuestan, tus ventas y tus clientes nunca se comparten.
          </p>
          <form action={savePoolSettings} className="mt-4 space-y-3 text-sm">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="poolShare" defaultChecked={org.poolShare} className="mt-0.5 h-4 w-4" />
              <span><strong>Participar en la bolsa.</strong> Si lo desactivas, tus productos no salen a otros negocios.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="poolPublic" defaultChecked={org.poolPublic} className="mt-0.5 h-4 w-4" />
              <span><strong>Aparecer con mi nombre</strong> y un enlace a mi tienda online. Si no, sales como «Un negocio de tu ciudad».</span>
            </label>
            <button className="btn-secondary">Guardar</button>
          </form>
        </section>

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
