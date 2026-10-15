import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmButton } from "@/components/forms";
import { requireSession } from "@/lib/auth";
import { asAttributes } from "@/lib/attributes";
import { db } from "@/lib/db";
import { centsToInput } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ProductForm } from "../ProductForm";
import { adjustStock, archiveProduct } from "../actions";

const REASONS: Record<string, string> = { sale: "Venta", cancel: "Anulación de venta", adjust: "Ajuste manual", purchase: "Entrada / compra" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, sector } = await requireSession();
  const [product, categories, movements] = await Promise.all([
    db.product.findFirst({ where: { id, orgId: org.id } }),
    db.category.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    db.stockMovement.findMany({ where: { productId: id, orgId: org.id }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={product.active ? undefined : "Archivado"}
        actions={
          product.active && (
            <form action={archiveProduct.bind(null, product.id)}>
              <ConfirmButton message="¿Archivar este producto? Se ocultará del catálogo pero se mantiene en las ventas pasadas.">Archivar</ConfirmButton>
            </form>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductForm
            productLabel={sector.terms.product}
            fields={sector.productFields}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            defaultTaxRate={String(org.taxRateBp / 100)}
            values={{
              id: product.id,
              name: product.name,
              sku: product.sku ?? "",
              description: product.description ?? "",
              imageUrl: product.imageUrl ?? "",
              price: centsToInput(product.priceCents),
              cost: centsToInput(product.costCents),
              taxRate: product.taxRateBp == null ? "" : String(product.taxRateBp / 100),
              stock: product.stock,
              trackStock: product.trackStock,
              lowStockAt: product.lowStockAt,
              published: product.published,
              categoryId: product.categoryId ?? "",
              attributes: asAttributes(product.attributes),
            }}
          />
        </div>
        {product.trackStock && (
          <aside className="space-y-6">
            <section className="card p-5">
              <p className="text-sm text-slate-500">Stock actual</p>
              <p className="display text-4xl tabular-nums">{product.stock}</p>
              <form action={adjustStock.bind(null, product.id)} className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <input className="input" name="delta" type="number" placeholder="+5 / -2" required />
                  <select className="input" name="reason" defaultValue="purchase">
                    <option value="purchase">Entrada</option>
                    <option value="adjust">Ajuste</option>
                  </select>
                </div>
                <button className="btn-secondary w-full">Actualizar stock</button>
              </form>
            </section>
            <section className="card">
              <h2 className="border-b border-slate-100 px-5 py-3 font-bold">Movimientos</h2>
              <ul className="divide-y divide-slate-100 text-sm">
                {movements.length === 0 && <li className="px-5 py-3 text-slate-500">Sin movimientos.</li>}
                {movements.map((m) => (
                  <li key={m.id} className="flex justify-between px-5 py-2.5">
                    <span>
                      {REASONS[m.reason] ?? m.reason}
                      <span className="block text-xs text-slate-500">{formatDate(m.createdAt, true)}</span>
                    </span>
                    <span className={`font-semibold tabular-nums ${m.delta < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
