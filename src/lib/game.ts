import "server-only";
import { cache } from "react";
import { db } from "./db";
import { startOfToday, zonedMidnight, zonedParts } from "./time";

/**
 * Capa de "juego": niveles, misiones, objetivo diario y racha.
 * Todo se calcula a partir de los datos reales del negocio (no hay tablas
 * propias), así que nunca se desincroniza.
 */

export const XP_PER_SALE = 5;
export const XP_PER_PRODUCT = 2;

export const LEVELS = [
  { xp: 0, name: "Aprendiz" },
  { xp: 60, name: "Emprendedor" },
  { xp: 180, name: "Comerciante" },
  { xp: 400, name: "Experto" },
  { xp: 800, name: "Maestro" },
  { xp: 1500, name: "Leyenda" },
  { xp: 3000, name: "Leyenda dorada" },
];

export function levelFor(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const current = LEVELS[i];
  const next = LEVELS[i + 1];
  return {
    level: i + 1,
    name: current.name,
    xpInLevel: xp - current.xp,
    xpForNext: next ? next.xp - current.xp : 0,
    isMax: !next,
  };
}

export interface Mission {
  id: string;
  title: string;
  hint: string;
  href: string;
  xp: number;
  done: boolean;
}

export interface Progress {
  xp: number;
  level: ReturnType<typeof levelFor>;
  missions: Mission[];
  todayCents: number;
  goalCents: number;
  goalIsAuto: boolean;
  streak: number;
  salesCount: number;
}

const DEFAULT_GOAL_CENTS = 10_000; // 100 €

function dayKey(d: Date) {
  const p = zonedParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

export const getProgress = cache(async function getProgress(org: {
  id: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  dailyGoalCents: number | null;
}): Promise<Progress> {
  const today = startOfToday();
  const p = zonedParts(today);
  const since = zonedMidnight(p.year, p.month, p.day - 60);

  const [salesCount, productCount, customerCount, withImage, expenses, recentSales, compared, supplierPrices] = await Promise.all([
    db.sale.count({ where: { orgId: org.id, status: { not: "cancelled" } } }),
    db.product.count({ where: { orgId: org.id, active: true } }),
    db.customer.count({ where: { orgId: org.id } }),
    db.product.count({ where: { orgId: org.id, active: true, imageUrl: { not: null } } }),
    db.cashMovement.count({ where: { orgId: org.id, amountCents: { lt: 0 }, saleId: null } }),
    db.sale.findMany({
      where: { orgId: org.id, status: { not: "cancelled" }, createdAt: { gte: since } },
      select: { createdAt: true, totalCents: true },
    }),
    db.competitorPrice.count({ where: { orgId: org.id } }),
    db.supplierPrice.count({ where: { orgId: org.id } }),
  ]);

  // Ventas por día (zona horaria del negocio)
  const byDay = new Map<string, number>();
  for (const s of recentSales) byDay.set(dayKey(s.createdAt), (byDay.get(dayKey(s.createdAt)) ?? 0) + s.totalCents);
  const todayCents = byDay.get(dayKey(new Date())) ?? 0;

  // Objetivo: el que ponga el usuario o, si no, un poco más que su media diaria
  let goalCents = org.dailyGoalCents ?? 0;
  const goalIsAuto = !org.dailyGoalCents;
  if (goalIsAuto) {
    const pastDays = [...byDay.entries()].filter(([k]) => k !== dayKey(new Date()));
    const avg = pastDays.length ? pastDays.reduce((a, [, v]) => a + v, 0) / pastDays.length : 0;
    goalCents = avg ? Math.max(2_000, Math.ceil((avg * 1.1) / 1000) * 1000) : DEFAULT_GOAL_CENTS;
  }

  // Racha: días seguidos con ventas, contando hasta hoy (o ayer si hoy aún no hay)
  let streak = 0;
  for (let i = todayCents > 0 ? 0 : 1; i < 60; i++) {
    const d = zonedMidnight(p.year, p.month, p.day - i);
    if (byDay.has(dayKey(d))) streak++;
    else break;
  }
  const goalEverReached = [...byDay.values()].some((v) => v >= goalCents);

  const missions: Mission[] = [
    { id: "producto", title: "Añade tu primer producto", hint: "Lo que vendes es la base de todo.", href: "/panel/productos/nuevo", xp: 20, done: productCount >= 1 },
    { id: "venta", title: "Haz tu primera venta", hint: "Pulsa VENDER, elige y cobra.", href: "/panel/ventas/nueva", xp: 30, done: salesCount >= 1 },
    { id: "perfil", title: "Completa los datos de tu negocio", hint: "Salen en tus facturas y en tu tienda.", href: "/panel/ajustes", xp: 20, done: Boolean(org.taxId && (org.address || org.phone)) },
    { id: "cliente", title: "Guarda tu primer cliente", hint: "Así sabrás quién vuelve a comprarte.", href: "/panel/clientes/nuevo", xp: 20, done: customerCount >= 1 },
    { id: "competencia", title: "Compara tus precios con la competencia", hint: "Buscamos en internet a cuánto lo venden otros.", href: "/panel/competencia", xp: 30, done: compared >= 1 },
    { id: "proveedores", title: "Encuentra tus proveedores más baratos", hint: "Detectamos lo que compras y buscamos quién te lo vende mejor.", href: "/panel/proveedores", xp: 30, done: supplierPrices >= 1 },
    { id: "cinco", title: "Ten 5 productos en tu catálogo", hint: "Cuantos más, más fácil vender.", href: "/panel/productos/nuevo", xp: 30, done: productCount >= 5 },
    { id: "foto", title: "Ponle foto a un producto", hint: "Con foto se vende más en tu tienda online.", href: "/panel/productos", xp: 20, done: withImage >= 1 },
    { id: "gasto", title: "Apunta un gasto en la caja", hint: "Para saber cuánto dinero tienes de verdad.", href: "/panel/caja", xp: 20, done: expenses >= 1 },
    { id: "diez", title: "Llega a 10 ventas", hint: "¡Vas cogiendo ritmo!", href: "/panel/ventas/nueva", xp: 50, done: salesCount >= 10 },
    { id: "objetivo", title: "Cumple tu objetivo del día", hint: "Mira el anillo de tu inicio.", href: "/panel", xp: 50, done: goalEverReached },
    { id: "racha", title: "Vende 3 días seguidos", hint: "La constancia tiene premio.", href: "/panel/ventas/nueva", xp: 50, done: streak >= 3 },
    { id: "cien", title: "Llega a 100 ventas", hint: "Esto ya es un negocio en marcha.", href: "/panel/ventas/nueva", xp: 150, done: salesCount >= 100 },
  ];

  const xp =
    missions.filter((m) => m.done).reduce((a, m) => a + m.xp, 0) + salesCount * XP_PER_SALE + productCount * XP_PER_PRODUCT;

  return { xp, level: levelFor(xp), missions, todayCents, goalCents, goalIsAuto, streak, salesCount };
});
