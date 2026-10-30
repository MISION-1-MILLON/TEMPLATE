import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Search } from "lucide-react";
import { EmptyState, FilterChips, PageHeader } from "@/components/PageHeader";
import { requireLocation, requirePagePermission } from "@/lib/auth";
import { asAttributes, formatAttribute } from "@/lib/attributes";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Catálogo" };

type Query = { q?: string; cat?: string; ver?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const { q, cat, ver } = query;
  await requirePagePermission("stock.view");
  const { org, sector, location, locations, can } = await requireLocation();
  const t = sector.terms;
  const manage = can("products.manage");
  const listFields = manage ? sector.productFields.filter((f) => f.showInList).slice(0, 2) : [];

  const where: Prisma.ProductWhereInput = {
    orgId: org.id,
    active: ver !== "archivados",
    ...(!manage || ver === "stock" || ver === "bajo" ? { trackStock: true } : {}),
    ...(cat ? { categoryId: cat } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const [all, categories, stock] = await Promise.all([
    db.product.findMany({ where, orderBy: { name: "asc" }, include: { category: true }, take: 500 }),
    db.category.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    db.productStock.findMany({ where: { product: { orgId: org.id }, locationId: { in: locations.map((l) => l.id) } } }),
  ]);
  const qty = new Map(stock.map((s) => [`${s.productId}:${s.locationId}`, s.quantity]));
  const at = (productId: string, locationId: string) => qty.get(`${productId}:${locationId}`) ?? 0;
  const isLow = (p: (typeof all)[number]) => p.trackStock && at(p.id, location.id) <= p.lowStockAt;
  const products = ver === "bajo" ? all.filter(isLow) : all;
  const lowCount = all.filter(isLow).length;
  // Con varios locales, quien los ve todos compara el stock de cada uno
  const cols = locations.length > 1 ? locations : [location];

  const href = (patch: Partial<Query>) => {
    const next = { ...query, ...patch };
    const params = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1])));
    return `/panel/productos${params.size ? `?${params}` : ""}`;
  };
  const views = [
    { id: undefined, label: manage ? "Todo" : "Con stock" },
    ...(manage ? [{ id: "stock", label: "Con stock" }] : []),
    { id: "bajo", label: lowCount ? `Por reponer · ${lowCount}` : "Por reponer" },
    ...(manage ? [{ id: "archivados", label: "Archivados" }] : []),
  ];

  return (
    <>
      <PageHeader
        title={manage ? t.products : "Stock"}
        subtitle={manage ? undefined : `Lo que queda en ${location.name}. Toca uno para apuntar una entrada, un recuento o una merma.`}
        actions={manage && <Link href="/panel/productos/nuevo" className="btn-primary">Añadir {t.product.toLowerCase()}</Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative w-full sm:w-64">
          {cat && <input type="hidden" name="cat" value={cat} />}
          {ver && <input type="hidden" name="ver" value={ver} />}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
          <input className="input pl-9" name="q" placeholder="Buscar por nombre o referencia" defaultValue={q} aria-label="Buscar" />
        </form>
        <FilterChips items={views.map((v) => ({ label: v.label, href: href({ ver: v.id }), active: ver === v.id }))} />
        {categories.length > 1 && (
          <FilterChips items={[{ id: undefined, name: "Todas" }, ...categories].map((c) => ({ label: c.name, href: href({ cat: c.id }), active: cat === c.id }))} />
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState
          title={ver === "bajo" ? "Nada por reponer" : q ? `Nada coincide con «${q}»` : `Aún no hay ${t.products.toLowerCase()}`}
          action={manage && !q && !ver ? <Link href="/panel/productos/nuevo" className="btn-primary">Añadir {t.product.toLowerCase()}</Link> : undefined}
        >
          {ver === "bajo" ? `Todo lo que controlas tiene stock suficiente en ${location.name}.` : manage && !q && !ver ? "Lo que vendes es la base de todo: aparecerá en el TPV, en la tienda online y en los informes." : undefined}
        </EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>{t.product}</th>
                <th className="hidden md:table-cell">Categoría</th>
                {listFields.map((f) => <th key={f.key} className="hidden lg:table-cell">{f.label}</th>)}
                {manage && <th className="text-right">Precio</th>}
                {cols.map((l) => (
                  <th key={l.id} className={cn("text-right", l.id !== location.id && "hidden sm:table-cell")}>{cols.length > 1 ? l.name : "Stock"}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const attrs = asAttributes(p.attributes);
                return (
                  <tr key={p.id} className="relative hover:bg-slate-50">
                    <td>
                      <Link href={`/panel/productos/${p.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                        ) : (
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-slate-400">{p.name.slice(0, 2).toUpperCase()}</span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{p.name}</span>
                          {p.sku && <span className="block truncate text-xs text-slate-500">{p.sku}</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="hidden text-slate-600 md:table-cell">{p.category?.name ?? "—"}</td>
                    {listFields.map((f) => <td key={f.key} className="hidden text-slate-600 lg:table-cell">{formatAttribute(f, attrs[f.key]) || "—"}</td>)}
                    {manage && <td className="num text-right font-medium">{formatMoney(p.priceCents)}</td>}
                    {cols.map((l) => {
                      const n = at(p.id, l.id);
                      const low = p.trackStock && n <= p.lowStockAt;
                      return (
                        <td key={l.id} className={cn("num text-right", l.id !== location.id && "hidden text-slate-500 sm:table-cell")}>
                          {!p.trackStock ? <span className="text-slate-400">—</span>
                            : <span className={cn(low && (n <= 0 ? "badge-negative" : "badge-warning"))}>{n}</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
