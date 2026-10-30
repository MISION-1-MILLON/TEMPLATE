import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EmptyState, FilterChips, Figures, PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { invoiceNumber } from "@/lib/sales";
import { salesWhere, type SalesQuery } from "@/lib/sales-filter";
import { formatDate, PAYMENT_METHODS, SALE_STATUS } from "@/lib/utils";

export const metadata = { title: "Ventas" };

const PERIODS = [
  { id: "hoy", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "mes", label: "Este mes" },
  { id: "todo", label: "Todo" },
];

export default async function SalesPage({ searchParams }: { searchParams: Promise<SalesQuery> }) {
  const q = await searchParams;
  const s = await requireSession();
  const { org, locations, can } = s;
  const { where, period, local, own } = salesWhere(s, q);
  const live = { ...where, status: q.estado ?? { not: "cancelled" } };

  const [sales, agg, pending] = await Promise.all([
    db.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { customer: { select: { name: true } }, location: { select: { name: true } }, createdBy: { select: { name: true } } },
    }),
    db.sale.aggregate({ where: live, _sum: { totalCents: true, taxCents: true }, _count: true }),
    db.sale.aggregate({ where: { ...where, status: "pending" }, _sum: { totalCents: true }, _count: true }),
  ]);
  const total = agg._sum.totalCents ?? 0;
  const multi = locations.length > 1;

  // Los filtros se conservan al cambiar uno de ellos
  const href = (patch: Partial<SalesQuery>) => {
    const next = { periodo: q.desde || q.hasta ? undefined : q.periodo, estado: q.estado, local: q.local, desde: q.desde, hasta: q.hasta, ...patch };
    const params = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1])));
    return `/panel/ventas${params.size ? `?${params}` : ""}`;
  };
  const exportHref = `/panel/ventas/exportar?${new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== ""))}`;

  return (
    <>
      <PageHeader
        title={own ? "Mis ventas de hoy" : "Ventas"}
        subtitle={own ? "Las que has cobrado tú en este turno." : undefined}
        actions={
          <>
            {can("sales.export") && <a href={exportHref} className="btn-secondary">Exportar CSV</a>}
            {can("sales.create") && <Link href="/panel/ventas/nueva" className="btn-primary">Nueva venta</Link>}
          </>
        }
      />

      <Figures
        items={[
          { label: q.estado === "cancelled" ? "Anulado" : "Vendido", value: formatMoney(total) },
          { label: "Tickets", value: String(agg._count) },
          { label: "Ticket medio", value: formatMoney(agg._count ? Math.round(total / agg._count) : 0) },
          own
            ? { label: "IVA incluido", value: formatMoney(agg._sum.taxCents ?? 0) }
            : { label: "Por cobrar", value: formatMoney(pending._sum.totalCents ?? 0), hint: `${pending._count} ${pending._count === 1 ? "venta" : "ventas"}`, tone: pending._count ? "warning" : undefined },
        ]}
      />

      {!own && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterChips items={PERIODS.map((p) => ({ label: p.label, href: href({ periodo: p.id === "mes" ? undefined : p.id, desde: undefined, hasta: undefined }), active: period === p.id }))} />
          <FilterChips
            items={[{ id: "", label: "Todas" }, ...Object.entries(SALE_STATUS).map(([id, label]) => ({ id, label: id === "pending" ? "Por cobrar" : label }))].map((e) => ({
              label: e.label,
              href: href({ estado: e.id || undefined }),
              active: (q.estado ?? "") === e.id,
            }))}
          />
          {multi && (
            <FilterChips items={[{ id: "", name: "Todos los locales" }, ...locations].map((l) => ({ label: l.name, href: href({ local: l.id || undefined }), active: (local ?? "") === l.id }))} />
          )}
          <details className="group relative">
            <summary className="btn-ghost btn-sm cursor-pointer list-none">{period === "rango" ? `${q.desde ?? "…"} → ${q.hasta ?? "hoy"}` : "Fechas…"}</summary>
            <form className="animate-pop absolute left-0 z-20 mt-1 flex w-72 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.25)]">
              {q.estado && <input type="hidden" name="estado" value={q.estado} />}
              {local && <input type="hidden" name="local" value={local} />}
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label" htmlFor="desde">Desde</label><input id="desde" className="input" type="date" name="desde" defaultValue={q.desde} /></div>
                <div><label className="label" htmlFor="hasta">Hasta</label><input id="hasta" className="input" type="date" name="hasta" defaultValue={q.hasta} /></div>
              </div>
              <button className="btn-primary btn-sm">Aplicar</button>
            </form>
          </details>
        </div>
      )}

      {sales.length === 0 ? (
        <EmptyState
          title={own ? "Aún no has vendido nada hoy" : "No hay ventas con estos filtros"}
          action={own && can("sales.create") ? <Link href="/panel/ventas/nueva" className="btn-primary">Hacer una venta</Link> : undefined}
        >
          {own ? "Cada ticket que cobres aparecerá aquí, con su hora y su importe." : "Prueba con otro periodo o quita algún filtro."}
        </EmptyState>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Factura</th><th>Fecha</th>{multi && <th>Local</th>}<th>Cliente</th>{!own && <th>Atendió</th>}<th>Pago</th><th>Estado</th><th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="group relative hover:bg-slate-50">
                    <td>
                      <Link href={`/panel/ventas/${sale.id}`} className="num font-medium after:absolute after:inset-0">{invoiceNumber(org.invoicePrefix, sale.number, sale.createdAt)}</Link>
                    </td>
                    <td className="num text-slate-600">{formatDate(sale.createdAt, true)}</td>
                    {multi && <td className="text-slate-600">{sale.location?.name ?? "—"}</td>}
                    <td className="text-slate-600">{sale.customer?.name ?? "—"}</td>
                    {!own && <td className="text-slate-600">{sale.createdBy?.name ?? "—"}</td>}
                    <td className="text-slate-600">{PAYMENT_METHODS[sale.paymentMethod]}</td>
                    <td><StatusBadge status={sale.status} /></td>
                    <td className={`num text-right font-medium ${sale.status === "cancelled" ? "text-slate-400 line-through" : ""}`}>{formatMoney(sale.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Móvil: lista */}
          <ul className="card divide-y divide-slate-100 md:hidden">
            {sales.map((sale) => (
              <li key={sale.id}>
                <Link href={`/panel/ventas/${sale.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{sale.customer?.name ?? `Venta nº ${sale.number}`}</p>
                    <p className="num truncate text-xs text-slate-500">
                      {formatDate(sale.createdAt, true)} · {PAYMENT_METHODS[sale.paymentMethod]}{multi && sale.location ? ` · ${sale.location.name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`num text-sm font-semibold ${sale.status === "cancelled" ? "text-slate-400 line-through" : ""}`}>{formatMoney(sale.totalCents)}</span>
                    {sale.status !== "paid" && <StatusBadge status={sale.status} />}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />
                </Link>
              </li>
            ))}
          </ul>
          {sales.length === 200 && <p className="mt-3 text-center text-xs text-slate-500">Se muestran las 200 más recientes. Acota el periodo o exporta el CSV para verlas todas.</p>}
        </>
      )}
    </>
  );
}
