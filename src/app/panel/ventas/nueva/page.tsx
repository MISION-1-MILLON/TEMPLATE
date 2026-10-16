import { PageHeader } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PointOfSale } from "./PointOfSale";

export const metadata = { title: "Nueva venta" };

export default async function NewSalePage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const { org, sector } = await requireSession();
  const [products, customers, categories] = await Promise.all([
    db.product.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" } }),
    db.customer.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Vender" subtitle="Toca lo que se lleva y pulsa cobrar. Del resto nos encargamos nosotros." />
      <PointOfSale
        terms={sector.terms}
        categories={categories}
        customers={customers}
        defaultCustomerId={customers.some((c) => c.id === cliente) ? cliente! : ""}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          priceCents: p.priceCents,
          stock: p.stock,
          trackStock: p.trackStock,
          categoryId: p.categoryId,
          imageUrl: p.imageUrl,
        }))}
      />
    </>
  );
}
