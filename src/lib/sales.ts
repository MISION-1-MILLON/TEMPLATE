import { Prisma } from "@prisma/client";
import { db } from "./db";
import { splitTax } from "./money";
import { zonedParts } from "./time";
import { moveStock, stockAt } from "./stock";

export interface SaleInputItem {
  productId: string;
  quantity: number;
  /** Precio unitario con IVA; si no se indica, el del producto */
  unitPriceCents?: number;
}

export interface SaleInput {
  customerId?: string | null;
  paymentMethod: string;
  status: "paid" | "pending";
  notes?: string | null;
  /** Descuento sobre el ticket (IVA incl.) */
  discountCents?: number;
  items: SaleInputItem[];
}

export class SaleError extends Error {}

/**
 * Registra una venta y propaga el dato a todo lo demás:
 * descuenta stock, deja rastro en movimientos de stock y, si está cobrada,
 * apunta la entrada en caja. Todo en una transacción.
 */
export async function createSale(orgId: string, locationId: string, userId: string, input: SaleInput) {
  const items = input.items.filter((i) => i.quantity > 0);
  if (items.length === 0) throw new SaleError("Añade al menos una línea a la venta");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const org = await tx.organization.findUniqueOrThrow({ where: { id: orgId } });
        const products = await tx.product.findMany({
          where: { orgId, id: { in: items.map((i) => i.productId) } },
        });
        const byId = new Map(products.map((p) => [p.id, p]));
        const here = await stockAt(tx, locationId, products.map((p) => p.id));

        let subtotal = 0;
        let tax = 0;
        let total = 0;
        const lines = items.map((i) => {
          const p = byId.get(i.productId);
          if (!p) throw new SaleError("Uno de los productos ya no existe");
          const left = here.get(p.id) ?? 0;
          if (p.trackStock && left < i.quantity) {
            throw new SaleError(`No hay stock suficiente de «${p.name}» en este local (quedan ${left})`);
          }
          const unit = i.unitPriceCents ?? p.priceCents;
          const rate = p.taxRateBp ?? org.taxRateBp;
          const gross = unit * i.quantity;
          const split = splitTax(gross, rate);
          subtotal += split.base;
          tax += split.tax;
          total += gross;
          return { product: p, quantity: i.quantity, unit, rate };
        });

        // Descuento del ticket: se resta del total y la base y el IVA se reparten en proporción
        const discount = Math.max(0, Math.min(input.discountCents ?? 0, total));
        if (discount > 0) {
          const kept = (total - discount) / total;
          subtotal = Math.round(subtotal * kept);
          total -= discount;
          tax = total - subtotal;
        }

        const last = await tx.sale.findFirst({ where: { orgId }, orderBy: { number: "desc" }, select: { number: true } });
        const sale = await tx.sale.create({
          data: {
            orgId,
            number: (last?.number ?? 0) + 1,
            customerId: input.customerId || null,
            createdById: userId,
            locationId,
            discountCents: discount,
            status: input.status,
            paymentMethod: input.paymentMethod,
            notes: input.notes || null,
            subtotalCents: subtotal,
            taxCents: tax,
            totalCents: total,
            items: {
              create: lines.map((l) => ({
                productId: l.product.id,
                name: l.product.name,
                quantity: l.quantity,
                unitPriceCents: l.unit,
                taxRateBp: l.rate,
              })),
            },
          },
        });

        for (const l of lines) {
          if (!l.product.trackStock) continue;
          await moveStock(tx, { orgId, productId: l.product.id, locationId, delta: -l.quantity, reason: "sale", saleId: sale.id, userId });
        }

        if (input.status === "paid") {
          await tx.cashMovement.create({
            data: { orgId, locationId, amountCents: total, method: input.paymentMethod, concept: `Venta nº ${sale.number}`, saleId: sale.id },
          });
        }
        return sale;
      });
    } catch (e) {
      // Dos ventas simultáneas pueden pedir el mismo número: reintentar
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new SaleError("No se pudo registrar la venta, inténtalo de nuevo");
}

export async function markSalePaid(orgId: string, saleId: string, method: string) {
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id: saleId, orgId } });
    if (!sale || sale.status !== "pending") throw new SaleError("La venta no está pendiente de cobro");
    await tx.sale.update({ where: { id: sale.id }, data: { status: "paid", paymentMethod: method } });
    await tx.cashMovement.create({
      data: { orgId, locationId: sale.locationId, amountCents: sale.totalCents, method, concept: `Cobro venta nº ${sale.number}`, saleId: sale.id },
    });
  });
}

/** Anula una venta: devuelve el stock y, si estaba cobrada, registra la salida de caja. */
export async function cancelSale(orgId: string, saleId: string) {
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id: saleId, orgId }, include: { items: { include: { product: true } } } });
    if (!sale || sale.status === "cancelled") throw new SaleError("La venta ya está anulada");

    for (const item of sale.items) {
      if (!item.product?.trackStock || !sale.locationId) continue;
      await moveStock(tx, { orgId, productId: item.product.id, locationId: sale.locationId, delta: item.quantity, reason: "cancel", saleId: sale.id });
    }
    if (sale.status === "paid") {
      await tx.cashMovement.create({
        data: { orgId, locationId: sale.locationId, amountCents: -sale.totalCents, method: sale.paymentMethod, concept: `Anulación venta nº ${sale.number}`, saleId: sale.id },
      });
    }
    await tx.sale.update({ where: { id: sale.id }, data: { status: "cancelled" } });
  });
}

export function invoiceNumber(prefix: string, number: number, date: Date) {
  return `${prefix}${zonedParts(date).year}-${String(number).padStart(5, "0")}`;
}
