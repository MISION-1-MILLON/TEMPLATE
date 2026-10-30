import Link from "next/link";
import { Figures } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { poolDiscover, poolMatches, poolSize } from "@/lib/pool";
import { cn } from "@/lib/utils";

/** Bolsa común: los productos de todos los negocios, ordenados por interés para este cliente */
export async function BolsaView() {
  const { org, sector } = await requireSession();
  const t = sector.terms;
  const [mine, categories, size] = await Promise.all([
    db.product.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, priceCents: true, attributes: true } }),
    db.category.findMany({ where: { orgId: org.id }, select: { name: true } }),
    poolSize(),
  ]);
  const [matches, discover] = await Promise.all([
    poolMatches(org.id, mine),
    poolDiscover(org, mine, categories.map((c) => c.name)),
  ]);

  const withMatches = mine
    .map((p) => ({ p, list: matches.get(p.id) ?? [] }))
    .filter((r) => r.list.length > 0)
    // Primero donde otros lo venden más barato que yo (lo más interesante)
    .sort((a, b) => (b.p.priceCents - b.list[0].priceCents) / b.p.priceCents - (a.p.priceCents - a.list[0].priceCents) / a.p.priceCents);
  const cheaperElsewhere = withMatches.filter((r) => r.list[0].priceCents < r.p.priceCents).length;
  const others = size.orgs;

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <p className="font-medium">La bolsa de {BRAND.name}</p>
        <p className="mt-0.5 text-sm text-slate-500">
          Los productos de todos los negocios que usan {BRAND.name}, en un solo sitio. Te enseñamos primero lo que más te interesa.
          Sin búsquedas ni costes: cuantos más negocios se unen, más completa es.
        </p>
        {!org.poolShare && (
          <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            Ahora mismo no compartes tus productos en la bolsa. <Link href="/panel/ajustes#bolsa" className="font-medium underline">Actívalo en Ajustes</Link> para que la bolsa crezca para todos.
          </p>
        )}
      </section>

      <Figures
        items={[
          { label: "Alguien lo tiene más barato", value: String(cheaperElsewhere), hint: cheaperElsewhere ? "Mira abajo dónde" : "Tienes buenos precios", tone: cheaperElsewhere ? "warning" : undefined },
          { label: `Tus ${t.products.toLowerCase()} en otros negocios`, value: `${withMatches.length} de ${mine.length}` },
          { label: "Productos en la bolsa", value: size.products.toLocaleString("es-ES"), hint: `De ${others} ${others === 1 ? "negocio" : "negocios"}` },
        ]}
      />

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Lo que tú vendes</h2>
        <p className="mb-3 text-sm text-slate-500">Los mismos productos en otros negocios, del más barato al más caro.</p>
        {withMatches.length === 0 ? (
          <p className="card p-6 text-sm text-slate-500">
            {mine.length === 0 ? `Añade tus ${t.products.toLowerCase()} y te enseñaremos quién más los vende.` : "Todavía nadie más vende lo mismo que tú en la bolsa. Según se unan negocios irán apareciendo."}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {withMatches.map(({ p, list }) => {
              const best = list[0];
              const diff = p.priceCents - best.priceCents;
              const pct = Math.round((diff / p.priceCents) * 100);
              return (
                <article key={p.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="text-xs text-slate-500">Tú lo vendes a <span className="num font-medium text-ink">{formatMoney(p.priceCents)}</span></span>
                    </span>
                    <span className={diff > 0 ? "badge-warning" : diff === 0 ? "badge-neutral" : "badge-positive"}>
                      {diff > 0 ? `Hay uno ${pct} % más barato` : diff === 0 ? "Igual que el más barato" : "Tienes el mejor precio"}
                    </span>
                  </div>
                  <ol className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                    {list.slice(0, 4).map((x, i) => (
                      <li key={x.id} className="flex items-center gap-2 py-2 text-sm">
                        <span className={cn("num w-5 text-center text-xs", i === 0 ? "font-semibold text-ink" : "text-slate-400")}>{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{x.sellerUrl ? <a href={x.sellerUrl} target="_blank" rel="noreferrer" className="hover:underline">{x.seller} ↗</a> : x.seller}</span>
                          <span className="block truncate text-xs text-slate-500">«{x.name}»</span>
                        </span>
                        <span className={cn("num", i === 0 ? "font-semibold" : "font-medium text-slate-600")}>{formatMoney(x.priceCents)}</span>
                      </li>
                    ))}
                  </ol>
                  {list.length > 4 && <p className="mt-1 text-xs text-slate-500">y {list.length - 4} más</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Te puede interesar</h2>
        <p className="mb-3 text-sm text-slate-500">Productos de la bolsa que tú aún no tienes, ordenados por lo que más encaja con tu negocio.</p>
        {discover.length === 0 ? (
          <p className="card p-6 text-sm text-slate-600">Aún no hay productos que encajen con tu negocio. Vuelve cuando se unan más negocios de tu sector.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discover.map(({ item, reasons }) => (
              <article key={item.id} className="card flex gap-3 p-4">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-400">{item.name.slice(0, 2).toUpperCase()}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-sm"><span className="num font-semibold">{formatMoney(item.priceCents)}</span> <span className="text-xs text-slate-500">· {item.sellerUrl ? <a href={item.sellerUrl} target="_blank" rel="noreferrer" className="hover:underline">{item.seller} ↗</a> : item.seller}</span></p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {reasons.slice(0, 2).map((r) => <span key={r} className="badge-neutral">{r}</span>)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
