import Link from "next/link";
import { ArrowRight, Download, Plus } from "lucide-react";
import { Pulse, type PulseSale } from "@/components/Pulse";
import { requireSession, type PanelSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProgress } from "@/lib/game";
import { latestCompetitorPrices, latestSupplierOffers, marketStats } from "@/lib/market";
import { centsToInput, formatMoney } from "@/lib/money";
import { moduleEnabled } from "@/lib/modules";
import { startOfToday, zonedMidnight, zonedParts } from "@/lib/time";
import { formatDate, cn } from "@/lib/utils";
import { setDailyGoal } from "./actions";

export const metadata = { title: "Inicio" };

const minutesOf = (d: Date) => { const p = zonedParts(d); return p.hour * 60 + p.minute; };
const longDate = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Madrid" });

export default async function Dashboard() {
  const s = await requireSession();
  if (s.role === "accountant") return <AccountantHome s={s} />;
  return <OperatorHome s={s} />;
}

/* ───────────────────────── Dueño, gerente y empleado ───────────────────────── */

async function OperatorHome({ s }: { s: PanelSession }) {
  const { org, user, location, role, can, sector } = s;
  const t = sector.terms;
  const today = startOfToday();
  const p = zonedParts(today);
  const weekAgo = zonedMidnight(p.year, p.month, p.day - 7);
  const weekAgoEnd = zonedMidnight(p.year, p.month, p.day - 6);
  const mine = role === "staff"; // el empleado ve solo sus ventas
  const where = { orgId: org.id, status: { not: "cancelled" }, ...(location ? { locationId: location.id } : {}), ...(mine ? { createdById: user.id } : {}) };

  const [todaySales, lastWeekSales, pending, lowStock, recent] = await Promise.all([
    db.sale.findMany({ where: { ...where, createdAt: { gte: today } }, select: { createdAt: true, totalCents: true, items: { select: { name: true, quantity: true, unitPriceCents: true, product: { select: { costCents: true } } } } }, orderBy: { createdAt: "asc" } }),
    db.sale.findMany({ where: { ...where, createdAt: { gte: weekAgo, lt: weekAgoEnd } }, select: { createdAt: true, totalCents: true } }),
    can("cash.view") ? db.sale.aggregate({ where: { orgId: org.id, status: "pending", ...(location ? { locationId: location.id } : {}) }, _sum: { totalCents: true }, _count: true }) : null,
    can("stock.view") && location
      ? db.productStock.findMany({ where: { locationId: location.id, product: { active: true, trackStock: true } }, include: { product: { select: { id: true, name: true, lowStockAt: true } } }, orderBy: { quantity: "asc" }, take: 40 })
      : [],
    db.sale.findMany({ where, orderBy: { createdAt: "desc" }, take: 6, include: { customer: { select: { name: true } }, items: { select: { name: true, quantity: true } } } }),
  ]);

  const total = todaySales.reduce((a, x) => a + x.totalCents, 0);
  const lastWeekTotal = lastWeekSales.reduce((a, x) => a + x.totalCents, 0);
  const avg = todaySales.length ? Math.round(total / todaySales.length) : 0;
  const label = (x: (typeof todaySales)[number]) => x.items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name)).join(", ");
  const pulseToday: PulseSale[] = todaySales.map((x) => ({ at: minutesOf(x.createdAt), cents: x.totalCents, label: label(x) }));
  const pulseWeek: PulseSale[] = lastWeekSales.map((x) => ({ at: minutesOf(x.createdAt), cents: x.totalCents, label: "" }));
  const low = lowStock.filter((r) => r.quantity <= r.product.lowStockAt).slice(0, 6);
  // Margen de hoy (solo el dueño ve costes): ventas menos coste de lo vendido
  const margin = can("finance.profit")
    ? todaySales.reduce((a, x) => a + x.items.reduce((b, i) => b + (i.unitPriceCents - (i.product?.costCents ?? 0)) * i.quantity, 0), 0)
    : null;

  // Lo que pide atención, por gravedad
  const attention: Array<{ href: string; text: string; action: string; tone: "negative" | "warning" | "neutral" }> = [];
  for (const r of low) attention.push({ href: `/panel/productos/${r.product.id}`, text: r.quantity <= 0 ? `${r.product.name}: agotado en este local` : `${r.product.name}: quedan ${r.quantity}`, action: can("stock.adjust") ? "Reponer" : "Ver", tone: r.quantity <= 0 ? "negative" : "warning" });
  if (pending && pending._count > 0) attention.unshift({ href: "/panel/ventas?estado=pending", text: `Te deben ${formatMoney(pending._sum.totalCents ?? 0)} de ${pending._count} ${pending._count === 1 ? "venta" : "ventas"}`, action: "Cobrar", tone: "warning" });

  if (can("market.use") && (moduleEnabled(org, "competencia") || moduleEnabled(org, "proveedores"))) {
    const [prices, offers, products, supplies] = await Promise.all([
      latestCompetitorPrices(org.id), latestSupplierOffers(org.id),
      db.product.findMany({ where: { orgId: org.id, active: true }, select: { id: true, priceCents: true } }),
      db.supplyItem.findMany({ where: { orgId: org.id }, select: { id: true, currentSupplierId: true } }),
    ]);
    const pricier = products.map((x) => marketStats(x.priceCents, prices.get(x.id) ?? [])).filter((x) => x.position === "above" || x.position === "most_expensive").length;
    const savings = supplies.filter((i) => { const l = offers.get(i.id) ?? []; const cur = l.find((o) => o.supplierId === i.currentSupplierId); return cur && l[0] && l[0].priceCents < cur.priceCents; }).length;
    if (pricier && moduleEnabled(org, "competencia")) attention.push({ href: "/panel/competencia", text: `Estás más caro que la competencia en ${pricier} ${pricier === 1 ? t.product.toLowerCase() : t.products.toLowerCase()}`, action: "Revisar", tone: "neutral" });
    if (savings && moduleEnabled(org, "proveedores")) attention.push({ href: "/panel/proveedores", text: `Podrías comprar más barato ${savings} ${savings === 1 ? "cosa" : "cosas"}`, action: "Ver ahorro", tone: "neutral" });
  }

  const progress = can("stats.view") ? await getProgress(org) : null;
  const nextMission = progress?.missions.find((m) => !m.done);
  const goal = progress?.goalCents ?? 0;
  const now = new Date();
  // Comparación justa: la semana pasada solo hasta esta misma hora
  const lastWeekSoFar = lastWeekSales.filter((x) => minutesOf(x.createdAt) <= minutesOf(now)).reduce((a, x) => a + x.totalCents, 0);
  const vsWeek = lastWeekSoFar ? Math.round(((total - lastWeekSoFar) / lastWeekSoFar) * 100) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 first-letter:uppercase">{longDate.format(now)}{location ? ` · ${location.name}` : ""}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{mine ? `Tu turno, ${user.name.split(" ")[0]}` : "Hoy en el negocio"}</h1>
        </div>
        {can("sales.create") && (
          <Link href="/panel/ventas/nueva" className={cn("btn-primary", mine && "btn-lg w-full sm:w-auto")}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Nueva venta
          </Link>
        )}
      </header>

      {/* El pulso del día */}
      <section className="card p-5" aria-labelledby="pulso">
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
          <div>
            <h2 id="pulso" className="text-sm font-medium text-slate-500">{mine ? "Has vendido hoy" : "Vendido hoy"}</h2>
            <p className="num mt-1 text-4xl font-semibold tracking-tight">{formatMoney(total)}</p>
            {!mine && goal > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                {total >= goal ? <span className="font-medium text-positive">Objetivo cumplido</span> : <>Faltan <span className="num font-medium text-ink">{formatMoney(goal - total)}</span> para el objetivo de {formatMoney(goal)}</>}
              </p>
            )}
          </div>
          <dl className="grid grid-cols-3 gap-x-8 gap-y-1 text-sm">
            <div><dt className="text-slate-500">Tickets</dt><dd className="num mt-0.5 text-lg font-medium">{todaySales.length}</dd></div>
            <div><dt className="text-slate-500">Ticket medio</dt><dd className="num mt-0.5 text-lg font-medium">{formatMoney(avg)}</dd></div>
            {margin !== null ? (
              <div><dt className="text-slate-500">Margen</dt><dd className="num mt-0.5 text-lg font-medium">{formatMoney(margin)}</dd></div>
            ) : (
              <div><dt className="text-slate-500">Hace una semana</dt><dd className="num mt-0.5 text-lg font-medium">{formatMoney(lastWeekTotal)}</dd></div>
            )}
          </dl>
        </div>
        <div className="mt-5">
          <Pulse opensAt={location?.opensAt ?? "09:00"} closesAt={location?.closesAt ?? "21:00"} today={pulseToday} lastWeek={pulseWeek} nowMin={minutesOf(now)} />
        </div>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-sm bg-brand-600" />Hoy</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-sm bg-slate-300" />Mismo día la semana pasada</span>
          {vsWeek !== null && <span className="num">{vsWeek >= 0 ? `+${vsWeek} %` : `${vsWeek} %`} frente a la semana pasada a esta hora del día</span>}
        </p>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        {/* Qué requiere atención */}
        <section className="card lg:col-span-3" aria-labelledby="atencion">
          <div className="card-header"><h2 id="atencion" className="card-title">Requiere atención</h2><span className="text-xs text-slate-500">{attention.length || "Nada"}</span></div>
          {attention.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Todo en orden{location ? ` en ${location.name}` : ""}. Lo que necesite tu atención aparecerá aquí.</p>
          ) : (
            <ul className="p-1.5">
              {attention.slice(0, 7).map((a) => (
                <li key={a.href + a.text}>
                  <Link href={a.href} className="group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors duration-150 hover:bg-slate-50">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", a.tone === "negative" ? "bg-negative" : a.tone === "warning" ? "bg-warning" : "bg-slate-400")} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{a.text}</span>
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-ink">{a.action}<ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Progreso (el juego, rediseñado) o stock para el empleado */}
        {progress ? (
          <section className="card flex flex-col p-5 lg:col-span-2" aria-labelledby="progreso">
            <div className="flex items-baseline justify-between">
              <h2 id="progreso" className="card-title">Progreso del negocio</h2>
              <Link href="/panel/misiones" className="text-xs font-medium text-slate-500 hover:text-ink">Ver misiones</Link>
            </div>
            <p className="mt-3 text-lg font-semibold">Nivel {progress.level.level} · {progress.level.name}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress.level.isMax ? 100 : Math.round((progress.level.xpInLevel / progress.level.xpForNext) * 100)}%` }} />
            </div>
            <p className="num mt-1.5 text-xs text-slate-500">{progress.level.isMax ? "Nivel máximo" : `${progress.level.xpInLevel} de ${progress.level.xpForNext} puntos para el siguiente nivel`}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
              <div><dt className="text-slate-500">Racha</dt><dd className="mt-0.5 font-medium">{progress.streak} {progress.streak === 1 ? "día" : "días"} vendiendo</dd></div>
              <div><dt className="text-slate-500">Misiones</dt><dd className="num mt-0.5 font-medium">{progress.missions.filter((m) => m.done).length} de {progress.missions.length}</dd></div>
            </dl>
            {nextMission && (
              <Link href={nextMission.href} className="group mt-4 flex items-center gap-3 rounded-lg bg-slate-50 px-3.5 py-3 text-sm transition-colors duration-150 hover:bg-slate-100">
                <span className="min-w-0 flex-1"><span className="block font-medium">{nextMission.title}</span><span className="block truncate text-xs text-slate-500">{nextMission.hint}</span></span>
                <span className="badge-brand num">+{nextMission.xp}</span>
              </Link>
            )}
            {can("cash.manage") && (
              <details className="mt-auto pt-4 text-sm">
                <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-ink">Objetivo diario: {formatMoney(goal)}{progress.goalIsAuto ? " (automático)" : ""}</summary>
                <form action={setDailyGoal} className="mt-2 flex gap-2">
                  <label htmlFor="goal" className="sr-only">Objetivo diario en euros</label>
                  <input id="goal" className="input max-w-[140px]" name="goal" inputMode="decimal" placeholder="150" defaultValue={progress.goalIsAuto ? "" : centsToInput(goal)} />
                  <button className="btn-secondary">Guardar</button>
                </form>
                <p className="hint">Vacío: lo calculamos con lo que sueles vender.</p>
              </details>
            )}
          </section>
        ) : (
          <section className="card lg:col-span-2" aria-labelledby="stock">
            <div className="card-header"><h2 id="stock" className="card-title">Stock en {location?.name ?? "tu local"}</h2><Link href="/panel/productos" className="text-xs font-medium text-slate-500 hover:text-ink">Ver todo</Link></div>
            {lowStock.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">Este local no lleva control de stock.</p> : (
              <ul className="divide-y divide-slate-100">
                {lowStock.slice(0, 6).map((r) => (
                  <li key={r.productId} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className="truncate">{r.product.name}</span>
                    <span className={cn("num font-medium", r.quantity <= 0 ? "text-negative" : r.quantity <= r.product.lowStockAt ? "text-warning" : "text-slate-600")}>{r.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* Últimas ventas */}
      <section className="card" aria-labelledby="ultimas">
        <div className="card-header">
          <h2 id="ultimas" className="card-title">{mine ? "Tus últimas ventas" : "Últimas ventas"}</h2>
          <Link href="/panel/ventas" className="text-xs font-medium text-slate-500 hover:text-ink">Ver todas</Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Aún no hay ventas{location ? ` en ${location.name}` : ""}. La primera aparecerá aquí en cuanto cobres.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((x) => (
              <li key={x.id}>
                <Link href={`/panel/ventas/${x.id}`} className="flex items-center gap-4 px-5 py-3 text-sm transition-colors duration-150 hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{x.items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name)).join(", ")}</span>
                    <span className="block text-xs text-slate-500">{formatDate(x.createdAt, true)}{x.customer ? ` · ${x.customer.name}` : ""}</span>
                  </span>
                  {x.status === "pending" && <span className="badge-warning">Pendiente</span>}
                  <span className="num shrink-0 font-medium">{formatMoney(x.totalCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ───────────────────────── Gestoría ───────────────────────── */

async function AccountantHome({ s }: { s: PanelSession }) {
  const { org } = s;
  const now = zonedParts(new Date());
  const q = Math.floor((now.month - 1) / 3);
  const from = zonedMidnight(now.year, q * 3 + 1, 1);
  const to = zonedMidnight(now.year, q * 3 + 4, 1);
  const [sales, cancelled, expenses] = await Promise.all([
    db.sale.aggregate({ where: { orgId: org.id, status: { not: "cancelled" }, createdAt: { gte: from, lt: to } }, _sum: { subtotalCents: true, taxCents: true, totalCents: true }, _count: true }),
    db.sale.count({ where: { orgId: org.id, status: "cancelled", createdAt: { gte: from, lt: to } } }),
    db.cashMovement.aggregate({ where: { orgId: org.id, saleId: null, amountCents: { lt: 0 }, createdAt: { gte: from, lt: to } }, _sum: { amountCents: true }, _count: true }),
  ]);
  const fmtRange = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" });
  const rows = [
    ["Facturas emitidas", String(sales._count)],
    ["Base imponible", formatMoney(sales._sum.subtotalCents ?? 0)],
    ["IVA repercutido", formatMoney(sales._sum.taxCents ?? 0)],
    ["Total facturado", formatMoney(sales._sum.totalCents ?? 0)],
    ["Ventas anuladas", String(cancelled)],
    ["Gastos apuntados en caja", `${formatMoney(Math.abs(expenses._sum.amountCents ?? 0))} (${expenses._count})`],
  ];
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{org.name} · {org.taxId ? `NIF ${org.taxId}` : "NIF sin indicar"}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{q + 1}.º trimestre de {now.year}</h1>
          <p className="mt-1 text-sm text-slate-500">Del {fmtRange.format(from)} a hoy. Solo lectura.</p>
        </div>
        <a href={`/panel/ventas/exportar`} className="btn-primary"><Download className="h-4 w-4" strokeWidth={2} /> Exportar ventas (CSV)</a>
      </header>
      <section className="card">
        <dl className="divide-y divide-slate-100">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3 text-sm">
              <dt className="text-slate-600">{k}</dt><dd className="num font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["/panel/ventas", "Ventas y facturas", "Cada factura con su base e IVA"], ["/panel/caja", "Caja y gastos", "Entradas y salidas por local"], ["/panel/impuestos", "IVA por trimestre", "Repercutido por tipo y trimestre"]].map(([href, title, sub]) => (
          <Link key={href} href={href} className="card group p-4 transition-colors duration-150 hover:border-slate-300">
            <span className="flex items-center justify-between font-medium">{title}<ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-200 ease-out group-hover:translate-x-0.5" /></span>
            <span className="mt-0.5 block text-sm text-slate-500">{sub}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
