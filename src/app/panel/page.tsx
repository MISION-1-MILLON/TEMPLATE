import Link from "next/link";
import { GoalRing, LevelBadge, MissionRow, TodaySummary, XpBar } from "@/components/game";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProgress } from "@/lib/game";
import { centsToInput, formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { setDailyGoal } from "./actions";

export const metadata = { title: "Inicio" };

export default async function Dashboard() {
  const { org, user, sector } = await requireSession();
  const t = sector.terms;

  const [progress, pending, lowStock, recent] = await Promise.all([
    getProgress(org),
    db.sale.aggregate({ where: { orgId: org.id, status: "pending" }, _sum: { totalCents: true }, _count: true }),
    db.$queryRaw<Array<{ id: string; name: string; stock: number }>>`
      SELECT id, name, stock FROM "Product"
      WHERE "orgId" = ${org.id} AND active = true AND "trackStock" = true AND stock <= "lowStockAt"
      ORDER BY stock ASC LIMIT 5`,
    db.sale.findMany({
      where: { orgId: org.id, status: { not: "cancelled" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: { select: { name: true } }, items: { select: { name: true, quantity: true } } },
    }),
  ]);

  const pendingMissions = progress.missions.filter((m) => !m.done);
  const doneCount = progress.missions.length - pendingMissions.length;
  const isNew = progress.salesCount === 0;

  return (
    <div className="space-y-6">
      {/* Cabecera: saludo + nivel */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-500 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center gap-5">
          <LevelBadge level={progress.level.level} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/80">Hola, {user.name.split(" ")[0]} 👋</p>
            <h1 className="display text-3xl">Nivel {progress.level.level} · {progress.level.name}</h1>
            <div className="mt-3 max-w-md"><XpBar progress={progress} dark /></div>
          </div>
          <Link href="/panel/ventas/nueva" className="btn display w-full bg-white px-8 py-4 text-lg uppercase text-brand-700 shadow-md hover:bg-amber-50 sm:w-auto">
            Vender
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Objetivo del día */}
        <section className="card flex flex-col items-center gap-5 p-5 text-center sm:flex-row sm:text-left lg:col-span-2">
          <GoalRing today={progress.todayCents} goal={progress.goalCents} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Objetivo de hoy</p>
            <p className="display text-3xl tabular-nums">
              {formatMoney(progress.todayCents)} <span className="whitespace-nowrap text-lg text-slate-400">de {formatMoney(progress.goalCents)}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600"><TodaySummary progress={progress} /></p>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-brand-600">Cambiar objetivo</summary>
              <form action={setDailyGoal} className="mt-2 flex gap-2">
                <input className="input max-w-[140px]" name="goal" inputMode="decimal" placeholder="150" defaultValue={progress.goalIsAuto ? "" : centsToInput(progress.goalCents)} />
                <button className="btn-secondary">Guardar</button>
              </form>
              <p className="mt-1 text-xs text-slate-500">Déjalo vacío y lo calculamos según lo que sueles vender.</p>
            </details>
          </div>
        </section>

        {/* Racha */}
        <section className="card flex flex-col items-center justify-center p-5 text-center">
          <p className="text-5xl">{progress.streak > 0 ? "🔥" : "🪵"}</p>
          <p className="display mt-2 text-3xl">{progress.streak} {progress.streak === 1 ? "día" : "días"}</p>
          <p className="text-sm text-slate-500">{progress.streak > 0 ? "vendiendo seguidos. ¡No rompas la racha!" : "Vende hoy para encender tu racha."}</p>
        </section>
      </div>

      {/* Accesos rápidos */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/panel/ventas/nueva", icon: "🛒", label: "Vender", sub: "Cobrar algo ahora" },
          { href: "/panel/productos/nuevo", icon: "➕", label: `Añadir ${t.product.toLowerCase()}`, sub: "A tu catálogo" },
          { href: "/panel/caja", icon: "💶", label: "Mi dinero", sub: "Lo que entra y sale" },
          { href: "/panel/tienda", icon: "🏪", label: `Mi ${t.store.toLowerCase()}`, sub: "Tu web para clientes" },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="card flex flex-col items-start p-4 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md">
            <span className="text-3xl">{a.icon}</span>
            <span className="mt-2 font-bold">{a.label}</span>
            <span className="text-xs text-slate-500">{a.sub}</span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Misiones */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="display text-2xl">Misiones</h2>
              <p className="text-sm text-slate-500">{doneCount} de {progress.missions.length} completadas</p>
            </div>
            <Link href="/panel/misiones" className="text-sm font-semibold text-brand-600">Ver todas</Link>
          </div>
          <div className="space-y-2">
            {pendingMissions.length === 0 ? (
              <p className="card p-5 text-center">🏆 ¡Has completado todas las misiones! Eres una leyenda.</p>
            ) : (
              pendingMissions.slice(0, isNew ? 4 : 3).map((m) => <MissionRow key={m.id} m={m} />)
            )}
          </div>
        </section>

        {/* Avisos */}
        <section className="space-y-4">
          {pending._count > 0 && (
            <Link href="/panel/ventas?estado=pending" className="card block border-amber-200 bg-amber-50 p-4">
              <p className="font-bold text-amber-900">💸 Te deben {formatMoney(pending._sum.totalCents ?? 0)}</p>
              <p className="text-sm text-amber-800">{pending._count} {pending._count === 1 ? "venta pendiente" : "ventas pendientes"} de cobrar. Toca para verlas.</p>
            </Link>
          )}
          <div className="card">
            <h2 className="border-b border-slate-100 px-4 py-3 font-bold">📦 Se te está acabando</h2>
            {lowStock.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Nada por ahora. Tienes de todo.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lowStock.map((p) => (
                  <li key={p.id}>
                    <Link href={`/panel/productos/${p.id}`} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50">
                      <span className="truncate">{p.name}</span>
                      <span className={`badge ${Number(p.stock) <= 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                        {Number(p.stock) <= 0 ? "Agotado" : `Quedan ${Number(p.stock)}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Últimas ventas */}
      {recent.length > 0 && (
        <section className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-bold">Lo último que has vendido</h2>
            <Link href="/panel/ventas" className="text-sm font-semibold text-brand-600">Ver todo</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recent.map((s) => (
              <li key={s.id}>
                <Link href={`/panel/ventas/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {s.items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name)).join(", ")}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {formatDate(s.createdAt, true)}{s.customer ? ` · ${s.customer.name}` : ""}{s.status === "pending" ? " · pendiente de cobro" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{formatMoney(s.totalCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
