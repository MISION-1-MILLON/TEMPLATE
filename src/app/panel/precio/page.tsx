import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { asAttributes } from "@/lib/attributes";
import { db } from "@/lib/db";
import { formatMoney, splitTax } from "@/lib/money";
import { PriceCalculator } from "./PriceCalculator";

export const metadata = { title: "Precio" };

export default async function PricingPage() {
  const { org, sector } = await requireSession();
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
      <PageHeader title="Calcular precios" subtitle="Descubre a cuánto vender y cuánto ganas de verdad con cada cosa." />
      <div className="grid gap-6 lg:grid-cols-3">
        <PriceCalculator defaultTax={org.taxRateBp / 100} />
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="font-bold">¿Cuánto ganas con cada {sector.terms.product.toLowerCase()}?</h2>
            <span className="text-sm text-slate-500">De media te quedas el <strong>{avg.toFixed(0)} %</strong></span>
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
                    <td><Link href={`/panel/productos/${p.id}`} className="hover:text-brand-600">{p.name}</Link></td>
                    <td className="text-right tabular-nums">{p.costCents ? formatMoney(p.costCents) : <span className="text-slate-400">¿?</span>}</td>
                    <td className="text-right tabular-nums">{formatMoney(p.priceCents)}</td>
                    <td className="text-right tabular-nums">
                      {p.costCents ? (
                        <span className={pct < 20 ? "font-semibold text-red-600" : pct < 35 ? "text-amber-600" : "text-emerald-700"}>
                          {formatMoney(margin)} · {pct.toFixed(0)} %
                        </span>
                      ) : "—"}
                    </td>
                    {hasReference && (
                      <td className="text-right tabular-nums">
                        {ref ? (
                          <span className={ref > p.priceCents ? "text-emerald-700" : "text-slate-600"} title={ref > p.priceCents ? "Estás por debajo del mercado" : ""}>
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
          <p className="px-5 py-3 text-xs text-slate-500">«Ganas» es lo que te queda después de pagar lo que te costó y el IVA. En rojo, los que te dejan menos del 20 %: plantéate subirles el precio. Si ves «¿?», añade cuánto te costó en la ficha del producto.</p>
        </section>
      </div>
    </>
  );
}
