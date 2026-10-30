import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireModule } from "@/lib/auth";
import { asAttributes } from "@/lib/attributes";
import { db } from "@/lib/db";
import { formatMoney, splitTax } from "@/lib/money";
import { PriceCalculator } from "./PriceCalculator";

export const metadata = { title: "Precios y márgenes" };

export default async function PricingPage() {
  const { org, sector } = await requireModule("precio");
  const products = await db.product.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" } });
  const hasReference = sector.productFields.some((f) => f.key === "precio_reventa");

  const rows = products
    .map((p) => {
      const rate = p.taxRateBp ?? org.taxRateBp;
      const { base } = splitTax(p.priceCents, rate);
      const margin = base - p.costCents;
      const pct = base > 0 ? (margin / base) * 100 : 0;
      const ref = Number(asAttributes(p.attributes).precio_reventa ?? 0) * 100;
      return { p, base, margin, pct, ref };
    })
    .sort((a, b) => a.pct - b.pct);

  const withCost = rows.filter((r) => r.p.costCents > 0);
  const avg = withCost.length ? withCost.reduce((a, r) => a + r.pct, 0) / withCost.length : 0;

  return (
    <>
      <PageHeader title="Precios y márgenes" subtitle="A cuánto vender y cuánto te queda de verdad con cada cosa." />
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-8"><PriceCalculator defaultTax={org.taxRateBp / 100} /></div>
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Lo que te queda con cada {sector.terms.product.toLowerCase()}</h2>
            <span className="text-sm text-slate-500">Media <span className="num font-medium text-ink">{avg.toFixed(0)} %</span></span>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{sector.terms.product}</th>
                  <th className="text-right">Te costó</th>
                  <th className="text-right">Lo vendes a</th>
                  <th className="text-right">Ganas</th>
                  {hasReference && <th className="text-right">Ref. mercado</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, margin, pct, ref }) => (
                  <tr key={p.id}>
                    <td><Link href={`/panel/productos/${p.id}`} className="hover:underline">{p.name}</Link></td>
                    <td className="num text-right">{p.costCents ? formatMoney(p.costCents) : <Link href={`/panel/productos/${p.id}`} className="badge-neutral">Añadir coste</Link>}</td>
                    <td className="num text-right">{formatMoney(p.priceCents)}</td>
                    <td className="num text-right">
                      {p.costCents ? (
                        <span className={pct < 20 ? "font-medium text-negative" : pct < 35 ? "text-warning" : "text-ink"}>
                          {formatMoney(margin)} · {pct.toFixed(0)} %
                        </span>
                      ) : "—"}
                    </td>
                    {hasReference && (
                      <td className="num text-right">
                        {ref ? (
                          <span className={ref > p.priceCents ? "text-positive" : "text-slate-600"} title={ref > p.priceCents ? "Estás por debajo del mercado" : ""}>
                            {formatMoney(ref)}
                          </span>
                        ) : "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-xs text-slate-500">«Ganas» es lo que te queda después de pagar lo que te costó y el IVA. En rojo, los que te dejan menos del 20 %: plantéate subirles el precio.</p>
        </section>
      </div>
    </>
  );
}
