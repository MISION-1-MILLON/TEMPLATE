import { ConfirmButton } from "@/components/forms";
import { PageHeader, Stat } from "@/components/PageHeader";
import { SearchButton } from "@/components/SearchButton";
import { aiEnabled } from "@/lib/ai-research";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { latestSupplierOffers, MEDALS, UNITS } from "@/lib/market";
import { formatMoney } from "@/lib/money";
import { DAILY_LIMIT, lastSearchedAt, searchesLeftToday } from "@/lib/research";
import { cn, formatDate } from "@/lib/utils";
import { addSupplyItem, chooseSupplier, deleteSupplier, deleteSupplyItem, detectSuppliesAction, searchAllSupplies, searchSupplyItem } from "./actions";

export const metadata = { title: "Proveedores" };
export const maxDuration = 300;

export default async function SuppliersPage() {
  const { org } = await requireSession();
  const [items, suppliers, offers, searched, left] = await Promise.all([
    db.supplyItem.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" }, include: { product: { select: { name: true } } } }),
    db.supplier.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" }, include: { _count: { select: { prices: true } } } }),
    latestSupplierOffers(org.id),
    lastSearchedAt(org.id, "supplier"),
    searchesLeftToday(org),
  ]);
  const enabled = aiEnabled();

  const cards = items.map((item) => {
    const list = offers.get(item.id) ?? [];
    const cheapest = list[0];
    const current = list.find((o) => o.supplierId === item.currentSupplierId);
    const saving = current && cheapest && cheapest.priceCents < current.priceCents ? current.priceCents - cheapest.priceCents : 0;
    return { item, list, cheapest, current, saving };
  });
  const withSaving = cards.filter((c) => c.saving > 0);

  return (
    <>
      <PageHeader title="Proveedores" subtitle="Lo que compras para tu negocio, con los proveedores ordenados del más barato al más caro." />

      <section className="card mb-6 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 to-white p-5">
        <div className="max-w-xl">
          <p className="font-bold">🚚 Búsqueda automática de proveedores</p>
          <p className="text-sm text-slate-600">
            {enabled
              ? items.length === 0
                ? "Miramos tu catálogo, deducimos qué compras y buscamos quién te lo vende más barato."
                : `Revisamos los precios solos cada semana. Te quedan ${left} de ${DAILY_LIMIT[org.plan] ?? DAILY_LIMIT.free} búsquedas hoy.`
              : "Pendiente de activar: falta configurar la clave de búsqueda en el servidor."}
          </p>
        </div>
        {enabled && (
          <div className="w-full sm:w-auto">
            {items.length === 0 ? (
              <SearchButton action={detectSuppliesAction} label="✨ Detectar lo que compro" className="btn-primary w-full sm:w-auto" />
            ) : (
              <SearchButton action={searchAllSupplies} label="Buscar proveedores ahora" className="btn-primary w-full sm:w-auto" />
            )}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="📦 Cosas que compras" value={String(items.length)} />
        <Stat label="🏭 Proveedores encontrados" value={String(suppliers.length)} />
        <Stat label="💸 Podrías pagar menos en" value={String(withSaving.length)} hint={withSaving.length ? "Mira los avisos en verde" : "Ya compras al mejor precio que conocemos"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          {cards.length === 0 && (
            <p className="card p-6 text-sm text-slate-600">Aún no sabemos qué compras. Pulsa «Detectar lo que compro» y lo deducimos de tu catálogo.</p>
          )}
          {cards.map(({ item, list, cheapest, current, saving }) => (
            <article key={item.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">{item.name}</h2>
                  <p className="text-xs text-slate-500">
                    Precio por {UNITS[item.unit] ?? item.unit}, sin IVA
                    {item.product && <> · se revende como «{item.product.name}»</>}
                    {searched.get(item.id) && <> · buscado el {formatDate(searched.get(item.id)!)}</>}
                  </p>
                </div>
                <form action={deleteSupplyItem.bind(null, item.id)}>
                  <ConfirmButton className="text-xs text-slate-400 hover:text-red-600" message={`¿Quitar «${item.name}» de lo que compras?`}>Quitar</ConfirmButton>
                </form>
              </div>

              {saving > 0 && cheapest && current && (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  💡 Con <strong>{cheapest.supplierName}</strong> pagarías {formatMoney(saving)} menos por {UNITS[item.unit] ?? item.unit} ({Math.round((saving / current.priceCents) * 100)} % menos que tu proveedor actual).
                </p>
              )}

              {list.length === 0 ? (
                <div className="mt-3">
                  {enabled ? (
                    <SearchButton action={searchSupplyItem.bind(null, item.id)} label="🔎 Buscar proveedores" className="btn-secondary" compact />
                  ) : (
                    <p className="text-sm text-slate-500">Sin proveedores todavía.</p>
                  )}
                </div>
              ) : (
                <ol className="mt-3 space-y-1.5">
                  {list.slice(0, 6).map((o, i) => {
                    const supplier = suppliers.find((s) => s.id === o.supplierId);
                    const isCurrent = o.supplierId === item.currentSupplierId;
                    const pct = i > 0 && cheapest ? Math.round(((o.priceCents - cheapest.priceCents) / cheapest.priceCents) * 100) : 0;
                    return (
                      <li key={o.id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", isCurrent ? "bg-brand-50 ring-2 ring-brand-500" : i === 0 ? "bg-amber-50" : "bg-slate-50")}>
                        <span className="w-7 text-center text-lg">{MEDALS[i] ?? <span className="text-sm font-black text-slate-400">{i + 1}</span>}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {supplier?.website ? <a href={supplier.website} target="_blank" rel="noreferrer" className="hover:underline">{o.supplierName} ↗</a> : o.supplierName}
                            {isCurrent && <span className="badge ml-2 bg-brand-100 text-brand-700">Tu proveedor</span>}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {[o.minOrder && `Pedido mínimo: ${o.minOrder}`, i > 0 && (pct > 0 ? `+${pct} % que el más barato` : "Casi igual que el más barato")].filter(Boolean).join(" · ") || "El más barato"}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block font-bold tabular-nums">{formatMoney(o.priceCents)}</span>
                          <span className="flex justify-end gap-2 text-xs">
                            {supplier?.phone && <a href={`tel:${supplier.phone}`} className="text-brand-600">Llamar</a>}
                            {!isCurrent && (
                              <form action={chooseSupplier.bind(null, item.id, o.supplierId)}>
                                <button className="text-brand-600 hover:underline">Elegir</button>
                              </form>
                            )}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </article>
          ))}

          {items.length > 0 && (
            <form action={addSupplyItem} className="card flex flex-wrap items-center gap-2 p-4">
              <span className="text-sm text-slate-600">¿Falta algo que compras?</span>
              <input className="input min-w-0 flex-1" name="name" placeholder="Ej.: aceite de oliva" required />
              <select className="input w-auto" name="unit" defaultValue="unidad">
                {Object.entries(UNITS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="btn-secondary">Añadir y buscar</button>
            </form>
          )}
        </section>

        <aside>
          <section className="card">
            <h2 className="border-b border-slate-100 px-5 py-3 font-bold">Proveedores encontrados</h2>
            {suppliers.length === 0 ? (
              <p className="px-5 py-3 text-sm text-slate-500">Aparecerán aquí cuando busquemos.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.website ? <a href={s.website} target="_blank" rel="noreferrer" className="hover:text-brand-600">{s.name} ↗</a> : s.name}</span>
                      <span className="text-xs text-slate-500">{s.phone ? `📞 ${s.phone} · ` : ""}{s._count.prices} precios</span>
                    </span>
                    <form action={deleteSupplier.bind(null, s.id)}>
                      <ConfirmButton className="text-xs text-slate-400 hover:text-red-600" message={`¿Quitar a ${s.name}?`}>Quitar</ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
