import Link from "next/link";
import { PageHeader, Stat } from "@/components/PageHeader";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getModule, planIncludes } from "@/lib/modules";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mercado" };

const RANGES = { "7": "7 días", "30": "30 días", "90": "90 días", "365": "12 meses" } as const;
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function Bars({ data, format = (v: number) => formatMoney(v) }: { data: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-slate-600" title={d.label}>{d.label}</span>
          <span className="h-2.5 rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-medium tabular-nums">{format(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  const { org, sector } = await requireSession();
  const mod = getModule("mercado");
  if (!planIncludes(org.plan, mod.plan)) return <UpgradeNotice module={mod} />;

  const range = (r && r in RANGES ? r : "30") as keyof typeof RANGES;
  const since = new Date(Date.now() - Number(range) * 86_400_000);

  const [sales, products] = await Promise.all([
    db.sale.findMany({
      where: { orgId: org.id, status: { not: "cancelled" }, createdAt: { gte: since } },
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
    byWeekday[(s.createdAt.getDay() + 6) % 7] += s.totalCents;
    byHour[s.createdAt.getHours()] += s.totalCents;
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
        title="Mercado"
        subtitle="Qué se vende, cuánto deja y cuándo."
        actions={
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {Object.entries(RANGES).map(([k, v]) => (
              <Link key={k} href={`?r=${k}`} className={cn("rounded-md px-3 py-1.5 text-sm", range === k ? "bg-brand-600 text-white" : "text-slate-600")}>{v}</Link>
            ))}
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Facturación" value={formatMoney(revenue)} />
        <Stat label="Beneficio bruto" value={formatMoney(profit)} hint="Sobre productos con coste informado" />
        <Stat label="Operaciones" value={String(sales.length)} hint={`Ticket medio ${formatMoney(sales.length ? Math.round(revenue / sales.length) : 0)}`} />
        <Stat label="Unidades vendidas" value={units.toLocaleString("es-ES")} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-bold">Lo que más factura</h2>
          {top.length ? <Bars data={top.map((t) => ({ label: t.name, value: t.revenue }))} /> : <p className="text-sm text-slate-500">Sin ventas en este periodo.</p>}
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold">Por categoría</h2>
          {byCategory.size ? <Bars data={[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} /> : <p className="text-sm text-slate-500">Sin datos.</p>}
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold">Por día de la semana</h2>
          <Bars data={WEEKDAYS.map((label, i) => ({ label, value: byWeekday[i] }))} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold">Horas punta</h2>
          {hours.length ? <Bars data={hours} /> : <p className="text-sm text-slate-500">Sin datos.</p>}
        </section>
        <section className="card p-5 lg:col-span-2">
          <h2 className="font-bold">Stock parado</h2>
          <p className="mb-3 text-sm text-slate-500">Con stock pero sin ninguna venta en los últimos {RANGES[range]}. Candidatos a promoción.</p>
          {stale.length === 0 ? (
            <p className="text-sm text-slate-500">Nada parado. 👌</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {stale.map((p) => (
                <li key={p.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <Link href={`/panel/productos/${p.id}`} className="truncate hover:text-brand-600">{p.name}</Link>
                  <span className="text-slate-500">{p.stock} uds · {formatMoney(p.costCents * p.stock)} inmovilizado</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
