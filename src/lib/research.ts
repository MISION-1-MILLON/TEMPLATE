import "server-only";
import { db } from "./db";
import { asAttributes, formatAttribute } from "./attributes";
import { detectSupplies, researchMarketPrices, researchSupplierPrices, ResearchError } from "./ai-research";
import { startOfToday } from "./time";
import { getSector } from "@/sectors";

/**
 * Orquesta las búsquedas automáticas: aplica el límite diario del plan,
 * guarda los resultados como precios de competidores/proveedores y deja registro.
 */

export const DAILY_LIMIT: Record<string, number> = { free: 5, pro: 40, business: 150 };
/** No se vuelve a buscar lo mismo antes de este tiempo (salvo que se pida a mano) */
export const REFRESH_AFTER_MS = 7 * 86_400_000;

type Org = { id: string; name: string; plan: string; sector: string; address: string | null; taxRateBp: number };

export async function searchesLeftToday(org: { id: string; plan: string }) {
  const used = await db.aiSearch.count({ where: { orgId: org.id, createdAt: { gte: startOfToday() }, kind: { not: "detect" } } });
  return Math.max(0, (DAILY_LIMIT[org.plan] ?? DAILY_LIMIT.free) - used);
}

export class QuotaError extends Error {}

async function log(orgId: string, kind: string, targetId: string | null, fn: () => Promise<number>) {
  try {
    const results = await fn();
    await db.aiSearch.create({ data: { orgId, kind, targetId, ok: true, results } });
    return results;
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 300) : "Error";
    await db.aiSearch.create({ data: { orgId, kind, targetId, ok: false, error: msg } });
    console.error(`[research] ${kind} ${targetId}`, e);
    throw e instanceof ResearchError ? e : new ResearchError("La búsqueda ha fallado, inténtalo más tarde");
  }
}

