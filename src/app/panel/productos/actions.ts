"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { aiEnabled } from "@/lib/ai-research";
import { refreshProductMarket } from "@/lib/research";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { readAttributes } from "@/lib/attributes";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { planIncludes } from "@/lib/modules";

export type ProductFormState = { error?: string } | undefined;

const FREE_PRODUCT_LIMIT = 50;

export async function saveProduct(productId: string | null, _: ProductFormState, form: FormData): Promise<ProductFormState> {
  const { org, sector } = await requireSession();

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
    costCents: parseMoney(form.get("cost")),
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
      const p = await tx.product.create({ data: { ...data, orgId: org.id, stock: initialStock } });
      if (initialStock > 0) {
        await tx.stockMovement.create({ data: { orgId: org.id, productId: p.id, delta: initialStock, reason: "purchase" } });
      }
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

export async function adjustStock(productId: string, form: FormData) {
  const { org } = await requireSession();
  const delta = Math.trunc(Number(form.get("delta") ?? 0));
  const reason = form.get("reason") === "purchase" ? "purchase" : "adjust";
  if (!delta) return;
  await db.$transaction(async (tx) => {
    const p = await tx.product.findFirst({ where: { id: productId, orgId: org.id } });
    if (!p) return;
    await tx.product.update({ where: { id: p.id }, data: { stock: { increment: delta } } });
    await tx.stockMovement.create({ data: { orgId: org.id, productId: p.id, delta, reason } });
  });
  revalidatePath(`/panel/productos/${productId}`);
}

/** Baja lógica: se conserva para el histórico de ventas y facturas */
export async function archiveProduct(productId: string) {
  const { org } = await requireSession();
  await db.product.updateMany({ where: { id: productId, orgId: org.id }, data: { active: false, published: false } });
  revalidatePath("/panel/productos");
  redirect("/panel/productos");
}
