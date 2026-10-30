import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Figures, PageHeader } from "@/components/PageHeader";
import { ConfirmButton } from "@/components/forms";
import { StatusBadge } from "@/components/StatusBadge";
import { requirePagePermission } from "@/lib/auth";
import { asAttributes } from "@/lib/attributes";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { CustomerForm } from "../CustomerForm";
import { deleteCustomer } from "../actions";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, sector, can } = await requirePagePermission("customers.manage");
  const customer = await db.customer.findFirst({
    where: { id, orgId: org.id },
    include: { sales: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!customer) notFound();

  const valid = customer.sales.filter((s) => s.status !== "cancelled");
  const [all, debt] = await Promise.all([
    db.sale.aggregate({ where: { orgId: org.id, customerId: customer.id, status: { not: "cancelled" } }, _sum: { totalCents: true }, _count: true }),
    db.sale.aggregate({ where: { orgId: org.id, customerId: customer.id, status: "pending" }, _sum: { totalCents: true } }),
  ]);
  const spent = all._sum.totalCents ?? 0;
  const owed = debt._sum.totalCents ?? 0;

  return (
    <>
      <Link href="/panel/clientes" className="btn-ghost btn-sm -ml-2 mb-3"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> {sector.terms.customers}</Link>
      <PageHeader
        title={customer.name}
        subtitle={[customer.phone, customer.email].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <form action={deleteCustomer.bind(null, customer.id)}>
              <ConfirmButton className="btn-ghost text-negative" message="¿Eliminar este cliente? Sus ventas se conservan sin cliente asignado.">Eliminar</ConfirmButton>
            </form>
            {can("sales.create") && <Link href={`/panel/ventas/nueva?cliente=${customer.id}`} className="btn-primary">Venderle</Link>}
          </>
        }
      />
      <Figures
        items={[
          { label: "Ha gastado", value: formatMoney(spent) },
          { label: "Compras", value: String(all._count) },
          { label: "Ticket medio", value: formatMoney(all._count ? Math.round(spent / all._count) : 0) },
          owed > 0 ? { label: "Te debe", value: formatMoney(owed), tone: "warning" } : { label: "Última compra", value: valid[0] ? formatDate(valid[0].createdAt) : "—" },
        ]}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <CustomerForm
            fields={sector.customerFields}
            values={{
              id: customer.id,
              name: customer.name,
              email: customer.email ?? "",
              phone: customer.phone ?? "",
              taxId: customer.taxId ?? "",
              address: customer.address ?? "",
              notes: customer.notes ?? "",
              attributes: asAttributes(customer.attributes),
            }}
          />
        </div>
        <section className="card lg:sticky lg:top-8">
          <h2 className="card-header card-title">Historial</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {customer.sales.length === 0 && <li className="px-5 py-4 text-slate-500">Aún no ha comprado.</li>}
            {customer.sales.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-2.5">
                <Link href={`/panel/ventas/${s.id}`} className="hover:underline">
                  Venta nº {s.number}
                  <span className="num block text-xs text-slate-500">{formatDate(s.createdAt)}</span>
                </Link>
                <span className="flex flex-col items-end gap-0.5">
                  <span className={`num font-medium ${s.status === "cancelled" ? "text-slate-400 line-through" : ""}`}>{formatMoney(s.totalCents)}</span>
                  {s.status === "pending" && <StatusBadge status={s.status} />}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
