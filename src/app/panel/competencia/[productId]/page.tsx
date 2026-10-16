import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/forms";
import { MarketBar } from "@/components/MarketBar";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { latestCompetitorPrices, marketStats, POSITION_INFO } from "@/lib/market";
import { formatMoney, splitTax } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";
import { deleteCompetitorPrice, searchProduct, setMyPrice } from "../actions";
import { SearchButton } from "@/components/SearchButton";
import { aiEnabled } from "@/lib/ai-research";

export const maxDuration = 300;

const KIND_ICON: Record<string, string> = { fisica: "🏬", online: "🌐", marketplace: "🛍️" };

export default async function ProductBenchmark({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const { org } = await requireSession();
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

  const prices = latestMap.get(product.id) ?? [];
  // En el historial solo interesan los cambios de precio de cada tienda
  const changes = [...history].reverse().filter((h, i, arr) => {
    const prev = arr.slice(0, i).reverse().find((x) => x.competitorId === h.competitorId);
    return !prev || prev.priceCents !== h.priceCents;
  }).reverse();
  const stats = marketStats(product.priceCents, prices);
  const info = POSITION_INFO[stats.position];
  const rate = product.taxRateBp ?? org.taxRateBp;
  const keepAt = (price: number) => (product.costCents ? splitTax(price, rate).base - product.costCents : null);

  // Ranking con "Tú" dentro
  const ranking = [
    ...prices.map((p) => ({ key: p.id, name: p.competitorName, icon: KIND_ICON[p.competitorKind] ?? "🏬", price: p.priceCents, url: p.url, date: p.observedAt, me: false, title: p.note })),
    { key: "me", name: `Tú (${org.name})`, icon: "⭐", price: product.priceCents, url: null, date: null, me: true, title: null },
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
        <Link href="/panel/competencia" className="btn-ghost -ml-3">← Competencia</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="display text-3xl">{product.name}</h1>
          <span className={cn("badge text-sm", info.tone)}>{info.emoji} {info.label}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="font-bold">🏁 Ranking de precios</h2>
          <p className="mb-4 text-sm text-slate-500">
            {stats.count ? `Estás en el puesto ${stats.rank} de ${stats.count + 1} (1 = el más barato).` : "Todavía no hemos encontrado este producto en otras tiendas."}
          </p>
          {stats.count > 0 && <div className="mb-5"><MarketBar my={product.priceCents} min={stats.min} max={stats.max} avg={stats.avg} /></div>}
          <ol className="space-y-1.5">
            {ranking.map((r, i) => (
              <li key={r.key} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", r.me ? "bg-brand-50 ring-2 ring-brand-500" : "bg-slate-50")}>
                <span className="w-6 text-center font-black text-slate-400">{i + 1}</span>
                <span className="text-lg">{r.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate", r.me ? "font-bold text-brand-700" : "font-medium")}>
                    {r.url ? <a href={r.url} target="_blank" className="hover:underline">{r.name} ↗</a> : r.name}
                  </span>
                  {r.date && <span className="block truncate text-xs text-slate-500">{r.title ? `«${r.title}» · ` : ""}visto el {formatDate(r.date)}</span>}
                </span>
                <span className="font-bold tabular-nums">{formatMoney(r.price)}</span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="space-y-6">
          {suggestions.length > 0 && (
            <section className="card p-5">
              <h2 className="font-bold">💡 ¿Cambiar tu precio?</h2>
              <p className="mb-3 text-xs text-slate-500">Ahora lo vendes a {formatMoney(product.priceCents)}{keepAt(product.priceCents) != null ? ` y te quedas ${formatMoney(keepAt(product.priceCents)!)} por unidad` : ""}.</p>
              <div className="space-y-2">
                {suggestions.map((s) => {
                  const keep = keepAt(s.price);
                  return (
                    <form key={s.label} action={setMyPrice.bind(null, product.id)}>
                      <input type="hidden" name="priceCents" value={s.price} />
                      <button className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm transition hover:border-brand-500 hover:bg-brand-50">
                        <span>
                          <span className="block font-semibold">{s.label}</span>
                          {keep != null && (
                            <span className={cn("text-xs", keep > 0 ? "text-emerald-700" : "text-red-600")}>
                              {keep > 0 ? `Te quedarías ${formatMoney(keep)} por unidad` : `Perderías ${formatMoney(-keep)} por unidad`}
                            </span>
                          )}
                        </span>
                        <span className="font-bold tabular-nums">{formatMoney(s.price)}</span>
                      </button>
                    </form>
                  );
                })}
              </div>
            </section>
          )}
          {aiEnabled() && (
            <section className="card p-5">
              <h2 className="mb-1 font-bold">🔎 Actualizar precios</h2>
              <p className="mb-3 text-xs text-slate-500">Lo revisamos gratis una vez al mes. Si quieres, busca ahora (usa una de tus búsquedas extra del día).</p>
              <SearchButton action={searchProduct.bind(null, product.id)} label="Buscar en internet ahora" className="btn-primary w-full" />
            </section>
          )}
        </aside>
      </div>

      {changes.length > 0 && (
        <section className="card">
          <h2 className="border-b border-slate-100 px-5 py-3 font-bold">📜 Cambios de precio</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {changes.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <span>{h.competitor.name} <span className="text-xs text-slate-500">· {formatDate(h.observedAt, true)}</span></span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{formatMoney(h.priceCents)}</span>
                  <form action={deleteCompetitorPrice.bind(null, h.id)}>
                    <ConfirmButton className="text-xs text-slate-400 hover:text-red-600" message="¿Borrar este precio?">✕</ConfirmButton>
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
