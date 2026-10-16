import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { dayRange } from "@/lib/time";
import { invoiceNumber } from "@/lib/sales";
import { formatDate, PAYMENT_METHODS, SALE_STATUS } from "@/lib/utils";

export const metadata = { title: "Ventas" };

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ estado?: string; desde?: string; hasta?: string }> }) {
  const { estado, desde, hasta } = await searchParams;
  const { org } = await requireSession();

  const createdAt: Prisma.DateTimeFilter = {};
  if (desde) createdAt.gte = dayRange(desde).start;
  if (hasta) createdAt.lt = dayRange(hasta).end;

  const where: Prisma.SaleWhereInput = {
    orgId: org.id,
    ...(estado ? { status: estado } : {}),
    ...(desde || hasta ? { createdAt } : {}),
  };
  const [sales, agg] = await Promise.all([
    db.sale.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { customer: { select: { name: true } } } }),
    db.sale.aggregate({ where: { ...where, status: estado ?? { not: "cancelled" } }, _sum: { totalCents: true, taxCents: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Mis ventas"
        subtitle={`Total filtrado: ${formatMoney(agg._sum.totalCents ?? 0)} · IVA ${formatMoney(agg._sum.taxCents ?? 0)}`}
        actions={
          <>
            <a href={`/panel/ventas/exportar?${new URLSearchParams({ ...(estado && { estado }), ...(desde && { desde }), ...(hasta && { hasta }) })}`} className="btn-secondary">Exportar CSV</a>
            <Link href="/panel/ventas/nueva" className="btn-primary">Nueva venta</Link>
          </>
        }
      />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="label text-xs">Estado</label>
          <select className="input" name="estado" defaultValue={estado ?? ""}>
            <option value="">Todas</option>
            {Object.entries(SALE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div><label className="label text-xs">Desde</label><input className="input" type="date" name="desde" defaultValue={desde} /></div>
        <div><label className="label text-xs">Hasta</label><input className="input" type="date" name="hasta" defaultValue={hasta} /></div>
        <button className="btn-secondary">Filtrar</button>
      </form>

      {sales.length === 0 ? (
        <EmptyState title="No hay ventas con estos filtros" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Factura</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th>Estado</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td><Link href={`/panel/ventas/${s.id}`} className="font-medium hover:text-brand-600">{invoiceNumber(org.invoicePrefix, s.number, s.createdAt)}</Link></td>
                  <td className="text-slate-600">{formatDate(s.createdAt, true)}</td>
                  <td className="text-slate-600">{s.customer?.name ?? "—"}</td>
                  <td className="text-slate-600">{PAYMENT_METHODS[s.paymentMethod]}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="text-right font-semibold tabular-nums">{formatMoney(s.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
