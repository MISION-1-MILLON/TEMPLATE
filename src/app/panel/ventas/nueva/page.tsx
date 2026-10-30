import { requireLocation, requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { PointOfSale } from "./PointOfSale";

export const metadata = { title: "Vender" };

export default async function NewSalePage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  await requirePagePermission("sales.create");
  const { org, sector, location, can } = await requireLocation();
  const [products, customers, categories, stock] = await Promise.all([
    db.product.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" } }),
    db.customer.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({ where: { orgId: org.id, products: { some: { active: true } } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.productStock.findMany({ where: { locationId: location.id } }),
  ]);
  const here = new Map(stock.map((s) => [s.productId, s.quantity]));

  return (
    <PointOfSale
      terms={sector.terms}
      locationName={location.name}
      canDiscount={can("sales.discount")}
      categories={categories}
      customers={customers}
      defaultCustomerId={customers.some((c) => c.id === cliente) ? cliente! : ""}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        priceCents: p.priceCents,
        stock: here.get(p.id) ?? 0,
        trackStock: p.trackStock,
        categoryId: p.categoryId,
        imageUrl: p.imageUrl,
      }))}
    />
  );
}
