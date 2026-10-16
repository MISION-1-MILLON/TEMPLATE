import Link from "next/link";
import { EmptyState, PageHeader, Stat } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { startOfMonth, startOfToday } from "@/lib/time";
import { formatDate, PAYMENT_METHODS } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { title: "Inicio" };

export default async function Dashboard() {
  const { org, user, sector } = await requireSession();
  const t = sector.terms;

  const startOfDay = startOfToday();
  const monthStart = startOfMonth();
  const valid = { orgId: org.id, status: { not: "cancelled" } };

  const [today, month, pending, lowStock, productCount, recent] = await Promise.all([
    db.sale.aggregate({ where: { ...valid, createdAt: { gte: startOfDay } }, _sum: { totalCents: true }, _count: true }),
    db.sale.aggregate({ where: { ...valid, createdAt: { gte: monthStart } }, _sum: { totalCents: true }, _count: true }),
    db.sale.aggregate({ where: { orgId: org.id, status: "pending" }, _sum: { totalCents: true }, _count: true }),
    db.$queryRaw<Array<{ id: string; name: string; stock: number }>>`
      SELECT id, name, stock FROM "Product"
      WHERE "orgId" = ${org.id} AND active = true AND "trackStock" = true AND stock <= "lowStockAt"
      ORDER BY stock ASC LIMIT 6`,
    db.product.count({ where: { orgId: org.id, active: true } }),
    db.sale.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const monthTotal = month._sum.totalCents ?? 0;
  const avgTicket = month._count ? Math.round(monthTotal / month._count) : 0;

  return (
    <>
      <PageHeader
        title={`Hola, ${user.name.split(" ")[0]}`}
        subtitle={`Así va ${org.name} hoy.`}
        actions={
          <>
            <Link href="/panel/productos/nuevo" className="btn-secondary">Añadir {t.product.toLowerCase()}</Link>
            <Link href="/panel/ventas/nueva" className="btn-primary">Nueva venta</Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ventas de hoy" value={formatMoney(today._sum.totalCents ?? 0)} hint={`${today._count} ${today._count === 1 ? "operación" : "operaciones"}`} />
        <Stat label="Este mes" value={formatMoney(monthTotal)} hint={`${month._count} ${month._count === 1 ? "operación" : "operaciones"}`} />
        <Stat label="Ticket medio (mes)" value={formatMoney(avgTicket)} />
        <Stat label="Pendiente de cobro" value={formatMoney(pending._sum.totalCents ?? 0)} hint={`${pending._count} ${pending._count === 1 ? "venta" : "ventas"}`} />
      </div>

      {productCount === 0 && (
        <div className="card mt-6 border-brand-100 bg-brand-50 p-6">
          <h2 className="font-bold">Empieza por tu catálogo</h2>
          <p className="mt-1 text-sm text-slate-600">
            Da de alta tus {t.products.toLowerCase()} y todo lo demás (ventas, {t.store.toLowerCase()} online, posts) se alimenta de ahí.
          </p>
          <Link href="/panel/productos/nuevo" className="btn-primary mt-4">Añadir el primero</Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold">Últimas ventas</h2>
            <Link href="/panel/ventas" className="text-sm font-semibold text-brand-600">Ver todas</Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-5"><EmptyState title="Todavía no hay ventas">Registra la primera desde «Nueva venta».</EmptyState></div>
          ) : (
            <table className="table">
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/panel/ventas/${s.id}`} className="font-medium hover:text-brand-600">Nº {s.number}</Link>
                      <p className="text-xs text-slate-500">{formatDate(s.createdAt, true)}</p>
                    </td>
                    <td className="text-slate-600">{s.customer?.name ?? "Sin cliente"}</td>
                    <td className="text-slate-600">{PAYMENT_METHODS[s.paymentMethod]}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="text-right font-semibold tabular-nums">{formatMoney(s.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold">Stock bajo</h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Todo en orden. Nada por debajo del stock mínimo.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <Link href={`/panel/productos/${p.id}`} className="truncate hover:text-brand-600">{p.name}</Link>
                  <span className={`badge ${Number(p.stock) <= 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                    {Number(p.stock)} uds
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

