import Link from "next/link";
import { FilterChips, Figures, PageHeader } from "@/components/PageHeader";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { requireModule } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { zonedParts } from "@/lib/time";
import { planIncludes } from "@/lib/modules";
import { cn } from "@/lib/utils";

export const metadata = { title: "Estadísticas" };

const RANGES = { "7": "7 días", "30": "30 días", "90": "90 días", "365": "12 meses" } as const;
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function Bars({ data, format = (v: number) => formatMoney(v) }: { data: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-slate-600" title={d.label}>{d.label}</span>
          <span className="h-2 rounded-full bg-slate-100">
            {/* El color, solo en el dato que manda */}
            <span className={cn("block h-full rounded-full", d.value === max ? "bg-brand-600" : "bg-slate-300")} style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="num text-right font-medium">{format(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ r?: string; local?: string }> }) {
  const { r, local: localParam } = await searchParams;
  const { org, can, locations, module: mod } = await requireModule("mercado");
  if (!planIncludes(org.plan, mod.plan)) return <UpgradeNotice module={mod} canUpgrade={can("billing.manage")} />;
  const profitOk = can("finance.profit");
  const local = locations.find((l) => l.id === localParam);
  const locScope = local ? { locationId: local.id } : can("locations.all") ? {} : { locationId: { in: locations.map((l) => l.id) } };

  const range = (r && r in RANGES ? r : "30") as keyof typeof RANGES;
  const since = new Date(Date.now() - Number(range) * 86_400_000);

  const [sales, products] = await Promise.all([
    db.sale.findMany({
      where: { orgId: org.id, status: { not: "cancelled" }, createdAt: { gte: since }, ...locScope },
      include: { items: { include: { product: { include: { category: true } } } } },
    }),
    db.product.findMany({ where: { orgId: org.id, active: true }, include: { category: true } }),
  ]);

  const revenue = sales.reduce((a, s) => a + s.totalCents, 0);
  const byProduct = new Map<string, { name: string; units: number; revenue: number; profit: number }>();
  const byCategory = new Map<string, number>();
  const byWeekday = Array(7).fill(0) as number[];
  const byHour = Array(24).fill(0) as number[];
  let units = 0;
  let profit = 0;

  for (const s of sales) {
    const when = zonedParts(s.createdAt);
    byWeekday[when.weekday] += s.totalCents;
    byHour[when.hour] += s.totalCents;
    for (const it of s.items) {
      const line = it.unitPriceCents * it.quantity;
      const net = Math.round((line * 10000) / (10000 + it.taxRateBp));
      const lineProfit = it.product?.costCents ? net - it.product.costCents * it.quantity : 0;
      const key = it.productId ?? it.name;
      const acc = byProduct.get(key) ?? { name: it.name, units: 0, revenue: 0, profit: 0 };
      byProduct.set(key, { name: acc.name, units: acc.units + it.quantity, revenue: acc.revenue + line, profit: acc.profit + lineProfit });
      const cat = it.product?.category?.name ?? "Sin categoría";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + line);
      units += it.quantity;
      profit += lineProfit;
    }
  }

  const top = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const soldIds = new Set([...byProduct.keys()]);
  const stale = products.filter((p) => p.trackStock && p.stock > 0 && !soldIds.has(p.id)).slice(0, 8);
  const hours = byHour.map((v, h) => ({ label: `${h}:00`, value: v })).filter((d) => d.value > 0);

  return (
    <>
      <PageHeader
        title="Estadísticas"
        subtitle={profitOk ? "Qué se vende, cuánto deja y cuándo." : "Qué se vende y cuándo."}
        actions={<FilterChips items={Object.entries(RANGES).map(([k, v]) => ({ label: v, href: `?${new URLSearchParams({ r: k, ...(local && { local: local.id }) })}`, active: range === k }))} />}
      />
      {locations.length > 1 && (
        <div className="mb-4">
          <FilterChips items={[{ id: "", name: "Todos los locales" }, ...locations].map((l) => ({ label: l.name, href: `?${new URLSearchParams({ r: range, ...(l.id && { local: l.id }) })}`, active: (local?.id ?? "") === l.id }))} />
        </div>
      )}
      <Figures
        items={[
          { label: "Facturación", value: formatMoney(revenue) },
          ...(profitOk ? [{ label: "Beneficio bruto", value: formatMoney(profit), hint: "Sobre productos con coste" }] : []),
          { label: "Tickets", value: String(sales.length), hint: `Ticket medio ${formatMoney(sales.length ? Math.round(revenue / sales.length) : 0)}` },
          { label: "Unidades vendidas", value: units.toLocaleString("es-ES") },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="card-title mb-4">Lo que más factura</h2>
          {top.length ? <Bars data={top.map((t) => ({ label: t.name, value: t.revenue }))} /> : <p className="text-sm text-slate-500">Sin ventas en este periodo.</p>}
        </section>
        <section className="card p-5">
          <h2 className="card-title mb-4">Por categoría</h2>
          {byCategory.size ? <Bars data={[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} /> : <p className="text-sm text-slate-500">Sin datos.</p>}
        </section>
        <section className="card p-5">
          <h2 className="card-title mb-4">Por día de la semana</h2>
          <Bars data={WEEKDAYS.map((label, i) => ({ label, value: byWeekday[i] }))} />
        </section>
        <section className="card p-5">
          <h2 className="card-title mb-4">Horas punta</h2>
          {hours.length ? <Bars data={hours} /> : <p className="text-sm text-slate-500">Sin datos.</p>}
        </section>
        <section className="card p-5 lg:col-span-2">
          <h2 className="card-title">Stock parado</h2>
          <p className="mb-3 mt-1 text-sm text-slate-500">Con stock pero sin ninguna venta en los últimos {RANGES[range]}. Candidatos a promoción.</p>
          {stale.length === 0 ? (
            <p className="text-sm text-slate-500">Nada parado: todo lo que tiene stock se ha vendido en este periodo.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {stale.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <Link href={`/panel/productos/${p.id}`} className="truncate hover:underline">{p.name}</Link>
                  <span className="num shrink-0 text-slate-500">{p.stock} uds{profitOk && p.costCents ? ` · ${formatMoney(p.costCents * p.stock)} parados` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
