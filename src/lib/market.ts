import "server-only";
import { db } from "./db";

/* ─── Competencia ─────────────────────────────────────────────────────── */

export interface SeenPrice {
  id: string;
  competitorId: string;
  competitorName: string;
  competitorKind: string;
  priceCents: number;
  url: string | null;
  note: string | null;
  observedAt: Date;
}

/** Último precio de cada competidor para cada producto: productId → precios */
export async function latestCompetitorPrices(orgId: string, productId?: string, maxAgeDays = 60) {
  const rows = await db.competitorPrice.findMany({
    where: { orgId, ...(productId ? { productId } : {}), observedAt: { gte: new Date(Date.now() - maxAgeDays * 86_400_000) } },
    orderBy: { observedAt: "desc" },
    include: { competitor: { select: { name: true, kind: true } } },
  });
  const out = new Map<string, SeenPrice[]>();
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.productId}:${r.competitorId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = out.get(r.productId) ?? [];
    list.push({
      id: r.id,
      competitorId: r.competitorId,
      competitorName: r.competitor.name,
      competitorKind: r.competitor.kind,
      priceCents: r.priceCents,
      url: r.url,
      note: r.note,
      observedAt: r.observedAt,
    });
    out.set(r.productId, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.priceCents - b.priceCents);
  return out;
}

export type MarketPosition = "nodata" | "cheapest" | "below" | "average" | "above" | "most_expensive";

export interface MarketStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  /** % de diferencia de mi precio respecto a la media (positivo = más caro) */
  diffPct: number;
  position: MarketPosition;
  /** Puesto de mi precio entre todos (1 = el más barato) */
  rank: number;
}

export function marketStats(myPriceCents: number, prices: { priceCents: number }[]): MarketStats {
  if (prices.length === 0) return { count: 0, min: 0, max: 0, avg: 0, diffPct: 0, position: "nodata", rank: 1 };
  const values = prices.map((p) => p.priceCents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const diffPct = avg ? ((myPriceCents - avg) / avg) * 100 : 0;
  const rank = values.filter((v) => v < myPriceCents).length + 1;
  let position: MarketPosition;
  if (myPriceCents <= min) position = "cheapest";
  else if (myPriceCents >= max) position = "most_expensive";
  else if (diffPct <= -3) position = "below";
  else if (diffPct >= 3) position = "above";
  else position = "average";
  return { count: values.length, min, max, avg, diffPct, position, rank };
}

export const POSITION_INFO: Record<MarketPosition, { label: string; emoji: string; tone: string }> = {
  nodata: { label: "Sin comparar", emoji: "❔", tone: "bg-slate-100 text-slate-600" },
  cheapest: { label: "Eres el más barato", emoji: "🥇", tone: "bg-emerald-100 text-emerald-800" },
  below: { label: "Más barato que la media", emoji: "👍", tone: "bg-emerald-50 text-emerald-700" },
  average: { label: "En la media", emoji: "⚖️", tone: "bg-sky-50 text-sky-700" },
  above: { label: "Más caro que la media", emoji: "⚠️", tone: "bg-amber-50 text-amber-800" },
  most_expensive: { label: "Eres el más caro", emoji: "🔺", tone: "bg-red-50 text-red-700" },
};

/* ─── Proveedores ─────────────────────────────────────────────────────── */

export interface SupplierOffer {
  id: string;
  supplierId: string;
  supplierName: string;
  priceCents: number;
  minOrder: string | null;
  deliveryDays: number | null;
  observedAt: Date;
}

/** Última oferta de cada proveedor para cada cosa que compro, de más barata a más cara */
export async function latestSupplierOffers(orgId: string, supplyItemId?: string, maxAgeDays = 90) {
  const rows = await db.supplierPrice.findMany({
    where: { orgId, ...(supplyItemId ? { supplyItemId } : {}), observedAt: { gte: new Date(Date.now() - maxAgeDays * 86_400_000) } },
    orderBy: { observedAt: "desc" },
    include: { supplier: { select: { name: true } } },
  });
  const out = new Map<string, SupplierOffer[]>();
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.supplyItemId}:${r.supplierId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = out.get(r.supplyItemId) ?? [];
    list.push({
      id: r.id,
      supplierId: r.supplierId,
      supplierName: r.supplier.name,
      priceCents: r.priceCents,
      minOrder: r.minOrder,
      deliveryDays: r.deliveryDays,
      observedAt: r.observedAt,
    });
    out.set(r.supplyItemId, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.priceCents - b.priceCents);
  return out;
}

export const UNITS: Record<string, string> = {
  unidad: "unidad",
  kg: "kg",
  litro: "litro",
  caja: "caja",
  metro: "metro",
  docena: "docena",
  par: "par",
};

export const MEDALS = ["🥇", "🥈", "🥉"];
