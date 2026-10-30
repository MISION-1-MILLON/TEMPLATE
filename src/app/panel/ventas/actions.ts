"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireLocation, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { saleReward, type SaleReward } from "@/lib/game";
import { cancelSale, createSale, markSalePaid, SaleError } from "@/lib/sales";
import { saleScope } from "@/lib/sales-filter";
import { PAYMENT_METHODS } from "@/lib/utils";

const saleSchema = z.object({
  customerId: z.string().nullable(),
  newCustomerName: z.string().trim().optional(),
  paymentMethod: z.string().refine((m) => m in PAYMENT_METHODS),
  status: z.enum(["paid", "pending"]),
  notes: z.string().optional(),
  discountCents: z.number().int().nonnegative().optional(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive(), unitPriceCents: z.number().int().nonnegative() })).min(1),
});

export type NewSaleInput = z.infer<typeof saleSchema>;

export type SaleResult = { error: string } | { ok: true; saleId: string; number: number; totalCents: number; reward: SaleReward | null };

/** Registra la venta y devuelve su número: el TPV se queda listo para la siguiente */
export async function submitSale(input: NewSaleInput): Promise<SaleResult> {
  const { org, user, location, can } = await requireLocation();
  if (!can("sales.create")) return { error: "Tu perfil no puede vender." };
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { error: "Revisa los datos de la venta" };
  // Sin permiso de descuento, se cobra siempre el precio del producto y sin descuento
  const discounts = can("sales.discount");
  const items = parsed.data.items.map((i) => (discounts ? i : { productId: i.productId, quantity: i.quantity }));

  let customerId = parsed.data.customerId;
  if (customerId) {
    const owned = await db.customer.findFirst({ where: { id: customerId, orgId: org.id }, select: { id: true } });
    if (!owned) customerId = null;
  } else if (parsed.data.newCustomerName) {
    customerId = (await db.customer.create({ data: { orgId: org.id, name: parsed.data.newCustomerName, attributes: {} } })).id;
  }

  try {
    const sale = await createSale(org.id, location.id, user.id, { ...parsed.data, items, discountCents: discounts ? parsed.data.discountCents : 0, customerId });
    revalidatePath("/panel");
    // El progreso del negocio solo lo ve quien lo lleva
    const reward = can("stats.view") ? await saleReward(org, sale.totalCents) : null;
    return { ok: true, saleId: sale.id, number: sale.number, totalCents: sale.totalCents, reward };
  } catch (e) {
    if (e instanceof SaleError) return { error: e.message };
    throw e;
  }
}

export async function paySaleAction(saleId: string, form: FormData) {
  const session = await requirePermission("cash.manage");
  const { org } = session;
  if (!(await db.sale.findFirst({ where: { id: saleId, ...saleScope(session) }, select: { id: true } }))) return;
  const method = String(form.get("method") ?? "card");
  await markSalePaid(org.id, saleId, method in PAYMENT_METHODS ? method : "other");
  revalidatePath(`/panel/ventas/${saleId}`);
}

export async function cancelSaleAction(saleId: string) {
  const session = await requirePermission("sales.cancel");
  const { org } = session;
  if (!(await db.sale.findFirst({ where: { id: saleId, ...saleScope(session) }, select: { id: true } }))) return;
  await cancelSale(org.id, saleId);
  revalidatePath(`/panel/ventas/${saleId}`);
  revalidatePath("/panel");
}
