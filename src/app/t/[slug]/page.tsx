import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asAttributes, formatAttribute } from "@/lib/attributes";
import { BRAND } from "@/lib/brand";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSector } from "@/sectors";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const org = await db.organization.findUnique({ where: { slug } });
  if (!org || !org.storeEnabled) return null;
  return org;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const org = await load((await params).slug);
  return { title: org ? `${org.name} · ${getSector(org.sector).terms.store}` : "No encontrado" };
}

export default async function PublicStore({ params }: { params: Promise<{ slug: string }> }) {
  const org = await load((await params).slug);
  if (!org) notFound();
  const sector = getSector(org.sector);

  const products = await db.product.findMany({
    where: { orgId: org.id, active: true, published: true },
    orderBy: { name: "asc" },
    include: { category: true },
  });
  const groups = new Map<string, typeof products>();
  for (const p of products) {
    const key = p.category?.name ?? "Otros";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const detailFields = sector.productFields.filter((f) => f.key !== "precio_reventa");
  // Primero las categorías del sector en su orden natural (entrantes → postres), luego el resto
  const order = (cat: string) => {
    const i = sector.defaultCategories.indexOf(cat);
    return i === -1 ? 999 : i;
  };
  const whatsapp = org.phone?.replace(/[^\d]/g, "");

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 bg-ink px-4 py-10 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{sector.terms.store}</p>
        <h1 className="display mt-2 text-4xl">{org.name}</h1>
        {org.address && <p className="mt-2 text-sm text-slate-300">{org.address}</p>}
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp.length === 9 ? `34${whatsapp}` : whatsapp}`} className="btn mt-4 bg-emerald-500 text-white hover:bg-emerald-600">
            Escríbenos por WhatsApp
          </a>
        )}
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {products.length === 0 && <p className="py-16 text-center text-slate-500">Pronto tendremos novedades por aquí.</p>}
        {[...groups.entries()].sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b)).map(([cat, items]) => (
          <section key={cat} className="mb-10">
            <h2 className="display mb-4 text-2xl">{cat}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((p) => {
                const attrs = asAttributes(p.attributes);
                const soldOut = p.trackStock && p.stock <= 0;
                const details = detailFields
                  .map((f) => ({ f, v: formatAttribute(f, attrs[f.key]) }))
                  .filter((d) => d.v);
                return (
                  <article key={p.id} className={`card flex gap-4 p-4 ${soldOut ? "opacity-60" : ""}`}>
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-24 w-24 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{p.name}</h3>
                        <span className="shrink-0 font-bold tabular-nums">{formatMoney(p.priceCents, org.currency)}</span>
                      </div>
                      {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
                      {details.length > 0 && (
                        <p className="mt-2 flex flex-wrap gap-1">
                          {details.map(({ f, v }) => (
                            <span key={f.key} className="badge bg-slate-100 text-slate-600">
                              {f.type === "boolean" ? f.label : `${f.label}: ${v}`}
                            </span>
                          ))}
                        </p>
                      )}
                      {soldOut && <p className="mt-2 text-xs font-semibold uppercase text-red-600">Agotado</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </main>
      <footer className="py-8 text-center text-xs text-slate-400">Hecho con {BRAND.name}</footer>
    </div>
  );
}
