import { PageHeader } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductForm } from "../ProductForm";
import { newProductLabel } from "@/sectors";

export default async function NewProductPage() {
  const { org, sector } = await requireSession();
  const categories = await db.category.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader title={newProductLabel(sector.terms)} />
      <ProductForm
        productLabel={sector.terms.product}
          productFeminine={sector.terms.productFeminine}
          examplePlaceholder={sector.demoProducts[0]?.name}
        fields={sector.productFields}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        defaultTaxRate={String(org.taxRateBp / 100)}
        values={{
          name: "", sku: "", description: "", imageUrl: "", price: "", cost: "", taxRate: "",
          stock: 0, trackStock: sector.trackStockByDefault, lowStockAt: 2, published: true, categoryId: "", attributes: {},
        }}
      />
    </>
  );
}