/** Busca en internet los precios de un producto en la competencia y los guarda. */
export async function refreshProductMarket(org: Org, productId: string) {
  if ((await searchesLeftToday(org)) <= 0) throw new QuotaError("Has llegado al límite de búsquedas de hoy");
  const product = await db.product.findFirst({ where: { id: productId, orgId: org.id } });
  if (!product) throw new ResearchError("Producto no encontrado");
  const sector = getSector(org.sector);
  const attrs = asAttributes(product.attributes);
  const details = sector.productFields
    .map((f) => ({ f, v: formatAttribute(f, attrs[f.key]) }))
    .filter((d) => d.v && d.f.key !== "precio_reventa")
    .map((d) => `${d.f.label}: ${d.v}`)
    .join(", ");

  return log(org.id, "market", product.id, async () => {
    const offers = await researchMarketPrices({
      product: product.name,
      details: [details, product.description].filter(Boolean).join(". "),
      sector: sector.name,
      businessName: org.name,
      location: org.address,
    });
    for (const o of offers) {
      const competitor = await db.competitor.upsert({
        where: { orgId_name: { orgId: org.id, name: o.seller.trim().slice(0, 80) } },
        create: { orgId: org.id, name: o.seller.trim().slice(0, 80), kind: o.kind, url: safeOrigin(o.url) },
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
    return offers.length;
  });
}

/** Busca proveedores y precios para algo que el negocio compra. */
export async function refreshSupplyItem(org: Org, supplyItemId: string) {
  if ((await searchesLeftToday(org)) <= 0) throw new QuotaError("Has llegado al límite de búsquedas de hoy");
  const item = await db.supplyItem.findFirst({ where: { id: supplyItemId, orgId: org.id } });
  if (!item) throw new ResearchError("No encontrado");
  const sector = getSector(org.sector);

  return log(org.id, "supplier", item.id, async () => {
    const offers = await researchSupplierPrices({ item: item.name, unit: item.unit, sector: sector.name, location: org.address });
    for (const o of offers) {
      const name = o.supplier.trim().slice(0, 80);
      const supplier = await db.supplier.upsert({
        where: { orgId_name: { orgId: org.id, name } },
        create: { orgId: org.id, name, website: safeOrigin(o.url), phone: o.phone || null },
        update: {},
      });
      // Guardamos siempre el precio sin IVA para comparar en igualdad
      const net = o.price_includes_vat ? o.price_eur / (1 + org.taxRateBp / 10000) : o.price_eur;
      await db.supplierPrice.create({
        data: {
          orgId: org.id,
          supplierId: supplier.id,
          supplyItemId: item.id,
          priceCents: Math.round(net * 100),
          minOrder: o.min_order || null,
        },
      });
    }
    return offers.length;
  });
}

/** Deduce con IA qué compra el negocio a partir de su catálogo y crea la lista. */
export async function detectAndCreateSupplies(org: Org) {
  const products = await db.product.findMany({ where: { orgId: org.id, active: true }, select: { id: true, name: true }, take: 60 });
  if (products.length === 0) throw new ResearchError("Primero añade productos a tu catálogo");
  const sector = getSector(org.sector);
  return log(org.id, "detect", null, async () => {
    const items = await detectSupplies({ sector: sector.name, products: products.map((p) => p.name) });
    const byName = new Map(products.map((p) => [p.name.toLowerCase(), p.id]));
    let created = 0;
    for (const it of items) {
      const name = it.name.trim().slice(0, 80);
      const exists = await db.supplyItem.findUnique({ where: { orgId_name: { orgId: org.id, name } } });
      if (exists) continue;
      await db.supplyItem.create({
        data: { orgId: org.id, name, unit: it.unit, productId: byName.get(it.product_name.toLowerCase()) ?? null },
      });
      created++;
    }
    return created;
  });
}

/**
 * Actualiza en segundo plano lo que lleve más tiempo sin buscarse.
 * `deadline` = instante (ms) a partir del cual no se empieza ninguna búsqueda nueva.
 */
export async function refreshStale(org: Org, opts: { kind: "market" | "supplier" | "both"; max: number; deadline: number; force?: boolean }) {
  const since = new Date(Date.now() - REFRESH_AFTER_MS);
  const recent = await db.aiSearch.findMany({
    where: { orgId: org.id, ok: true, createdAt: opts.force ? undefined : { gte: since } },
    select: { kind: true, targetId: true },
  });
  const done = new Set(opts.force ? [] : recent.map((r) => `${r.kind}:${r.targetId}`));

  const queue: Array<{ kind: "market" | "supplier"; id: string }> = [];
  if (opts.kind !== "supplier") {
    const products = await db.product.findMany({ where: { orgId: org.id, active: true }, select: { id: true }, orderBy: { updatedAt: "desc" } });
    queue.push(...products.filter((p) => !done.has(`market:${p.id}`)).map((p) => ({ kind: "market" as const, id: p.id })));
  }
  if (opts.kind !== "market") {
    const items = await db.supplyItem.findMany({ where: { orgId: org.id }, select: { id: true } });
    queue.push(...items.filter((i) => !done.has(`supplier:${i.id}`)).map((i) => ({ kind: "supplier" as const, id: i.id })));
  }

  let processed = 0;
  for (const job of queue.slice(0, opts.max)) {
    if (Date.now() > opts.deadline) break;
    try {
      if (job.kind === "market") await refreshProductMarket(org, job.id);
      else await refreshSupplyItem(org, job.id);
      processed++;
    } catch (e) {
      if (e instanceof QuotaError) break;
    }
  }
  return { processed, pending: Math.max(0, queue.length - processed) };
}

/** Última búsqueda correcta por objetivo (para mostrar "actualizado hace…") */
export async function lastSearchedAt(orgId: string, kind: "market" | "supplier") {
  const rows = await db.aiSearch.groupBy({
    by: ["targetId"],
    where: { orgId, kind, ok: true },
    _max: { createdAt: true },
  });
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
