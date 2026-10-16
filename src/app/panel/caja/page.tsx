import Link from "next/link";
import { PageHeader, Stat } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { APP_TZ, dayRange, todayIso } from "@/lib/time";
import { formatDate, PAYMENT_METHODS } from "@/lib/utils";
import { addCashMovement } from "./actions";

export const metadata = { title: "Caja" };

export default async function CashPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia } = await searchParams;
  const { org } = await requireSession();

  const dayStr = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : todayIso();
  const { start: day, end: next } = dayRange(dayStr);

  const movements = await db.cashMovement.findMany({
    where: { orgId: org.id, createdAt: { gte: day, lt: next } },
    orderBy: { createdAt: "desc" },
  });
  const byMethod = new Map<string, number>();
  let ins = 0;
  let outs = 0;
  for (const m of movements) {
    byMethod.set(m.method, (byMethod.get(m.method) ?? 0) + m.amountCents);
    if (m.amountCents > 0) ins += m.amountCents;
    else outs += m.amountCents;
  }

  return (
    <>
      <PageHeader
        title="Caja"
        subtitle="Cada venta cobrada entra aquí sola. Añade a mano el cambio inicial, gastos o retiradas."
        actions={
          <form className="flex gap-2">
            <input className="input" type="date" name="dia" defaultValue={dayStr} />
            <button className="btn-secondary">Ver día</button>
          </form>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Entradas" value={formatMoney(ins)} />
        <Stat label="Salidas" value={formatMoney(outs)} />
        <Stat label="Saldo del día" value={formatMoney(ins + outs)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
          <span key={k} className="badge bg-white px-3 py-1 text-sm text-slate-700 ring-1 ring-slate-200">
            {v}: <strong className="ml-1 tabular-nums">{formatMoney(byMethod.get(k) ?? 0)}</strong>
          </span>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="border-b border-slate-100 px-5 py-3 font-bold">Movimientos del {formatDate(day)}</h2>
          {movements.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No hay movimientos este día.</p>
          ) : (
            <table className="table">
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="text-slate-500">{new Intl.DateTimeFormat("es-ES", { timeStyle: "short", timeZone: APP_TZ }).format(m.createdAt)}</td>
                    <td>{m.saleId ? <Link href={`/panel/ventas/${m.saleId}`} className="hover:text-brand-600">{m.concept}</Link> : m.concept}</td>
                    <td className="text-slate-600">{PAYMENT_METHODS[m.method]}</td>
                    <td className={`text-right font-semibold tabular-nums ${m.amountCents < 0 ? "text-red-600" : ""}`}>{formatMoney(m.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <form action={addCashMovement} className="card space-y-3 self-start p-5">
          <h2 className="font-bold">Movimiento manual</h2>
          <select className="input" name="type" defaultValue="in">
            <option value="in">Entrada (cambio inicial, ingreso…)</option>
            <option value="out">Salida (gasto, retirada…)</option>
          </select>
          <input className="input" name="concept" placeholder="Concepto" required />
          <div className="flex gap-2">
            <input className="input" name="amount" inputMode="decimal" placeholder="0,00" required />
            <select className="input" name="method" defaultValue="cash">
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button className="btn-primary w-full">Añadir</button>
        </form>
      </div>
    </>
  );
}
