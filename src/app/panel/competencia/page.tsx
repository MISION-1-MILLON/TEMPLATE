import Link from "next/link";
import { ConfirmButton } from "@/components/forms";
import { MarketBar } from "@/components/MarketBar";
import { FilterChips, Figures, PageHeader } from "@/components/PageHeader";
import { SearchButton } from "@/components/SearchButton";
import { aiEnabled } from "@/lib/ai-research";
import { requireModule } from "@/lib/auth";
import { db } from "@/lib/db";
import { latestCompetitorPrices, marketStats, POSITION_INFO, type MarketPosition } from "@/lib/market";
import { formatMoney } from "@/lib/money";
import { DAILY_LIMIT, lastSearchedAt, searchesLeftToday } from "@/lib/research";
import { poolMatches } from "@/lib/pool";
import { cn, formatDate } from "@/lib/utils";
import { deleteCompetitor, searchAllProducts, searchProduct } from "./actions";

export const metadata = { title: "Competencia" };
export const maxDuration = 300;

const KIND_LABEL: Record<string, string> = { fisica: "Tienda física", online: "Web", marketplace: "Marketplace" };

export default async function CompetitionPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const { org, sector } = await requireModule("competencia");
  const t = sector.terms;

  const [products, competitors, latest, searched, left] = await Promise.all([
    db.product.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, priceCents: true, attributes: true } }),
    db.competitor.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" }, include: { _count: { select: { prices: true } } } }),
    latestCompetitorPrices(org.id),
    lastSearchedAt(org.id, "market"),
    searchesLeftToday(org),
  ]);

  // Precios de internet + precios de la bolsa de otros negocios de la plataforma
  const pool = await poolMatches(org.id, products);
  const rows = products.map((p) => ({
    p,
    stats: marketStats(p.priceCents, [...(latest.get(p.id) ?? []), ...(pool.get(p.id) ?? [])]),
    when: searched.get(p.id),
    inPool: pool.get(p.id)?.length ?? 0,
  }));
  const compared = rows.filter((r) => r.stats.count > 0);
  const cheaper = compared.filter((r) => ["cheapest", "below"].includes(r.stats.position)).length;
  const pricier = compared.filter((r) => ["above", "most_expensive"].includes(r.stats.position)).length;
  const enabled = aiEnabled();

  const order: MarketPosition[] = ["most_expensive", "above", "average", "below", "cheapest", "nodata"];
  const filtered = rows
    .filter((r) => (ver === "caros" ? ["above", "most_expensive"].includes(r.stats.position) : ver === "sin" ? r.stats.count === 0 : true))
    .sort((a, b) => order.indexOf(a.stats.position) - order.indexOf(b.stats.position) || b.stats.diffPct - a.stats.diffPct);

  return (
    <>
      <PageHeader title="Competencia" subtitle="Comparamos tus precios con otros negocios de la plataforma y con internet, y te decimos si estás caro o barato." />

      <section className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="max-w-xl">
          <p className="font-medium">Búsqueda automática en internet</p>
          <p className="mt-0.5 text-sm text-slate-500">
            {enabled
              ? `Revisamos gratis los precios de tus ${t.products.toLowerCase()} una vez al mes, sin que hagas nada. Si quieres buscar antes, te quedan ${left} de ${DAILY_LIMIT[org.plan] ?? DAILY_LIMIT.free} búsquedas extra hoy.`
              : "Pendiente de activar: falta configurar la clave de búsqueda en el servidor."}
          </p>
        </div>
        {enabled && products.length > 0 && (
          <div className="w-full sm:w-auto">
            <SearchButton action={searchAllProducts} label="Buscar precios ahora" className="btn-primary w-full sm:w-auto" />
          </div>
        )}
      </section>

      <Figures
        items={[
          { label: "Más caros que la media", value: String(pricier), hint: pricier ? "Revisa si se están vendiendo" : "Nada por encima del mercado", tone: pricier ? "warning" : undefined },
          { label: "Más baratos que la media", value: String(cheaper), hint: "Buen gancho para atraer clientes" },
          { label: "Comparados", value: `${compared.length} de ${products.length}`, hint: products.length - compared.length ? `${products.length - compared.length} sin datos todavía` : "Todo comparado" },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <div className="mb-3">
            <FilterChips items={[["", "Todos"], ["caros", "Donde estoy caro"], ["sin", "Sin datos"]].map(([k, label]) => ({ label, href: k ? `?ver=${k}` : "?", active: (ver ?? "") === k }))} />
          </div>
          {products.length === 0 ? (
            <p className="card p-6 text-sm text-slate-600">Primero añade tus {t.products.toLowerCase()}: en cuanto lo hagas, buscamos sus precios en internet.</p>
          ) : filtered.length === 0 ? (
            <p className="card p-6 text-center text-sm text-slate-500">Nada en esta lista.</p>
          ) : (
            <ul className="card divide-y divide-slate-100">
              {filtered.map(({ p, stats, when, inPool }) => {
                const info = POSITION_INFO[stats.position];
                return (
                  <li key={p.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/panel/competencia/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                      <span className={info.badge}>{info.label}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <span className="shrink-0 text-sm">
                        <span className="block text-xs text-slate-500">Tú</span>
                        <span className="num font-semibold">{formatMoney(p.priceCents)}</span>
                      </span>
                      {stats.count > 0 ? (
                        <>
                          <Link href={`/panel/competencia/${p.id}`} className="min-w-0 flex-1"><MarketBar my={p.priceCents} min={stats.min} max={stats.max} avg={stats.avg} /></Link>
                          <span className="hidden shrink-0 text-right text-xs text-slate-500 sm:block">
                            {stats.count} {stats.count === 1 ? "tienda" : "tiendas"}
                            <span className={cn("num block font-medium", stats.diffPct > 0 ? "text-warning" : "text-positive")}>
                              {stats.diffPct > 0 ? "+" : ""}{stats.diffPct.toFixed(0)} % vs media
                            </span>
                          </span>
                        </>
                      ) : enabled ? (
                        <div className="flex-1"><SearchButton action={searchProduct.bind(null, p.id)} label="Buscar su precio" className="btn-secondary" compact /></div>
                      ) : (
                        <span className="text-sm text-slate-500">Sin datos todavía</span>
                      )}
                    </div>
                    {(when || inPool > 0) && (
                      <p className="mt-2 text-2xs text-slate-500">
                        {[inPool > 0 && `${inPool} en la bolsa`, when && `Buscado en internet el ${formatDate(when)}`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="lg:sticky lg:top-8">
          <section className="card">
            <h2 className="card-header card-title">Tiendas encontradas</h2>
            {competitors.length === 0 ? (
              <p className="px-5 py-3 text-sm text-slate-500">Aparecerán aquí cuando busquemos tus precios.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {competitors.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="hover:underline">{c.name} ↗</a> : c.name}</span>
                      <span className="text-xs text-slate-500">{KIND_LABEL[c.kind] ?? c.kind} · {c._count.prices} precios</span>
                    </span>
                    <form action={deleteCompetitor.bind(null, c.id)}>
                      <ConfirmButton className="btn-ghost btn-sm text-slate-500 hover:text-negative" message={`¿Quitar a ${c.name}? No volverá a contar en tus comparativas hasta la próxima búsqueda.`}>Quitar</ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">¿Sale una tienda que no tiene nada que ver? Quítala y no contará en la media.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
