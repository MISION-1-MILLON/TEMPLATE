import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/forms";
import { MarketBar } from "@/components/MarketBar";
import { ArrowLeft } from "lucide-react";
import { requireModule } from "@/lib/auth";
import { db } from "@/lib/db";
import { latestCompetitorPrices, marketStats, POSITION_INFO } from "@/lib/market";
import { formatMoney, splitTax } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";
import { deleteCompetitorPrice, searchProduct, setMyPrice } from "../actions";
import { poolMatches } from "@/lib/pool";
import { SearchButton } from "@/components/SearchButton";
import { aiEnabled } from "@/lib/ai-research";

export const maxDuration = 300;

const KIND_LABEL: Record<string, string> = { fisica: "Tienda física", online: "Web", marketplace: "Marketplace", bolsa: "Bolsa" };

export default async function ProductBenchmark({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const { org, can } = await requireModule("competencia");
  const profit = can("finance.profit");
  const [product, latestMap, history] = await Promise.all([
    db.product.findFirst({ where: { id: productId, orgId: org.id } }),
    latestCompetitorPrices(org.id, productId),
    db.competitorPrice.findMany({
      where: { orgId: org.id, productId },
      orderBy: { observedAt: "desc" },
      take: 200,
      include: { competitor: { select: { name: true } } },
    }),
  ]);
  if (!product) notFound();

  const poolList = (await poolMatches(org.id, [product])).get(product.id) ?? [];
  const prices = [
    ...(latestMap.get(product.id) ?? []),
    ...poolList.map((x) => ({ id: `pool-${x.id}`, competitorId: x.orgId, competitorName: x.seller, competitorKind: "bolsa", priceCents: x.priceCents, url: x.sellerUrl, note: x.name, observedAt: null as Date | null })),
  ];
  // En el historial solo interesan los cambios de precio de cada tienda
  const changes = [...history].reverse().filter((h, i, arr) => {
    const prev = arr.slice(0, i).reverse().find((x) => x.competitorId === h.competitorId);
    return !prev || prev.priceCents !== h.priceCents;
  }).reverse();
  const stats = marketStats(product.priceCents, prices);
  const info = POSITION_INFO[stats.position];
  const rate = product.taxRateBp ?? org.taxRateBp;
  // Lo que queda por unidad solo lo ve quien puede ver el beneficio
  const keepAt = (price: number) => (profit && product.costCents ? splitTax(price, rate).base - product.costCents : null);

  // Ranking con "Tú" dentro
  const ranking = [
    ...prices.map((p) => ({ key: p.id, name: p.competitorName, kind: KIND_LABEL[p.competitorKind] ?? "", price: p.priceCents, url: p.url, date: p.observedAt, me: false, title: p.note })),
    { key: "me", name: `Tú (${org.name})`, kind: "", price: product.priceCents, url: null, date: null, me: true, title: null },
  ].sort((a, b) => a.price - b.price || (a.me ? -1 : 1));

  const suggestions = stats.count
    ? [
        { label: "Igualar al más barato", price: stats.min },
        { label: "Ponerme en la media", price: stats.avg },
        { label: "Un 5 % por debajo de la media", price: Math.round((stats.avg * 0.95) / 5) * 5 },
      ].filter((s) => s.price > 0 && s.price !== product.priceCents)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/panel/competencia" className="btn-ghost btn-sm -ml-2"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Competencia</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <span className={info.badge}>{info.label}</span>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="card p-5">
          <h2 className="card-title">Ranking de precios</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            {stats.count ? `Estás en el puesto ${stats.rank} de ${stats.count + 1} (1 = el más barato).` : "Todavía no hemos encontrado este producto en otros negocios ni en internet."}
          </p>
          {stats.count > 0 && <div className="mb-5"><MarketBar my={product.priceCents} min={stats.min} max={stats.max} avg={stats.avg} /></div>}
          <ol className="divide-y divide-slate-100 border-t border-slate-100">
            {ranking.map((r, i) => (
              <li key={r.key} className={cn("-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5", r.me && "bg-brand-50")}>
                <span className="num w-6 text-center text-sm text-slate-400">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm", r.me ? "font-semibold text-brand-800" : "font-medium")}>
                    {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">{r.name} ↗</a> : r.name}
                  </span>
                  {(r.date || r.title) && !r.me && (
                    <span className="block truncate text-xs text-slate-500">
                      {[r.kind, r.title && `«${r.title}»`, r.date ? `visto el ${formatDate(r.date)}` : "en la bolsa"].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                <span className="num font-semibold">{formatMoney(r.price)}</span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-8">
          {suggestions.length > 0 && can("products.manage") && (
            <section className="card p-5">
              <h2 className="card-title">¿Cambiar tu precio?</h2>
              <p className="mb-3 mt-1 text-xs text-slate-500">Ahora lo vendes a {formatMoney(product.priceCents)}{keepAt(product.priceCents) != null ? ` y te quedas ${formatMoney(keepAt(product.priceCents)!)} por unidad` : ""}.</p>
              <div className="space-y-2">
                {suggestions.map((s) => {
                  const keep = keepAt(s.price);
                  return (
                    <form key={s.label} action={setMyPrice.bind(null, product.id)}>
                      <input type="hidden" name="priceCents" value={s.price} />
                      <button className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm transition-[border-color,transform] duration-150 ease-out hover:border-slate-400 active:scale-[0.98]">
                        <span>
                          <span className="block font-medium">{s.label}</span>
                          {keep != null && (
                            <span className={cn("text-xs", keep > 0 ? "text-positive" : "text-negative")}>
                              {keep > 0 ? `Te quedarías ${formatMoney(keep)} por unidad` : `Perderías ${formatMoney(-keep)} por unidad`}
                            </span>
                          )}
                        </span>
                        <span className="num font-semibold">{formatMoney(s.price)}</span>
                      </button>
                    </form>
                  );
                })}
              </div>
            </section>
          )}
          {aiEnabled() && (
            <section className="card p-5">
              <h2 className="card-title mb-1">Actualizar precios</h2>
              <p className="mb-3 text-xs text-slate-500">Lo revisamos gratis una vez al mes. Si quieres, busca ahora (usa una de tus búsquedas extra del día).</p>
              <SearchButton action={searchProduct.bind(null, product.id)} label="Buscar en internet ahora" className="btn-primary w-full" />
            </section>
          )}
        </aside>
      </div>

      {changes.length > 0 && (
        <section className="card">
          <h2 className="card-header card-title">Cambios de precio</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {changes.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <span>{h.competitor.name} <span className="text-xs text-slate-500">· {formatDate(h.observedAt, true)}</span></span>
                <span className="flex items-center gap-3">
                  <span className="num font-medium">{formatMoney(h.priceCents)}</span>
                  <form action={deleteCompetitorPrice.bind(null, h.id)}>
                    <ConfirmButton className="btn-ghost btn-sm text-slate-500 hover:text-negative" message="¿Borrar este precio?">Borrar</ConfirmButton>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
