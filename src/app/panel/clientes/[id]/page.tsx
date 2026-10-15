import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Stat } from "@/components/PageHeader";
import { ConfirmButton } from "@/components/forms";
import { StatusBadge } from "@/components/StatusBadge";
import { requireSession } from "@/lib/auth";
import { asAttributes } from "@/lib/attributes";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { CustomerForm } from "../CustomerForm";
import { deleteCustomer } from "../actions";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, sector } = await requireSession();
  const customer = await db.customer.findFirst({
    where: { id, orgId: org.id },
    include: { sales: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!customer) notFound();

  const valid = customer.sales.filter((s) => s.status !== "cancelled");
  const spent = valid.reduce((a, s) => a + s.totalCents, 0);

  return (
    <>
      <PageHeader
        title={customer.name}
        actions={
          <>
            <Link href={`/panel/ventas/nueva?cliente=${customer.id}`} className="btn-primary">Nueva venta</Link>
            <form action={deleteCustomer.bind(null, customer.id)}>
              <ConfirmButton message="¿Eliminar este cliente? Sus ventas se conservan sin cliente asignado.">Eliminar</ConfirmButton>
            </form>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total gastado" value={formatMoney(spent)} />
        <Stat label="Compras" value={String(valid.length)} />
        <Stat label="Última compra" value={valid[0] ? formatDate(valid[0].createdAt) : "—"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
        <section className="card self-start">
          <h2 className="border-b border-slate-100 px-5 py-3 font-bold">Historial</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {customer.sales.length === 0 && <li className="px-5 py-3 text-slate-500">Sin compras todavía.</li>}
            {customer.sales.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-2.5">
                <Link href={`/panel/ventas/${s.id}`} className="hover:text-brand-600">
                  Nº {s.number}
                  <span className="block text-xs text-slate-500">{formatDate(s.createdAt)}</span>
                </Link>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{formatMoney(s.totalCents)}</span>
                  <StatusBadge status={s.status} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
