import type { Prisma } from "@prisma/client";
import type { PanelSession } from "./auth";
import { dayRange, startOfMonth, startOfToday, zonedMidnight, zonedParts } from "./time";

export type Period = "hoy" | "7d" | "mes" | "todo";
export interface SalesQuery {
  periodo?: string;
  estado?: string;
  local?: string;
  desde?: string;
  hasta?: string;
}

/**
 * Qué ventas puede ver cada perfil y con qué filtros. Lo usan el listado y la
 * exportación, para que el CSV nunca saque más de lo que se ve en pantalla.
 */
export function salesWhere(s: PanelSession, q: SalesQuery) {
  const own = !s.can("sales.viewAll");
  const allowed = s.locations.map((l) => l.id);
  const custom = Boolean(q.desde || q.hasta);
  // El empleado solo ve lo suyo de hoy; el resto, este mes salvo que elija otra cosa
  const period: Period | "rango" = own ? "hoy" : custom ? "rango" : (["hoy", "7d", "mes", "todo"] as const).find((p) => p === q.periodo) ?? "mes";

  const createdAt: Prisma.DateTimeFilter = {};
  if (period === "hoy") createdAt.gte = startOfToday();
  if (period === "7d") {
    const p = zonedParts(new Date());
    createdAt.gte = zonedMidnight(p.year, p.month, p.day - 6);
  }
  if (period === "mes") createdAt.gte = startOfMonth();
  if (period === "rango") {
    if (q.desde) createdAt.gte = dayRange(q.desde).start;
    if (q.hasta) createdAt.lt = dayRange(q.hasta).end;
  }

  const local = q.local && allowed.includes(q.local) ? q.local : undefined;
  const where: Prisma.SaleWhereInput = {
    orgId: s.org.id,
    ...(own ? { createdById: s.user.id } : {}),
    ...(local ? { locationId: local } : s.can("locations.all") ? {} : { locationId: { in: allowed } }),
    ...(q.estado ? { status: q.estado } : {}),
    ...(createdAt.gte || createdAt.lt ? { createdAt } : {}),
  };
  return { where, period, local, own };
}

/** Qué venta concreta puede abrir cada perfil (el empleado, solo las suyas) */
export function saleScope(s: PanelSession): Prisma.SaleWhereInput {
  return {
    orgId: s.org.id,
    ...(s.can("sales.viewAll") ? {} : { createdById: s.user.id }),
    ...(s.can("locations.all") ? {} : { locationId: { in: s.locations.map((l) => l.id) } }),
  };
}
