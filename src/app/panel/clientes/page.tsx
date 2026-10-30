import Link from "next/link";
import { Search } from "lucide-react";
import { EmptyState, FilterChips, PageHeader } from "@/components/PageHeader";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Clientes" };

const DAY = 86_400_000;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; ver?: string }> }) {
  const { q, ver } = await searchParams;
  const { org, sector } = await requirePagePermission("customers.manage");
  const t = sector.terms;

  const customers = await db.customer.findMany({
    where: { orgId: org.id, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }] } : {}) },
    orderBy: { name: "asc" },
    take: 500,
  });
  const ids = customers.map((c) => c.id);
  const [totals, debts] = await Promise.all([
    db.sale.groupBy({ by: ["customerId"], where: { orgId: org.id, status: { not: "cancelled" }, customerId: { in: ids } }, _sum: { totalCents: true }, _count: true, _max: { createdAt: true } }),
    db.sale.groupBy({ by: ["customerId"], where: { orgId: org.id, status: "pending", customerId: { in: ids } }, _sum: { totalCents: true } }),
  ]);
  const stats = new Map(totals.map((x) => [x.customerId, x]));
  const owed = new Map(debts.map((x) => [x.customerId, x._sum.totalCents ?? 0]));

  // Segmentos que sirven para actuar: a quién cuidar, a quién cobrar, a quién recuperar
  const now = Date.now();
  const segments = {
    habituales: (id: string) => (stats.get(id)?._count ?? 0) >= 3,
    deben: (id: string) => (owed.get(id) ?? 0) > 0,
    dormidos: (id: string) => { const last = stats.get(id)?._max.createdAt; return Boolean(last && now - last.getTime() > 45 * DAY); },
  };
  const seg = ver && ver in segments ? segments[ver as keyof typeof segments] : null;
  const list = seg ? customers.filter((c) => seg(c.id)) : customers;
  const count = (k: keyof typeof segments) => customers.filter((c) => segments[k](c.id)).length;
  const href = (v?: string) => `/panel/clientes?${new URLSearchParams({ ...(q && { q }), ...(v && { ver: v }) })}`;

  return (
    <>
      <PageHeader
        title={t.customers}
        subtitle={`${customers.length} en total`}
        actions={<Link href="/panel/clientes/nuevo" className="btn-primary">Añadir {t.customer.toLowerCase()}</Link>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative w-full sm:w-72">
          {ver && <input type="hidden" name="ver" value={ver} />}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
          <input className="input pl-9" name="q" placeholder="Nombre, email o teléfono" defaultValue={q} aria-label="Buscar" />
        </form>
        <FilterChips
          items={[
            { label: "Todos", href: href(), active: !seg },
            { label: `Habituales · ${count("habituales")}`, href: href("habituales"), active: ver === "habituales" },
            { label: `Te deben · ${count("deben")}`, href: href("deben"), active: ver === "deben" },
            { label: `Sin volver · ${count("dormidos")}`, href: href("dormidos"), active: ver === "dormidos" },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <EmptyState
          title={customers.length === 0 && !q ? `Aún no hay ${t.customers.toLowerCase()}` : "Nadie en esta lista"}
          action={customers.length === 0 && !q ? <Link href="/panel/clientes/nuevo" className="btn-primary">Añadir {t.customer.toLowerCase()}</Link> : undefined}
        >
          {customers.length === 0 && !q ? "También se guardan al cobrar una venta: escribe su nombre en el ticket." : ver === "dormidos" ? "Todos han vuelto en las últimas seis semanas." : undefined}
        </EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th className="hidden md:table-cell">Contacto</th>
                <th className="hidden text-right sm:table-cell">Compras</th>
                <th className="hidden text-right md:table-cell">Última</th>
                <th className="text-right">Gastado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const s = stats.get(c.id);
                const debt = owed.get(c.id) ?? 0;
                return (
                  <tr key={c.id} className="relative hover:bg-slate-50">
                    <td>
                      <Link href={`/panel/clientes/${c.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                          {c.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{c.name}</span>
                          {debt > 0 && <span className="badge-warning mt-0.5">Debe {formatMoney(debt)}</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="hidden text-slate-600 md:table-cell">{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="num hidden text-right sm:table-cell">{s?._count ?? 0}</td>
                    <td className="num hidden text-right text-slate-600 md:table-cell">{s?._max.createdAt ? formatDate(s._max.createdAt) : "—"}</td>
                    <td className="num text-right font-medium">{formatMoney(s?._sum.totalCents ?? 0)}</td>
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
