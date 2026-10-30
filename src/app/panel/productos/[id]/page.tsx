import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmButton } from "@/components/forms";
import { requireLocation, requirePagePermission } from "@/lib/auth";
import { asAttributes } from "@/lib/attributes";
import { db } from "@/lib/db";
import { centsToInput, formatMoney } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";
import { ProductForm } from "../ProductForm";
import { StockAdjust } from "../StockAdjust";
import { archiveProduct } from "../actions";

export const metadata = { title: "Ficha" };

const REASONS: Record<string, string> = {
  sale: "Venta", cancel: "Venta anulada", adjust: "Ajuste", purchase: "Entrada", count: "Recuento", waste: "Merma", transfer: "Traspaso",
};

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePagePermission("stock.view");
  const { org, sector, location, locations, can } = await requireLocation();
  const manage = can("products.manage");
  const visible = locations.map((l) => l.id);
  const [product, categories, movements, stock] = await Promise.all([
    db.product.findFirst({ where: { id, orgId: org.id } }),
    manage ? db.category.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }) : [],
    db.stockMovement.findMany({
      where: { productId: id, orgId: org.id, locationId: { in: visible } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { location: { select: { name: true } } },
    }),
    db.productStock.findMany({ where: { productId: id, locationId: { in: visible } } }),
  ]);
  if (!product || (!manage && !product.trackStock)) notFound();
  const people = new Map(
    (await db.user.findMany({ where: { id: { in: movements.map((m) => m.createdById).filter((x): x is string => !!x) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]),
  );
  const here = stock.find((s) => s.locationId === location.id)?.quantity ?? 0;
  const multi = locations.length > 1;

  const stockPanel = product.trackStock && (
    <aside className="space-y-4 lg:sticky lg:top-8">
      <section className="card p-5">
        <p className="text-sm text-slate-500">En {location.name}</p>
        <p className={cn("num mt-1 text-4xl font-semibold tracking-tight", here <= 0 ? "text-negative" : here <= product.lowStockAt && "text-warning")}>{here}</p>
        <p className="mt-1 text-xs text-slate-500">Aviso cuando queden {product.lowStockAt} o menos.</p>
        {multi && (
          <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            {locations.filter((l) => l.id !== location.id).map((l) => (
              <div key={l.id} className="flex justify-between"><dt className="text-slate-500">{l.name}</dt><dd className="num">{stock.find((s) => s.locationId === l.id)?.quantity ?? 0}</dd></div>
            ))}
          </dl>
        )}
        {can("stock.adjust") && <div className="mt-5 border-t border-slate-100 pt-4"><StockAdjust productId={product.id} current={here} /></div>}
      </section>
      <section className="card">
        <h2 className="card-header card-title">Movimientos</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {movements.length === 0 && <li className="px-5 py-4 text-slate-500">Aún no hay movimientos.</li>}
          {movements.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className="min-w-0">
                <span className="block truncate">{REASONS[m.reason] ?? m.reason}{multi && m.location ? <span className="text-slate-500"> · {m.location.name}</span> : null}</span>
                <span className="num block truncate text-xs text-slate-500">{formatDate(m.createdAt, true)}{m.createdById && people.get(m.createdById) ? ` · ${people.get(m.createdById)}` : ""}</span>
              </span>
              <span className={cn("num font-medium", m.delta < 0 ? "text-slate-600" : "text-positive")}>{m.delta > 0 ? `+${m.delta}` : `−${-m.delta}`}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );

  return (
    <>
      <Link href="/panel/productos" className="btn-ghost btn-sm -ml-2 mb-3"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> {manage ? sector.terms.products : "Stock"}</Link>
      <PageHeader
        title={product.name}
        subtitle={product.active ? (manage ? undefined : formatMoney(product.priceCents)) : "Archivado: no sale en el TPV ni en la tienda."}
        actions={manage && product.active && (
          <form action={archiveProduct.bind(null, product.id)}>
            <ConfirmButton className="btn-ghost text-negative" message="¿Archivar? Se ocultará del catálogo, pero se mantiene en las ventas pasadas.">Archivar</ConfirmButton>
          </form>
        )}
      />
      <div className={cn("grid items-start gap-6", product.trackStock && (manage || product.imageUrl || product.sku || product.description) && "lg:grid-cols-[minmax(0,1fr)_20rem]", !manage && "max-w-3xl")}>
        {manage ? (
          <ProductForm
            productLabel={sector.terms.product}
            productFeminine={sector.terms.productFeminine}
            examplePlaceholder={sector.demoProducts[0]?.name}
            fields={sector.productFields}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            defaultTaxRate={String(org.taxRateBp / 100)}
            showCost={can("finance.profit")}
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
        ) : (product.imageUrl || product.sku || product.description) && (
          <section className="card p-5 text-sm text-slate-600 lg:order-2">
            {product.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt="" className="mb-4 aspect-[4/3] w-full rounded-lg object-cover" />
            )}
            {product.sku && <p>Referencia <span className="num text-ink">{product.sku}</span></p>}
            {product.description && <p className="mt-2">{product.description}</p>}
          </section>
        )}
        {stockPanel}
      </div>
    </>
  );
}
