import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { asAttributes, formatAttribute } from "./attributes";
import {
  detectSupplies,
  researchMarketPrices,
  researchSupplierPrices,
  ResearchError,
  type MarketOffer,
  type SupplierOfferResult,
} from "./ai-research";
import { startOfToday } from "./time";
import { getSector } from "@/sectors";

/**
 * Orquesta las búsquedas automáticas de precios.
 *
 * - La "matriz" (revisión mensual, alta de productos, detección inicial) busca
 *   gratis para el cliente: no gasta su cupo diario.
 * - "Buscar ahora" (a mano) sí gasta cupo, salvo que el resultado ya esté en la caché.
 * - Caché compartida (PriceLookup): la misma búsqueda sirve para todos los negocios
 *   durante CACHE_DAYS, así el coste no crece con el número de clientes.
 */

/** Búsquedas manuales extra al día, según plan */
export const DAILY_LIMIT: Record<string, number> = { free: 5, pro: 40, business: 150 };
/** Cada cuánto revisa la matriz cada producto / cosa que se compra */
export const REFRESH_DAYS = 30;
/** Cuánto vale un resultado de la caché compartida */
export const CACHE_DAYS = 30;
/** En sectores de producto local (restauración) el precio depende de la zona */
const LOCAL_SECTORS = new Set(["restauracion"]);

type Org = { id: string; name: string; plan: string; sector: string; address: string | null; taxRateBp: number };
/** central: búsqueda de la matriz (no gasta cupo) · maxAgeDays: antigüedad máxima aceptada de la caché */
type Mode = { central?: boolean; force?: boolean; maxAgeDays?: number };

export async function searchesLeftToday(org: { id: string; plan: string }) {
  const used = await db.aiSearch.count({
    where: { orgId: org.id, createdAt: { gte: startOfToday() }, kind: { not: "detect" }, central: false, cached: false },
  });
  return Math.max(0, (DAILY_LIMIT[org.plan] ?? DAILY_LIMIT.free) - used);
}

export class QuotaError extends Error {}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Busca en la caché compartida o, si no hay nada reciente, en internet */
async function lookup<T>(kind: "market" | "supplier", key: string, query: string, mode: Mode, search: () => Promise<T[]>) {
  if (!mode.force) {
    const hit = await db.priceLookup.findUnique({ where: { kind_queryKey: { kind, queryKey: key } } });
    if (hit && hit.searchedAt.getTime() > Date.now() - (mode.maxAgeDays ?? CACHE_DAYS) * 86_400_000) {
      return { offers: hit.results as unknown as T[], cached: true };
    }
  }
  const offers = await search();
  await db.priceLookup.upsert({
    where: { kind_queryKey: { kind, queryKey: key } },
    create: { kind, queryKey: key, query, results: offers as unknown as Prisma.InputJsonValue },
    update: { query, results: offers as unknown as Prisma.InputJsonValue, searchedAt: new Date() },
  });
  return { offers, cached: false };
}

async function logged(orgId: string, kind: string, targetId: string | null, mode: Mode, fn: () => Promise<{ count: number; cached: boolean }>) {
  try {
    const { count, cached } = await fn();
    await db.aiSearch.create({ data: { orgId, kind, targetId, ok: true, results: count, central: Boolean(mode.central), cached } });
    return count;
  } catch (e) {
    if (e instanceof QuotaError) throw e; // no se ha buscado nada: no se registra
    const msg = e instanceof Error ? e.message.slice(0, 300) : "Error";
    await db.aiSearch.create({ data: { orgId, kind, targetId, ok: false, error: msg, central: Boolean(mode.central) } });
    console.error(`[research] ${kind} ${targetId}`, e);
    throw e instanceof ResearchError ? e : new ResearchError("La búsqueda ha fallado, inténtalo más tarde");
  }
}

/* ─── Competencia ─────────────────────────────────────────────────────── */

export async function refreshProductMarket(org: Org, productId: string, mode: Mode = {}) {
  const product = await db.product.findFirst({ where: { id: productId, orgId: org.id } });
  if (!product) throw new ResearchError("Producto no encontrado");
  const sector = getSector(org.sector);
  const attrs = asAttributes(product.attributes);
  // La talla no cambia el precio de mercado: no se usa para buscar ni para la caché
  const details = sector.productFields
    .filter((f) => !["precio_reventa", "talla", "estado"].includes(f.key))
    .map((f) => ({ f, v: formatAttribute(f, attrs[f.key]) }))
    .filter((d) => d.v)
    .map((d) => `${d.f.label}: ${d.v}`)
    .join(", ");
  const local = LOCAL_SECTORS.has(sector.id) ? (org.address ?? "") : "";
  const key = normalize([sector.id, product.name, details, local].join(" | "));

  return logged(org.id, "market", product.id, mode, async () => {
    const { offers, cached } = await lookup<MarketOffer>("market", key, `${product.name} ${details}`.trim(), mode, async () => {
      if (!mode.central && (await searchesLeftToday(org)) <= 0) throw new QuotaError("Has llegado al límite de búsquedas de hoy");
      return researchMarketPrices({
        product: product.name,
        details: [details, product.description].filter(Boolean).join(". "),
        sector: sector.name,
        businessName: org.name,
        location: org.address,
      });
    });

    // No compararse con uno mismo si la tienda aparece en los resultados compartidos
    const mine = normalize(org.name);
    for (const o of offers.filter((x) => normalize(x.seller) !== mine)) {
      const name = o.seller.trim().slice(0, 80);
      const competitor = await db.competitor.upsert({
        where: { orgId_name: { orgId: org.id, name } },
        create: { orgId: org.id, name, kind: o.kind, url: safeOrigin(o.url) },
        update: {},
      });
      await db.competitorPrice.create({
        data: {
          orgId: org.id,
          competitorId: competitor.id,
          productId: product.id,
          priceCents: Math.round(o.price_eur * 100),
          url: safeUrl(o.url),
          note: o.product_title.slice(0, 200),
        },
      });
    }
    return { count: offers.length, cached };
  });
}

