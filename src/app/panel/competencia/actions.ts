"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireSession } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai-research";
import { db } from "@/lib/db";
import { QuotaError, refreshProductMarket, refreshStale, searchesLeftToday } from "@/lib/research";

export type SearchResult = { ok?: string; error?: string };

/** Buscar ahora en internet los precios de un producto */
export async function searchProduct(productId: string): Promise<SearchResult> {
  const { org } = await requireSession();
  if (!aiEnabled()) return { error: "La búsqueda automática aún no está activada en este servidor." };
  try {
    // A mano: vale la caché si es de esta semana (gratis); si no, se busca de nuevo
    const n = await refreshProductMarket(org, productId, { maxAgeDays: 7 });
    revalidatePath("/panel/competencia");
    revalidatePath(`/panel/competencia/${productId}`);
    return { ok: n ? `¡Listo! He encontrado ${n} ${n === 1 ? "precio" : "precios"} en internet.` : "No he encontrado este producto a la venta en internet." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "La búsqueda ha fallado" };
  }
}

/** Buscar todo lo pendiente en segundo plano */
export async function searchAllProducts(): Promise<SearchResult> {
  const { org } = await requireSession();
  if (!aiEnabled()) return { error: "La búsqueda automática aún no está activada en este servidor." };
  const left = await searchesLeftToday(org);
  if (left <= 0) return { error: new QuotaError("Has llegado al límite de búsquedas de hoy. Mañana seguimos.").message };
  const started = Date.now();
  after(async () => {
    await refreshStale(org, { kind: "market", max: Math.min(left, 12), deadline: started + 240_000, concurrency: 3 });
  });
  return { ok: "Buscando en internet en segundo plano. Vuelve en unos minutos y verás los precios." };
}

export async function deleteCompetitorPrice(id: string) {
  const { org } = await requireSession();
  const row = await db.competitorPrice.findFirst({ where: { id, orgId: org.id } });
  if (!row) return;
  await db.competitorPrice.delete({ where: { id } });
  revalidatePath("/panel/competencia");
  revalidatePath(`/panel/competencia/${row.productId}`);
}

/** Quitar un competidor que no tiene nada que ver (y sus precios) */
export async function deleteCompetitor(id: string) {
  const { org } = await requireSession();
  await db.competitor.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/panel/competencia");
}

/** Cambiar mi precio desde la comparativa (igualar al más barato, a la media…) */
export async function setMyPrice(productId: string, form: FormData) {
  const { org } = await requireSession();
  const priceCents = Number(form.get("priceCents"));
  if (!Number.isInteger(priceCents) || priceCents <= 0) return;
  await db.product.updateMany({ where: { id: productId, orgId: org.id }, data: { priceCents } });
  revalidatePath("/panel/competencia");
  revalidatePath(`/panel/competencia/${productId}`);
  revalidatePath("/panel/productos");
}
