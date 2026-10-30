import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FilterChips, Figures, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/forms";
import { requireSession, requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { APP_TZ, dayRange, todayIso } from "@/lib/time";
import { cn, PAYMENT_METHODS } from "@/lib/utils";
import { addCashMovement } from "./actions";

export const metadata = { title: "Caja" };

const SWATCH = ["bg-brand-600", "bg-brand-400", "bg-slate-400", "bg-slate-300", "bg-slate-200"];

const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export default async function CashPage({ searchParams }: { searchParams: Promise<{ dia?: string; local?: string }> }) {
  const q = await searchParams;
  await requirePagePermission("cash.view");
  const { org, locations, location, can } = await requireSession();
  const manage = can("cash.manage");

  const today = todayIso();
  const dayStr = q.dia && /^\d{4}-\d{2}-\d{2}$/.test(q.dia) && q.dia <= today ? q.dia : today;
  const { start, end } = dayRange(dayStr);
  // Cada local tiene su caja; quien ve varios puede sumarlas todas
  const multi = locations.length > 1;
  // La gestoría, que no lleva ninguna caja, empieza viéndolas todas
  const wantsAll = q.local === "todos" || (!q.local && !manage && can("locations.all"));
  const local = wantsAll && multi ? null : locations.find((l) => l.id === q.local) ?? location ?? locations[0];
  const scope: Prisma.CashMovementWhereInput = {
    orgId: org.id,
    ...(local ? { locationId: local.id } : can("locations.all") ? {} : { locationId: { in: locations.map((l) => l.id) } }),
  };

  const [movements, drawer] = await Promise.all([
    db.cashMovement.findMany({ where: { ...scope, createdAt: { gte: start, lt: end } }, orderBy: { createdAt: "desc" }, include: { location: { select: { name: true } } } }),
    db.cashMovement.aggregate({ where: { ...scope, method: "cash", createdAt: { lt: end } }, _sum: { amountCents: true } }),
  ]);
  let ins = 0;
  let outs = 0;
  const byMethod = new Map<string, number>();
  for (const m of movements) {
    if (m.amountCents > 0) ins += m.amountCents;
    else outs -= m.amountCents;
    byMethod.set(m.method, (byMethod.get(m.method) ?? 0) + m.amountCents);
  }
  const methods = Object.keys(PAYMENT_METHODS).filter((k) => byMethod.get(k));
  const positive = methods.reduce((a, k) => a + Math.max(0, byMethod.get(k)!), 0);

  const href = (patch: { dia?: string; local?: string }) => {
    const next = { dia: dayStr === today ? undefined : dayStr, local: q.local, ...patch };
    const params = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1])));
    return `/panel/caja${params.size ? `?${params}` : ""}`;
  };
  const longDay = new Intl.DateTimeFormat("es-ES", { timeZone: APP_TZ, weekday: "long", day: "numeric", month: "long" }).format(start);
  const time = new Intl.DateTimeFormat("es-ES", { timeStyle: "short", timeZone: APP_TZ });

  return (
    <>
      <PageHeader
        title={can("finance.tax") && !manage ? "Caja y gastos" : "Caja"}
        subtitle={<><span className="first-letter:uppercase inline-block">{dayStr === today ? "Hoy" : longDay}</span>{local ? ` · ${local.name}` : " · Todos los locales"}</>}
        actions={
          <div className="flex items-center gap-1">
            <Link href={href({ dia: shift(dayStr, -1) })} className="btn-icon" aria-label="Día anterior"><ChevronLeft className="h-4 w-4" strokeWidth={1.75} /></Link>
            <form className="contents">
              {q.local && <input type="hidden" name="local" value={q.local} />}
              <input className="input w-auto" type="date" name="dia" max={today} defaultValue={dayStr} aria-label="Elegir día" />
              <button className="btn-secondary">Ver</button>
            </form>
            {dayStr < today
              ? <Link href={href({ dia: shift(dayStr, 1) })} className="btn-icon" aria-label="Día siguiente"><ChevronRight className="h-4 w-4" strokeWidth={1.75} /></Link>
              : <span className="btn-icon pointer-events-none opacity-30" aria-hidden><ChevronRight className="h-4 w-4" strokeWidth={1.75} /></span>}
          </div>
        }
      />

      {multi && (
        <div className="mb-4">
          <FilterChips items={[...locations.map((l) => ({ label: l.name, href: href({ local: l.id }), active: local?.id === l.id })), { label: "Todos", href: href({ local: manage || !can("locations.all") ? "todos" : undefined }), active: !local }]} />
        </div>
      )}

      <Figures
        items={[
          { label: "Saldo del día", value: formatMoney(ins - outs), tone: ins - outs < 0 ? "negative" : undefined },
          { label: "Ha entrado", value: formatMoney(ins) },
          { label: "Ha salido", value: formatMoney(outs) },
          { label: "Efectivo en caja", value: formatMoney(drawer._sum.amountCents ?? 0), hint: dayStr === today ? "Lo que debería haber en el cajón" : "Al cierre de ese día" },
        ]}
      />

      <div className={cn("grid items-start gap-6", manage && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Movimientos</h2>
            <span className="text-xs text-slate-500">Las ventas se apuntan solas</span>
          </div>
          {positive > 0 && (
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                {methods.filter((k) => byMethod.get(k)! > 0).map((k) => (
                  <span key={k} className={cn("h-full", SWATCH[methods.indexOf(k)])} style={{ width: `${(byMethod.get(k)! / positive) * 100}%` }} />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {methods.map((k, i) => (
                  <li key={k} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", byMethod.get(k)! > 0 ? SWATCH[i] : "bg-negative")} />
                    <span className="text-slate-500">{PAYMENT_METHODS[k]}</span>
                    <span className="num font-medium">{formatMoney(byMethod.get(k)!)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {movements.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Ningún movimiento este día.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {movements.map((m) => (
                <li key={m.id} className="flex items-center gap-4 px-5 py-2.5 text-sm">
                  <span className="num w-11 shrink-0 text-slate-500">{time.format(m.createdAt)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{m.saleId ? <Link href={`/panel/ventas/${m.saleId}`} className="hover:underline">{m.concept}</Link> : m.concept}</span>
                    <span className="block truncate text-xs text-slate-500">{PAYMENT_METHODS[m.method] ?? m.method}{!local && m.location ? ` · ${m.location.name}` : ""}</span>
                  </span>
                  <span className={cn("num shrink-0 font-medium", m.amountCents < 0 ? "text-negative" : "")}>{m.amountCents > 0 ? "+" : "−"}{formatMoney(Math.abs(m.amountCents))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {manage && (
          <form action={addCashMovement} className="card space-y-4 p-5 lg:sticky lg:top-8">
            <div>
              <h2 className="card-title">Apuntar a mano</h2>
              <p className="mt-1 text-xs text-slate-500">Para lo que no es una venta: el cambio de la mañana, un gasto, una retirada…{location && multi ? ` Se apunta en ${location.name}.` : ""}</p>
            </div>
            <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label="Tipo">
              {[["out", "Sale dinero"], ["in", "Entra dinero"]].map(([v, l]) => (
                <label key={v} className="cursor-pointer rounded-md py-1.5 text-center text-sm font-medium text-slate-600 transition-colors duration-150 has-[:checked]:bg-white has-[:checked]:text-ink has-[:checked]:shadow-[0_1px_2px_rgb(0_0_0/0.08)]">
                  <input type="radio" name="type" value={v} defaultChecked={v === "out"} className="sr-only" />{l}
                </label>
              ))}
            </div>
            <div>
              <label className="label" htmlFor="concept">Concepto</label>
              <input className="input" id="concept" name="concept" placeholder="Ej.: compra de hielo" required />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div>
                <label className="label" htmlFor="amount">Importe</label>
                <input className="input num" id="amount" name="amount" inputMode="decimal" placeholder="0,00 €" required />
              </div>
              <div>
                <label className="label" htmlFor="method">Con</label>
                <select className="input" id="method" name="method" defaultValue="cash">
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <SubmitButton className="btn-primary w-full">Apuntar</SubmitButton>
          </form>
        )}
      </div>
    </>
  );
}
