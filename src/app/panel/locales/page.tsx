import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmButton } from "@/components/forms";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { startOfToday } from "@/lib/time";
import { setLocationActive } from "./actions";
import { LocationForm } from "./LocationForm";

export const metadata = { title: "Locales" };

export default async function LocationsPage() {
  const { org } = await requirePagePermission("locations.manage");
  const [all, today, members] = await Promise.all([
    db.location.findMany({ where: { orgId: org.id }, orderBy: [{ active: "desc" }, { createdAt: "asc" }] }),
    db.sale.groupBy({ by: ["locationId"], where: { orgId: org.id, status: { not: "cancelled" }, createdAt: { gte: startOfToday() } }, _sum: { totalCents: true }, _count: true }),
    db.membership.findMany({ where: { orgId: org.id, role: { in: ["manager", "staff"] } }, select: { locationIds: true } }),
  ]);
  const sales = new Map(today.map((t) => [t.locationId, t]));
  const open = all.filter((l) => l.active);
  const team = (id: string) => members.filter((m) => m.locationIds.length === 0 || m.locationIds.includes(id)).length;

  return (
    <>
      <PageHeader title="Locales" subtitle="Cada local lleva su caja, su stock y su equipo. Las ventas y los informes se pueden ver por local o juntos." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="card">
          <ul className="divide-y divide-slate-100">
            {all.map((l) => {
              const s = sales.get(l.id);
              return (
                <li key={l.id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium">{l.name}</span>
                          {!l.active && <span className="badge-neutral">Cerrado</span>}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{[l.address, `${l.opensAt}–${l.closesAt}`].filter(Boolean).join(" · ")}</span>
                      </span>
                      {l.active && (
                        <span className="hidden text-right sm:block">
                          <span className="num block text-sm font-medium">{formatMoney(s?._sum.totalCents ?? 0)}</span>
                          <span className="block text-xs text-slate-500">hoy · {s?._count ?? 0} tickets</span>
                        </span>
                      )}
                      {l.active && (
                        <span className="hidden w-20 text-right md:block">
                          <span className="num block text-sm font-medium">{team(l.id)}</span>
                          <span className="block text-xs text-slate-500">en el equipo</span>
                        </span>
                      )}
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out group-open:rotate-180" strokeWidth={1.75} />
                    </summary>
                    <div className="animate-fade space-y-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                      <LocationForm values={{ id: l.id, name: l.name, address: l.address ?? "", opensAt: l.opensAt, closesAt: l.closesAt }} />
                      <form action={setLocationActive.bind(null, l.id, !l.active)} className="border-t border-slate-200 pt-3">
                        {l.active ? (
                          open.length > 1
                            ? <ConfirmButton className="btn-ghost btn-sm -ml-2 text-negative" message={`¿Cerrar ${l.name}? Dejará de aparecer en el panel; sus ventas, caja y stock se conservan.`}>Cerrar este local</ConfirmButton>
                            : <p className="text-xs text-slate-500">Es tu único local abierto.</p>
                        ) : (
                          <button className="btn-secondary btn-sm">Volver a abrir</button>
                        )}
                      </form>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="card p-5 lg:sticky lg:top-8">
          <h2 className="card-title">Abrir otro local</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500">Empieza sin stock; añade las existencias desde el catálogo con el local seleccionado arriba a la izquierda.</p>
          <LocationForm values={{ name: "", address: "", opensAt: "10:00", closesAt: "22:00" }} />
        </aside>
      </div>
    </>
  );
}