/* ─── Proveedores ─────────────────────────────────────────────────────── */

export async function refreshSupplyItem(org: Org, supplyItemId: string, mode: Mode = {}) {
  const item = await db.supplyItem.findFirst({ where: { id: supplyItemId, orgId: org.id } });
  if (!item) throw new ResearchError("No encontrado");
  const sector = getSector(org.sector);
  const key = normalize(`${item.name} | ${item.unit}`);

  return logged(org.id, "supplier", item.id, mode, async () => {
    const { offers, cached } = await lookup<SupplierOfferResult>("supplier", key, `${item.name} (${item.unit})`, mode, async () => {
      if (!mode.central && (await searchesLeftToday(org)) <= 0) throw new QuotaError("Has llegado al límite de búsquedas de hoy");
      return researchSupplierPrices({ item: item.name, unit: item.unit, sector: sector.name, location: org.address });
    });

    for (const o of offers) {
      const name = o.supplier.trim().slice(0, 80);
      const supplier = await db.supplier.upsert({
        where: { orgId_name: { orgId: org.id, name } },
        create: { orgId: org.id, name, website: safeOrigin(o.url), phone: o.phone || null },
        update: {},
      });
      // Siempre sin IVA, para comparar en igualdad
      const net = o.price_includes_vat ? o.price_eur / (1 + org.taxRateBp / 10000) : o.price_eur;
      await db.supplierPrice.create({
        data: { orgId: org.id, supplierId: supplier.id, supplyItemId: item.id, priceCents: Math.round(net * 100), minOrder: o.min_order || null },
      });
    }
    return { count: offers.length, cached };
  });
}

/** Deduce con IA qué compra el negocio a partir de su catálogo y crea la lista. */
export async function detectAndCreateSupplies(org: Org) {
  const products = await db.product.findMany({ where: { orgId: org.id, active: true }, select: { id: true, name: true }, take: 60 });
  if (products.length === 0) throw new ResearchError("Primero añade productos a tu catálogo");
  const sector = getSector(org.sector);
  return logged(org.id, "detect", null, { central: true }, async () => {
    const items = await detectSupplies({ sector: sector.name, products: products.map((p) => p.name) });
    const byName = new Map(products.map((p) => [p.name.toLowerCase(), p.id]));
    let created = 0;
    for (const it of items) {
      const name = it.name.trim().slice(0, 80);
      const exists = await db.supplyItem.findUnique({ where: { orgId_name: { orgId: org.id, name } } });
      if (exists) continue;
      await db.supplyItem.create({ data: { orgId: org.id, name, unit: it.unit, productId: byName.get(it.product_name.toLowerCase()) ?? null } });
      created++;
    }
    return { count: created, cached: false };
  });
}

/* ─── Revisión de la matriz ───────────────────────────────────────────── */

/**
 * Revisa lo que lleve más de REFRESH_DAYS sin buscarse. Con `central` no gasta el
 * cupo del cliente. Hace varias búsquedas a la vez y se detiene en `deadline`.
 */
export async function refreshStale(
  org: Org,
  opts: { kind: "market" | "supplier" | "both"; max: number; deadline: number; central?: boolean; concurrency?: number },
) {
  const since = new Date(Date.now() - REFRESH_DAYS * 86_400_000);
  const recent = await db.aiSearch.findMany({ where: { orgId: org.id, ok: true, createdAt: { gte: since } }, select: { kind: true, targetId: true } });
  const done = new Set(recent.map((r) => `${r.kind}:${r.targetId}`));

  const queue: Array<{ kind: "market" | "supplier"; id: string }> = [];
  if (opts.kind !== "supplier") {
    const products = await db.product.findMany({ where: { orgId: org.id, active: true }, select: { id: true }, orderBy: { updatedAt: "desc" } });
    queue.push(...products.filter((p) => !done.has(`market:${p.id}`)).map((p) => ({ kind: "market" as const, id: p.id })));
  }
  if (opts.kind !== "market") {
    const items = await db.supplyItem.findMany({ where: { orgId: org.id }, select: { id: true } });
    queue.push(...items.filter((i) => !done.has(`supplier:${i.id}`)).map((i) => ({ kind: "supplier" as const, id: i.id })));
  }

  const jobs = queue.slice(0, opts.max);
  let processed = 0;
  let stop = false;
  const worker = async () => {
    while (!stop && jobs.length && Date.now() < opts.deadline) {
      const job = jobs.shift()!;
      try {
        if (job.kind === "market") await refreshProductMarket(org, job.id, { central: opts.central });
        else await refreshSupplyItem(org, job.id, { central: opts.central });
        processed++;
      } catch (e) {
        if (e instanceof QuotaError) stop = true;
      }
    }
  };
  await Promise.all(Array.from({ length: opts.concurrency ?? 1 }, worker));
  return { processed, pending: Math.max(0, queue.length - processed) };
}

/** Última búsqueda correcta por objetivo (para mostrar "buscado el…") */
export async function lastSearchedAt(orgId: string, kind: "market" | "supplier") {
  const rows = await db.aiSearch.groupBy({ by: ["targetId"], where: { orgId, kind, ok: true }, _max: { createdAt: true } });
  return new Map(rows.map((r) => [r.targetId ?? "", r._max.createdAt]));
}

function safeUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}
function safeOrigin(u: string) {
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
}
