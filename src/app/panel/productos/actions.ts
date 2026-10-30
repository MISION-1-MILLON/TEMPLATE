"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { aiEnabled } from "@/lib/ai-research";
import { refreshProductMarket } from "@/lib/research";
import { redirect } from "next/navigation";
import { requireLocation, requirePermission } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";
import { moveStock, type StockReason } from "@/lib/stock";
import { readAttributes } from "@/lib/attributes";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { planIncludes } from "@/lib/modules";

export type ProductFormState = { error?: string } | undefined;

const FREE_PRODUCT_LIMIT = 50;

export async function saveProduct(productId: string | null, _: ProductFormState, form: FormData): Promise<ProductFormState> {
  const { org, sector, location, can } = await requireLocation();
  if (!can("products.manage")) throw new PermissionError();

  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio" };

  if (!productId && !planIncludes(org.plan, "pro")) {
    const count = await db.product.count({ where: { orgId: org.id, active: true } });
    if (count >= FREE_PRODUCT_LIMIT) {
      return { error: `El plan Gratis permite hasta ${FREE_PRODUCT_LIMIT} productos. Mejora a Pro para tener ilimitados.` };
    }
  }

  // Categoría: existente o nueva escrita a mano
  let categoryId = String(form.get("categoryId") ?? "") || null;
  const newCategory = String(form.get("newCategory") ?? "").trim();
  if (newCategory) {
    const c = await db.category.upsert({
      where: { orgId_name: { orgId: org.id, name: newCategory } },
      create: { orgId: org.id, name: newCategory },
      update: {},
    });
    categoryId = c.id;
  } else if (categoryId) {
    const owned = await db.category.findFirst({ where: { id: categoryId, orgId: org.id } });
    if (!owned) categoryId = null;
  }

  const taxRaw = String(form.get("taxRate") ?? "").trim();
  const data = {
    name,
    sku: String(form.get("sku") ?? "").trim() || null,
    description: String(form.get("description") ?? "").trim() || null,
    imageUrl: String(form.get("imageUrl") ?? "").trim() || null,
    priceCents: parseMoney(form.get("price")),
    // Quien no ve el beneficio no ve el coste: no se le pisa
    ...(can("finance.profit") ? { costCents: parseMoney(form.get("cost")) } : {}),
    taxRateBp: taxRaw === "" ? null : Math.round(Number(taxRaw.replace(",", ".")) * 100),
    trackStock: form.get("trackStock") === "on",
    lowStockAt: Number(form.get("lowStockAt") ?? 0) || 0,
    published: form.get("published") === "on",
    categoryId,
    attributes: readAttributes(form, sector.productFields) as Prisma.InputJsonValue,
  };

  if (productId) {
    const existing = await db.product.findFirst({ where: { id: productId, orgId: org.id } });
    if (!existing) return { error: "Producto no encontrado" };
    await db.product.update({ where: { id: productId }, data });
  } else {
    const initialStock = Math.max(0, Number(form.get("stock") ?? 0) || 0);
    const created = await db.$transaction(async (tx) => {
      const p = await tx.product.create({ data: { ...data, orgId: org.id } });
      // Las existencias iniciales entran en el local activo
      if (initialStock > 0) await moveStock(tx, { orgId: org.id, productId: p.id, locationId: location.id, delta: initialStock, reason: "purchase" });
      return p;
    });
    // Nada más darlo de alta, buscamos en internet a cuánto lo vende la competencia
    if (aiEnabled()) {
      after(() => refreshProductMarket(org, created.id, { central: true }).then(() => undefined, () => undefined));
    }
  }

  revalidatePath("/panel/productos");
  redirect("/panel/productos");
}

const STOCK_REASONS: StockReason[] = ["purchase", "count", "waste", "adjust"];

/**
 * Apunta un movimiento de stock en el local activo: una entrada (suma), una
 * merma (resta) o un recuento (`amount` es lo contado y se apunta la diferencia).
 */
export async function adjustStock(productId: string, form: FormData) {
  const { org, user, location, can } = await requireLocation();
  if (!can("stock.adjust")) throw new PermissionError();
  const raw = String(form.get("reason") ?? "purchase");
  const reason = (STOCK_REASONS as string[]).includes(raw) ? (raw as StockReason) : "adjust";
  const amount = Math.trunc(Number(String(form.get("amount") ?? "").replace(",", ".")));
  if (!Number.isFinite(amount)) return;
  await db.$transaction(async (tx) => {
    const p = await tx.product.findFirst({ where: { id: productId, orgId: org.id } });
    if (!p) return;
    let delta = amount;
    if (reason === "count") {
      const here = await tx.productStock.findUnique({ where: { productId_locationId: { productId: p.id, locationId: location.id } } });
      delta = Math.max(0, amount) - (here?.quantity ?? 0);
    }
    if (reason === "waste") delta = -Math.abs(amount);
    if (reason === "purchase") delta = Math.abs(amount);
    if (!delta) return;
    await moveStock(tx, { orgId: org.id, productId: p.id, locationId: location.id, delta, reason, userId: user.id });
  });
  revalidatePath(`/panel/productos/${productId}`);
  revalidatePath("/panel/productos");
}

/** Baja lógica: se conserva para el histórico de ventas y facturas */
export async function archiveProduct(productId: string) {
  const { org } = await requirePermission("products.manage");
  await db.product.updateMany({ where: { id: productId, orgId: org.id }, data: { active: false, published: false } });
  revalidatePath("/panel/productos");
  redirect("/panel/productos");
}
