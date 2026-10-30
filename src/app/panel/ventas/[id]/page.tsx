import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ConfirmButton, SubmitButton } from "@/components/forms";
import { PrintButton } from "@/components/PrintButton";
import { StatusBadge } from "@/components/StatusBadge";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney, formatPercent, splitTax } from "@/lib/money";
import { invoiceNumber } from "@/lib/sales";
import { saleScope } from "@/lib/sales-filter";
import { formatDate, PAYMENT_METHODS } from "@/lib/utils";
import { cancelSaleAction, paySaleAction } from "../actions";

export const metadata = { title: "Venta" };

export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const { org, can } = session;
  const sale = await db.sale.findFirst({
    where: { id, ...saleScope(session) },
    include: { items: true, customer: true, location: true, createdBy: { select: { name: true } } },
  });
  if (!sale) notFound();

  // Desglose de IVA por tipo (sobre lo cobrado: el descuento reparte base e IVA)
  const gross = sale.items.reduce((a, it) => a + it.unitPriceCents * it.quantity, 0);
  const ratio = gross ? (gross - sale.discountCents) / gross : 1;
  const byRate = new Map<number, { base: number; tax: number }>();
  for (const it of sale.items) {
    const { base, tax } = splitTax(Math.round(it.unitPriceCents * it.quantity * ratio), it.taxRateBp);
    const acc = byRate.get(it.taxRateBp) ?? { base: 0, tax: 0 };
    byRate.set(it.taxRateBp, { base: acc.base + base, tax: acc.tax + tax });
  }
  const isFullInvoice = Boolean(sale.customer?.taxId);
  const number = invoiceNumber(org.invoicePrefix, sale.number, sale.createdAt);
  const cancelled = sale.status === "cancelled";

  return (
    <div className="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="no-print flex items-center justify-between lg:col-span-2">
        <Link href="/panel/ventas" className="btn-ghost btn-sm -ml-2"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Ventas</Link>
        <PrintButton />
      </div>

      {/* El documento: lo que se imprime */}
      <article className={`card relative p-6 sm:p-10 print:border-0 print:p-0 print:shadow-none ${cancelled ? "opacity-70" : ""}`}>
        {cancelled && (
          <p className="absolute right-6 top-6 rotate-[-6deg] rounded border-2 border-negative px-2 py-0.5 text-sm font-semibold uppercase tracking-wider text-negative">Anulada</p>
        )}
        <header className="flex flex-wrap justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="text-sm text-slate-600">
            <p className="text-base font-semibold text-ink">{org.name}</p>
            {org.taxId && <p>NIF {org.taxId}</p>}
            {(sale.location?.address || org.address) && <p>{sale.location?.address || org.address}</p>}
            {(org.phone || org.email) && <p>{[org.phone, org.email].filter(Boolean).join(" · ")}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">{isFullInvoice ? "Factura" : "Factura simplificada"}</p>
            <p className="num text-xl font-semibold tracking-tight">{number}</p>
            <p className="num text-sm text-slate-500">{formatDate(sale.createdAt, true)}</p>
          </div>
        </header>

        {sale.customer && (
          <section className="border-b border-slate-200 py-5 text-sm">
            <p className="text-xs text-slate-500">Cliente</p>
            {can("customers.manage")
              ? <Link href={`/panel/clientes/${sale.customer.id}`} className="font-medium hover:underline">{sale.customer.name}</Link>
              : <p className="font-medium">{sale.customer.name}</p>}
            {sale.customer.taxId && <p className="text-slate-600">NIF {sale.customer.taxId}</p>}
            {sale.customer.address && <p className="text-slate-600">{sale.customer.address}</p>}
          </section>
        )}

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-2 font-normal">Concepto</th>
              <th className="py-2 text-right font-normal">Uds.</th>
              <th className="hidden py-2 text-right font-normal sm:table-cell">Precio</th>
              <th className="hidden py-2 text-right font-normal sm:table-cell">IVA</th>
              <th className="py-2 text-right font-normal">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sale.items.map((it) => (
              <tr key={it.id}>
                <td className="py-2.5 pr-3">{it.name}</td>
                <td className="num py-2.5 text-right">{it.quantity}</td>
                <td className="num hidden py-2.5 text-right sm:table-cell">{formatMoney(it.unitPriceCents)}</td>
                <td className="num hidden py-2.5 text-right text-slate-500 sm:table-cell">{formatPercent(it.taxRateBp)}</td>
                <td className="num py-2.5 text-right font-medium">{formatMoney(it.unitPriceCents * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-6 w-full max-w-xs space-y-1.5 border-t border-slate-200 pt-4 text-sm">
          {sale.discountCents > 0 && (
            <div className="flex justify-between text-slate-600"><dt>Descuento</dt><dd className="num">−{formatMoney(sale.discountCents)}</dd></div>
          )}
          {[...byRate.entries()].map(([rate, v]) => (
            <div key={rate} className="flex justify-between text-slate-600">
              <dt>Base {formatPercent(rate)} · IVA</dt>
              <dd className="num">{formatMoney(v.base)} · {formatMoney(v.tax)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between pt-2">
            <dt className="font-medium">Total</dt>
            <dd className="num text-2xl font-semibold tracking-tight">{formatMoney(sale.totalCents)}</dd>
          </div>
          <div className="flex justify-between text-xs text-slate-500"><dt>Forma de pago</dt><dd>{PAYMENT_METHODS[sale.paymentMethod]}</dd></div>
        </dl>
      </article>

      {/* Estado y acciones, según el perfil */}
      <aside className="no-print space-y-4 lg:sticky lg:top-8">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Estado</p>
            <StatusBadge status={sale.status} />
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            {sale.location && <div className="flex justify-between gap-3"><dt className="text-slate-500">Local</dt><dd className="truncate">{sale.location.name}</dd></div>}
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Atendió</dt><dd className="truncate">{sale.createdBy?.name ?? "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Hora</dt><dd className="num">{formatDate(sale.createdAt, true)}</dd></div>
          </dl>

          {sale.status === "pending" && can("cash.manage") && (
            <form action={paySaleAction.bind(null, sale.id)} className="mt-5 space-y-2 border-t border-slate-100 pt-4">
              <label className="label" htmlFor="method">Cobrar ahora con</label>
              <select id="method" name="method" className="input" defaultValue="card">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <SubmitButton className="btn-primary w-full">Marcar como cobrada</SubmitButton>
            </form>
          )}
          {sale.status === "pending" && !can("cash.manage") && (
            <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">Pendiente de cobro. Avisa a quien lleve la caja cuando la paguen.</p>
          )}
        </section>

        {!cancelled && can("sales.cancel") && (
          <section className="card p-5">
            <p className="text-sm font-medium">Anular la venta</p>
            <p className="mt-1 text-xs text-slate-500">Devuelve el stock al local y, si estaba cobrada, apunta la salida en la caja. La factura queda registrada como anulada.</p>
            <form action={cancelSaleAction.bind(null, sale.id)} className="mt-3">
              <ConfirmButton className="btn-danger btn-sm w-full" message="¿Anular esta venta? Se devolverá el stock y, si estaba cobrada, se registrará la salida en caja.">Anular venta</ConfirmButton>
            </form>
          </section>
        )}

        {can("sales.create") && <Link href="/panel/ventas/nueva" className="btn-secondary w-full">Nueva venta</Link>}
      </aside>
    </div>
  );
}
