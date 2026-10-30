import { Download } from "lucide-react";
import { FilterChips, Figures, PageHeader } from "@/components/PageHeader";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney, formatPercent, splitTax } from "@/lib/money";
import { zonedMidnight, zonedParts } from "@/lib/time";

export const metadata = { title: "IVA por trimestre" };

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const iso = (d: Date) => {
  const p = zonedParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

/** IVA repercutido por tipo y trimestre (modelo 303) a partir de las facturas emitidas */
export default async function TaxPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const { org } = await requirePagePermission("finance.tax");
  const now = zonedParts(new Date());
  const current = { year: now.year, q: Math.floor((now.month - 1) / 3) };
  const m = t?.match(/^(\d{4})-T([1-4])$/);
  const sel = m ? { year: Number(m[1]), q: Number(m[2]) - 1 } : current;
  const start = zonedMidnight(sel.year, sel.q * 3 + 1, 1);
  const end = zonedMidnight(sel.year, sel.q * 3 + 4, 1);

  const [sales, expenses] = await Promise.all([
    db.sale.findMany({ where: { orgId: org.id, createdAt: { gte: start, lt: end } }, include: { items: true }, orderBy: { number: "asc" } }),
    db.cashMovement.aggregate({ where: { orgId: org.id, saleId: null, amountCents: { lt: 0 }, createdAt: { gte: start, lt: end } }, _sum: { amountCents: true }, _count: true }),
  ]);
  const valid = sales.filter((s) => s.status !== "cancelled");

  // Base e IVA por tipo, y por mes; el descuento del ticket se reparte entre sus líneas
  const byRate = new Map<number, { base: number; tax: number }>();
  const byMonth = new Map<number, { base: number; tax: number; count: number }>();
  for (const s of valid) {
    const gross = s.items.reduce((a, it) => a + it.unitPriceCents * it.quantity, 0);
    const ratio = gross ? (gross - s.discountCents) / gross : 1;
    const month = zonedParts(s.createdAt).month;
    const mm = byMonth.get(month) ?? { base: 0, tax: 0, count: 0 };
    mm.count++;
    for (const it of s.items) {
      const { base, tax } = splitTax(Math.round(it.unitPriceCents * it.quantity * ratio), it.taxRateBp);
      const r = byRate.get(it.taxRateBp) ?? { base: 0, tax: 0 };
      byRate.set(it.taxRateBp, { base: r.base + base, tax: r.tax + tax });
      mm.base += base;
      mm.tax += tax;
    }
    byMonth.set(month, mm);
  }
  const base = [...byRate.values()].reduce((a, v) => a + v.base, 0);
  const tax = [...byRate.values()].reduce((a, v) => a + v.tax, 0);
  const cancelled = sales.length - valid.length;
  const numbers = valid.map((s) => s.number);

  // Últimos seis trimestres para elegir
  const quarters = Array.from({ length: 6 }, (_, i) => {
    const idx = current.year * 4 + current.q - i;
    return { year: Math.floor(idx / 4), q: idx % 4 };
  }).reverse();
  const exportHref = `/panel/ventas/exportar?${new URLSearchParams({ periodo: "todo", desde: iso(start), hasta: iso(new Date(end.getTime() - 1)) })}`;

  return (
    <>
      <PageHeader
        title="IVA por trimestre"
        subtitle={`${sel.q + 1}.º trimestre de ${sel.year} · IVA repercutido en las facturas emitidas`}
        actions={<a href={exportHref} className="btn-secondary"><Download className="h-4 w-4" strokeWidth={1.75} /> Facturas del trimestre (CSV)</a>}
      />
      <div className="mb-4">
        <FilterChips items={quarters.map((x) => ({ label: `${x.q + 1}T ${x.year}`, href: `/panel/impuestos?t=${x.year}-T${x.q + 1}`, active: x.year === sel.year && x.q === sel.q }))} />
      </div>

      <Figures
        items={[
          { label: "IVA repercutido", value: formatMoney(tax) },
          { label: "Base imponible", value: formatMoney(base) },
          { label: "Facturas", value: String(valid.length), hint: numbers.length ? `Nº ${Math.min(...numbers)} a ${Math.max(...numbers)}${cancelled ? ` · ${cancelled} anuladas` : ""}` : undefined },
          { label: "Gastos apuntados en caja", value: formatMoney(-(expenses._sum.amountCents ?? 0)), hint: `${expenses._count} movimientos, sin desglose de IVA` },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="card-header card-title">Por tipo de IVA</h2>
          <table className="table">
            <thead><tr><th>Tipo</th><th className="text-right">Base</th><th className="text-right">Cuota</th></tr></thead>
            <tbody>
              {[...byRate.entries()].sort((a, b) => b[0] - a[0]).map(([rate, v]) => (
                <tr key={rate}><td>{formatPercent(rate)}</td><td className="num text-right">{formatMoney(v.base)}</td><td className="num text-right font-medium">{formatMoney(v.tax)}</td></tr>
              ))}
              {byRate.size === 0 && <tr><td colSpan={3} className="py-8 text-center text-slate-500">Sin facturas en este trimestre.</td></tr>}
            </tbody>
            {byRate.size > 0 && (
              <tfoot><tr className="border-t border-slate-200 font-medium"><td className="px-4 py-3">Total</td><td className="num px-4 py-3 text-right">{formatMoney(base)}</td><td className="num px-4 py-3 text-right">{formatMoney(tax)}</td></tr></tfoot>
            )}
          </table>
        </section>
        <section className="card">
          <h2 className="card-header card-title">Por mes</h2>
          <table className="table">
            <thead><tr><th>Mes</th><th className="text-right">Facturas</th><th className="text-right">Base</th><th className="text-right">IVA</th></tr></thead>
            <tbody>
              {[0, 1, 2].map((i) => {
                const month = sel.q * 3 + i + 1;
                const v = byMonth.get(month);
                return (
                  <tr key={month}>
                    <td>{MONTHS[month - 1]}</td>
                    <td className="num text-right text-slate-600">{v?.count ?? 0}</td>
                    <td className="num text-right">{formatMoney(v?.base ?? 0)}</td>
                    <td className="num text-right font-medium">{formatMoney(v?.tax ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
      <p className="mt-6 max-w-2xl text-xs text-slate-500">
        Calculado sobre las facturas no anuladas, repartiendo los descuentos del ticket entre sus líneas. El IVA soportado de compras y gastos no se registra aquí: añádelo desde las facturas de proveedor.
      </p>
    </>
  );
}
