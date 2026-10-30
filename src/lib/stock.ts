import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export type StockReason = "sale" | "cancel" | "adjust" | "purchase" | "count" | "waste" | "transfer";

/**
 * Mueve el stock de un producto en un local y deja rastro. Mantiene a la vez
 * `ProductStock` (por local) y `Product.stock` (total), dentro de la misma transacción.
 */
export async function moveStock(
  tx: Tx,
  m: { orgId: string; productId: string; locationId: string; delta: number; reason: StockReason; saleId?: string; userId?: string },
) {
  if (m.delta === 0) return;
  await tx.productStock.upsert({
    where: { productId_locationId: { productId: m.productId, locationId: m.locationId } },
    create: { productId: m.productId, locationId: m.locationId, quantity: m.delta },
    update: { quantity: { increment: m.delta } },
  });
  await tx.product.update({ where: { id: m.productId }, data: { stock: { increment: m.delta } } });
  await tx.stockMovement.create({
    data: { orgId: m.orgId, productId: m.productId, locationId: m.locationId, delta: m.delta, reason: m.reason, saleId: m.saleId ?? null, createdById: m.userId ?? null },
  });
}

/** Existencias de varios productos en un local */
export async function stockAt(tx: Tx, locationId: string, productIds: string[]) {
  const rows = await tx.productStock.findMany({ where: { locationId, productId: { in: productIds } } });
  return new Map(rows.map((r) => [r.productId, r.quantity]));
}
