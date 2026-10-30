import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asAttributes, formatAttribute } from "@/lib/attributes";
import { BRAND } from "@/lib/brand";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSector } from "@/sectors";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const org = await db.organization.findUnique({ where: { slug }, include: { locations: { where: { active: true }, orderBy: { createdAt: "asc" } } } });
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
  const sorted = [...groups.entries()].sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b));
  const anchor = (cat: string) => `c-${cat.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto max-w-4xl px-4 pb-6 pt-12 sm:px-6">
        <p className="text-sm text-slate-500">{sector.terms.store}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">{org.name}</h1>
        <ul className="mt-4 space-y-1 text-sm text-slate-600">
          {(org.locations.length ? org.locations : [{ id: "x", name: "", address: org.address, opensAt: "", closesAt: "" }]).map((l) => (
            <li key={l.id}>
              {org.locations.length > 1 && <span className="font-medium text-ink">{l.name} · </span>}
              {l.address ?? org.address}
              {l.opensAt && <span className="num text-slate-500"> · {l.opensAt}–{l.closesAt}</span>}
            </li>
          ))}
        </ul>
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp.length === 9 ? `34${whatsapp}` : whatsapp}`} className="btn-primary mt-5">
            Escríbenos por WhatsApp
          </a>
        )}
      </header>

      {sorted.length > 1 && (
        <nav className="sticky top-0 z-10 border-y border-slate-200 bg-canvas/90 backdrop-blur" aria-label="Categorías">
          <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
            {sorted.map(([cat]) => <a key={cat} href={`#${anchor(cat)}`} className="whitespace-nowrap rounded-full px-3 py-1 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-ink">{cat}</a>)}
          </div>
        </nav>
      )}

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {products.length === 0 && <p className="py-16 text-center text-slate-500">Pronto tendremos novedades por aquí.</p>}
        {sorted.map(([cat, items]) => (
          <section key={cat} id={anchor(cat)} className="mb-12 scroll-mt-16">
            <h2 className="mb-4 text-xl font-semibold tracking-tight">{cat}</h2>
            <div className="card divide-y divide-slate-100">
              {items.map((p) => {
                const attrs = asAttributes(p.attributes);
                const soldOut = p.trackStock && p.stock <= 0;
                const details = detailFields
                  .map((f) => ({ f, v: formatAttribute(f, attrs[f.key]) }))
                  .filter((d) => d.v);
                return (
                  <article key={p.id} className={`flex gap-4 p-4 ${soldOut ? "opacity-60" : ""}`}>
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-24 w-24 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium">{p.name}</h3>
                        <span className="num shrink-0 font-semibold">{formatMoney(p.priceCents, org.currency)}</span>
                      </div>
                      {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
                      {details.length > 0 && (
                        <p className="mt-2 flex flex-wrap gap-1">
                          {details.map(({ f, v }) => (
                            <span key={f.key} className="badge-neutral">
                              {f.type === "boolean" ? f.label : `${f.label}: ${v}`}
                            </span>
                          ))}
                        </p>
                      )}
                      {soldOut && <p className="mt-2"><span className="badge-neutral">Agotado</span></p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </main>
      <footer className="py-10 text-center text-xs text-slate-500">Hecho con {BRAND.name}</footer>
    </div>
  );
}
