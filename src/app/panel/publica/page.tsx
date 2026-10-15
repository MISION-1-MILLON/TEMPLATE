import { PageHeader } from "@/components/PageHeader";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { requireSession } from "@/lib/auth";
import { asAttributes, formatAttribute } from "@/lib/attributes";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getModule, planIncludes } from "@/lib/modules";
import { PostComposer } from "./PostComposer";

export const metadata = { title: "Publica" };

export default async function PublishPage() {
  const { org, sector } = await requireSession();
  const mod = getModule("publica");
  if (!planIncludes(org.plan, mod.plan)) return <UpgradeNotice module={mod} />;

  const products = await db.product.findMany({ where: { orgId: org.id, active: true }, orderBy: { updatedAt: "desc" } });
  const items = products.map((p) => {
    const attrs = asAttributes(p.attributes);
    const vars: Record<string, string> = { nombre: p.name, precio: formatMoney(p.priceCents), negocio: org.name, descripcion: p.description ?? "" };
    for (const f of sector.productFields) vars[f.key] = formatAttribute(f, attrs[f.key]);
    return { id: p.id, name: p.name, vars };
  });

  return (
    <>
      <PageHeader title="Publica" subtitle="Textos listos para redes y portales a partir de tu ficha de producto." />
      <PostComposer
        items={items}
        templates={sector.postTemplates}
        hashtags={sector.hashtags}
        storeUrlPath={org.storeEnabled ? `/t/${org.slug}` : null}
        productLabel={sector.terms.product}
      />
    </>
  );
}
