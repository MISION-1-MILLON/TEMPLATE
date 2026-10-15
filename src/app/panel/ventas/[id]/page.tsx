import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/forms";
import { PrintButton } from "@/components/PrintButton";
import { StatusBadge } from "@/components/StatusBadge";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney, formatPercent, splitTax } from "@/lib/money";
import { invoiceNumber } from "@/lib/sales";
import { formatDate, PAYMENT_METHODS } from "@/lib/utils";
import { cancelSaleAction, paySaleAction } from "../actions";

export default async function SalePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nueva?: string }> }) {
  const { id } = await params;
  const { nueva } = await searchParams;
  const { org } = await requireSession();
  const sale = await db.sale.findFirst({
    where: { id, orgId: org.id },
    include: { items: true, customer: true, createdBy: { select: { name: true } } },
  });
  if (!sale) notFound();

  // Desglose de IVA por tipo
  const byRate = new Map<number, { base: number; tax: number }>();
  for (const it of sale.items) {
    const { base, tax } = splitTax(it.unitPriceCents * it.quantity, it.taxRateBp);
    const acc = byRate.get(it.taxRateBp) ?? { base: 0, tax: 0 };
    byRate.set(it.taxRateBp, { base: acc.base + base, tax: acc.tax + tax });
  }
  const isFullInvoice = Boolean(sale.customer?.taxId);
  const number = invoiceNumber(org.invoicePrefix, sale.number, sale.createdAt);

  return (
    <div className="mx-auto max-w-3xl">
      {nueva && (
        <div className="no-print mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Venta registrada. Stock{sale.status === "paid" ? ", caja" : ""} y factura actualizados.
        </div>
      )}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/panel/ventas" className="btn-ghost">← Ventas</Link>
        <div className="flex flex-wrap gap-2">
          {sale.status === "pending" && (
            <form action={paySaleAction.bind(null, sale.id)} className="flex gap-2">
              <select name="method" className="input" defaultValue="card">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="btn-primary">Marcar cobrada</button>
            </form>
          )}
          {sale.status !== "cancelled" && (
            <form action={cancelSaleAction.bind(null, sale.id)}>
              <ConfirmButton message="¿Anular esta venta? Se devolverá el stock y, si estaba cobrada, se registrará la salida en caja.">Anular</ConfirmButton>
            </form>
          )}
          <PrintButton />
          <Link href="/panel/ventas/nueva" className="btn-primary">Nueva venta</Link>
        </div>
      </div>

      <article className="card p-8 print:border-0 print:shadow-none">
        <header className="flex flex-wrap justify-between gap-6">
          <div>
            <p className="text-lg font-bold">{org.name}</p>
            {org.taxId && <p className="text-sm text-slate-600">NIF: {org.taxId}</p>}
            {org.address && <p className="text-sm text-slate-600">{org.address}</p>}
            {(org.phone || org.email) && <p className="text-sm text-slate-600">{[org.phone, org.email].filter(Boolean).join(" · ")}</p>}
          </div>
          <div className="text-right">
            <p className="display text-2xl uppercase">{isFullInvoice ? "Factura" : "Factura simplificada"}</p>
            <p className="font-semibold">{number}</p>
            <p className="text-sm text-slate-600">{formatDate(sale.createdAt, true)}</p>
            <div className="no-print mt-1"><StatusBadge status={sale.status} /></div>
          </div>
        </header>

        {sale.customer && (
          <section className="mt-6 rounded-lg bg-slate-50 p-4 text-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Cliente</p>
            <Link href={`/panel/clientes/${sale.customer.id}`} className="font-semibold">{sale.customer.name}</Link>
            {sale.customer.taxId && <p>NIF: {sale.customer.taxId}</p>}
            {sale.customer.address && <p>{sale.customer.address}</p>}
          </section>
        )}

        <table className="table mt-6">
          <thead>
            <tr><th className="!px-0">Concepto</th><th className="text-right">Uds.</th><th className="text-right">Precio</th><th className="text-right">IVA</th><th className="!px-0 text-right">Importe</th></tr>
          </thead>
          <tbody>
            {sale.items.map((it) => (
              <tr key={it.id}>
                <td className="!px-0">{it.name}</td>
                <td className="text-right tabular-nums">{it.quantity}</td>
                <td className="text-right tabular-nums">{formatMoney(it.unitPriceCents)}</td>
                <td className="text-right tabular-nums">{formatPercent(it.taxRateBp)}</td>
                <td className="!px-0 text-right font-medium tabular-nums">{formatMoney(it.unitPriceCents * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-6 w-full max-w-xs space-y-1 text-sm">
          {[...byRate.entries()].map(([rate, v]) => (
            <div key={rate} className="text-slate-600">
              <div className="flex justify-between"><span>Base imponible ({formatPercent(rate)})</span><span className="tabular-nums">{formatMoney(v.base)}</span></div>
              <div className="flex justify-between"><span>IVA {formatPercent(rate)}</span><span className="tabular-nums">{formatMoney(v.tax)}</span></div>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold">
            <span>Total</span><span className="tabular-nums">{formatMoney(sale.totalCents)}</span>
          </div>
          <p className="pt-1 text-right text-xs text-slate-500">Pago: {PAYMENT_METHODS[sale.paymentMethod]}</p>
        </div>
        {sale.status === "cancelled" && <p className="mt-6 text-center font-bold uppercase text-red-600">Anulada</p>}
      </article>
      {sale.createdBy && <p className="no-print mt-3 text-xs text-slate-500">Registrada por {sale.createdBy.name}</p>}
    </div>
  );
}
