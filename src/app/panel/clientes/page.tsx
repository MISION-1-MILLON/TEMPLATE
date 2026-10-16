import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { org, sector } = await requireSession();
  const t = sector.terms;

  const customers = await db.customer.findMany({
    where: { orgId: org.id, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }] } : {}) },
    orderBy: { name: "asc" },
    take: 500,
  });
  const totals = await db.sale.groupBy({
    by: ["customerId"],
    where: { orgId: org.id, status: { not: "cancelled" }, customerId: { in: customers.map((c) => c.id) } },
    _sum: { totalCents: true },
    _count: true,
  });
  const byCustomer = new Map(totals.map((x) => [x.customerId, x]));

  return (
    <>
      <PageHeader
        title={t.customers}
        subtitle={`${customers.length} en total`}
        actions={<Link href="/panel/clientes/nuevo" className="btn-primary">Añadir {t.customer.toLowerCase()}</Link>}
      />
      <form className="mb-4 flex gap-2">
        <input className="input max-w-xs" name="q" placeholder="Buscar por nombre, email o teléfono" defaultValue={q} />
        <button className="btn-secondary">Buscar</button>
      </form>
      {customers.length === 0 ? (
        <EmptyState title="Todavía no hay clientes">Se añaden aquí o directamente al registrar una venta.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Contacto</th><th className="text-right">Compras</th><th className="text-right">Total gastado</th></tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const s = byCustomer.get(c.id);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td><Link href={`/panel/clientes/${c.id}`} className="font-medium hover:text-brand-600">{c.name}</Link></td>
                    <td className="text-slate-600">{[c.email, c.phone].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="text-right tabular-nums">{s?._count ?? 0}</td>
                    <td className="text-right font-semibold tabular-nums">{formatMoney(s?._sum.totalCents ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
