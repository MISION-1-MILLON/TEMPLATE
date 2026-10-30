import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/forms";
import { ModuleIcon } from "@/components/ModuleIcon";
import { requireSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { MODULES, planIncludes } from "@/lib/modules";
import { SECTOR_LIST } from "@/sectors";
import { changeSector, saveModules, savePoolSettings } from "./actions";
import { BillingSection } from "./BillingSection";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ pago?: string; detalle?: string }> }) {
  const { pago, detalle } = await searchParams;
  const { org, sector, can } = await requireSession();
  const settings = can("settings.manage");
  const billing = can("billing.manage");
  if (!settings && !billing) notFound();

  const sections = [
    ...(settings ? [["negocio", "Datos del negocio"], ["herramientas", "Herramientas"], ["sector", "Sector"], ["bolsa", "Bolsa de productos"]] : []),
    ...(billing ? [["plan", "Plan y facturación"]] : []),
  ];
  const optional = MODULES.filter((m) => !m.core);

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid items-start gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <nav className="sticky top-8 hidden space-y-0.5 text-sm lg:block" aria-label="Secciones">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="block rounded-md px-2.5 py-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-ink">{label}</a>
          ))}
        </nav>
        <div className="min-w-0 space-y-6">
          {settings && (
            <>
              <div id="negocio" className="scroll-mt-8">
                <SettingsForm
                  values={{
                    name: org.name, slug: org.slug, taxId: org.taxId ?? "", address: org.address ?? "", phone: org.phone ?? "",
                    email: org.email ?? "", invoicePrefix: org.invoicePrefix, taxRate: String(org.taxRateBp / 100),
                  }}
                />
              </div>

              <form id="herramientas" action={saveModules} className="card scroll-mt-8">
                <div className="px-6 pt-6">
                  <h2 className="card-title">Herramientas</h2>
                  <p className="mt-1 text-sm text-slate-500">Enciende solo lo que use tu negocio. Lo apagado desaparece del menú de todo el equipo; los datos se conservan.</p>
                </div>
                <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                  {optional.map((m) => {
                    const soon = m.status === "soon";
                    const included = planIncludes(org.plan, m.plan);
                    return (
                      <li key={m.id}>
                        <label className={`flex items-center gap-4 px-6 py-3.5 ${soon ? "opacity-60" : "cursor-pointer hover:bg-slate-50"}`}>
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><ModuleIcon id={m.id} className="h-[18px] w-[18px]" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              {m.name}
                              {soon ? <span className="badge-neutral">Pronto</span> : !included && <span className="badge-brand">{m.plan === "pro" ? "Pro" : "Business"}</span>}
                            </span>
                            <span className="block text-xs text-slate-500">{m.summary}</span>
                          </span>
                          <input type="checkbox" name="modules" value={m.id} defaultChecked={org.modules.includes(m.id)} disabled={soon} className="switch" />
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <div className="px-6 py-4"><SubmitButton className="btn-secondary btn-sm">Guardar herramientas</SubmitButton></div>
              </form>

              <section id="sector" className="card scroll-mt-8 p-6">
                <h2 className="card-title">Sector</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ahora: <span className="font-medium text-ink">{sector.name}</span>. Cambiarlo adapta los campos, el vocabulario y las plantillas. No se borra ningún dato.
                </p>
                <form action={changeSector} className="mt-4 flex flex-wrap gap-2">
                  <select name="sector" className="input max-w-xs" defaultValue={sector.id} aria-label="Sector">
                    {SECTOR_LIST.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <SubmitButton className="btn-secondary">Cambiar sector</SubmitButton>
                </form>
              </section>

              <section id="bolsa" className="card scroll-mt-8 p-6">
                <h2 className="card-title">Bolsa de productos</h2>
                <p className="mt-1 text-sm text-slate-500">
                  La bolsa junta los productos de los negocios de {BRAND.name} para que cada uno vea a qué precio se venden.
                  Solo se comparte el nombre y el precio de venta; lo que te cuestan, tus ventas y tus clientes nunca salen de aquí.
                </p>
                <form action={savePoolSettings} className="mt-4 space-y-3 text-sm">
                  <label className="flex cursor-pointer items-start justify-between gap-4">
                    <span><span className="font-medium">Participar en la bolsa</span><span className="block text-slate-500">Si lo apagas, tus productos no se muestran a otros negocios.</span></span>
                    <input type="checkbox" name="poolShare" defaultChecked={org.poolShare} className="switch mt-0.5" />
                  </label>
                  <label className="flex cursor-pointer items-start justify-between gap-4">
                    <span><span className="font-medium">Aparecer con mi nombre</span><span className="block text-slate-500">Con un enlace a tu tienda online. Si no, sales como «Un negocio de tu ciudad».</span></span>
                    <input type="checkbox" name="poolPublic" defaultChecked={org.poolPublic} className="switch mt-0.5" />
                  </label>
                  <SubmitButton className="btn-secondary btn-sm">Guardar</SubmitButton>
                </form>
              </section>
            </>
          )}
          {billing && <BillingSection org={org} status={pago} detail={detalle} />}
        </div>
      </div>
    </>
  );
}
