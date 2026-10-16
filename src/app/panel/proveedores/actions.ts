"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { aiEnabled } from "@/lib/ai-research";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { latestSupplierOffers } from "@/lib/market";
import { detectAndCreateSupplies, refreshStale, refreshSupplyItem, searchesLeftToday } from "@/lib/research";

export type SearchResult = { ok?: string; error?: string };
const OFF = "La búsqueda automática aún no está activada en este servidor.";

/** La IA deduce qué compra el negocio y después busca proveedores en segundo plano */
export async function detectSuppliesAction(): Promise<SearchResult> {
  const { org } = await requireSession();
  if (!aiEnabled()) return { error: OFF };
  try {
    const created = await detectAndCreateSupplies(org);
    // La primera búsqueda de proveedores la paga la matriz
    const started = Date.now();
    after(() => refreshStale(org, { kind: "supplier", max: 20, deadline: started + 240_000, central: true, concurrency: 3 }).then(() => undefined));
    revalidatePath("/panel/proveedores");
    return { ok: created ? `He detectado ${created} cosas que compras. Ahora busco proveedores en segundo plano: vuelve en unos minutos.` : "Ya tenía todo lo que compras en la lista." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se ha podido completar" };
  }
}

export async function searchSupplyItem(itemId: string): Promise<SearchResult> {
  const { org } = await requireSession();
  if (!aiEnabled()) return { error: OFF };
  try {
    const n = await refreshSupplyItem(org, itemId, { maxAgeDays: 7 });
    revalidatePath("/panel/proveedores");
    return { ok: n ? `¡Listo! ${n} ${n === 1 ? "proveedor encontrado" : "proveedores encontrados"}.` : "No he encontrado proveedores con precio público para esto." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "La búsqueda ha fallado" };
  }
}

export async function searchAllSupplies(): Promise<SearchResult> {
  const { org } = await requireSession();
  if (!aiEnabled()) return { error: OFF };
  const left = await searchesLeftToday(org);
  if (left <= 0) return { error: "Has llegado al límite de búsquedas de hoy. Mañana seguimos." };
  const started = Date.now();
  after(() => refreshStale(org, { kind: "supplier", max: Math.min(left, 12), deadline: started + 240_000, concurrency: 3 }).then(() => undefined));
  return { ok: "Buscando proveedores en segundo plano. Vuelve en unos minutos." };
}

/** Elegir proveedor. Si es algo que se revende tal cual, su precio pasa a ser el coste del producto. */
export async function chooseSupplier(itemId: string, supplierId: string) {
  const { org } = await requireSession();
  const item = await db.supplyItem.findFirst({ where: { id: itemId, orgId: org.id } });
  const supplier = await db.supplier.findFirst({ where: { id: supplierId, orgId: org.id } });
  if (!item || !supplier) return;
  await db.supplyItem.update({ where: { id: item.id }, data: { currentSupplierId: supplier.id } });
  if (item.productId && ["unidad", "par"].includes(item.unit)) {
    const offer = (await latestSupplierOffers(org.id, item.id)).get(item.id)?.find((o) => o.supplierId === supplier.id);
    if (offer) await db.product.updateMany({ where: { id: item.productId, orgId: org.id }, data: { costCents: offer.priceCents } });
  }
  revalidatePath("/panel/proveedores");
}

export async function addSupplyItem(form: FormData) {
  const { org } = await requireSession();
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const unit = String(form.get("unit") ?? "unidad");
  if (!name) return;
  const item = await db.supplyItem.upsert({
    where: { orgId_name: { orgId: org.id, name } },
    create: { orgId: org.id, name, unit },
    update: {},
  });
  if (aiEnabled()) {
    after(() => refreshSupplyItem(org, item.id, { central: true }).then(() => undefined, () => undefined));
  }
  revalidatePath("/panel/proveedores");
}

export async function deleteSupplyItem(id: string) {
  const { org } = await requireSession();
  await db.supplyItem.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/panel/proveedores");
}

export async function deleteSupplier(id: string) {
  const { org } = await requireSession();
  await db.supplier.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/panel/proveedores");
}
