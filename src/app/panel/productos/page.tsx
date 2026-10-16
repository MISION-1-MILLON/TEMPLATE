import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { asAttributes, formatAttribute } from "@/lib/attributes";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; archived?: string }> }) {
  const { q, cat, archived } = await searchParams;
  const { org, sector } = await requireSession();
  const t = sector.terms;
  const listFields = sector.productFields.filter((f) => f.showInList).slice(0, 3);

  const where: Prisma.ProductWhereInput = {
    orgId: org.id,
    active: archived !== "1",
    ...(cat ? { categoryId: cat } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const [products, categories] = await Promise.all([
    db.product.findMany({ where, orderBy: { name: "asc" }, include: { category: true }, take: 500 }),
    db.category.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title={t.products}
        subtitle={`${products.length} ${products.length === 1 ? t.product.toLowerCase() : t.products.toLowerCase()}`}
        actions={<Link href="/panel/productos/nuevo" className="btn-primary">Añadir {t.product.toLowerCase()}</Link>}
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" placeholder="Buscar por nombre o referencia" defaultValue={q} />
        <select className="input max-w-[200px]" name="cat" defaultValue={cat ?? ""}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 px-2 text-sm text-slate-600">
          <input type="checkbox" name="archived" value="1" defaultChecked={archived === "1"} /> Archivados
        </label>
        <button className="btn-secondary">Filtrar</button>
      </form>

      {products.length === 0 ? (
        <EmptyState title={`No hay ${t.products.toLowerCase()} que mostrar`}>
          <Link href="/panel/productos/nuevo" className="font-semibold text-brand-600">Añade el primero</Link>
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t.product}</th>
                <th>Categoría</th>
                {listFields.map((f) => <th key={f.key}>{f.label}</th>)}
                <th className="text-right">Precio</th>
                <th className="text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const attrs = asAttributes(p.attributes);
                const low = p.trackStock && p.stock <= p.lowStockAt;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td>
                      <Link href={`/panel/productos/${p.id}`} className="flex items-center gap-3 font-medium hover:text-brand-600">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
                        ) : (
                          <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-xs font-bold text-slate-400">
                            {p.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span>
                          {p.name}
                          {p.sku && <span className="block text-xs font-normal text-slate-500">{p.sku}</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="text-slate-600">{p.category?.name ?? "—"}</td>
                    {listFields.map((f) => <td key={f.key} className="text-slate-600">{formatAttribute(f, attrs[f.key]) || "—"}</td>)}
                    <td className="text-right font-semibold tabular-nums">{formatMoney(p.priceCents)}</td>
                    <td className="text-right tabular-nums">
                      {p.trackStock ? <span className={low ? "font-semibold text-red-600" : ""}>{p.stock}</span> : <span className="text-slate-400">—</span>}
                    </td>
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
