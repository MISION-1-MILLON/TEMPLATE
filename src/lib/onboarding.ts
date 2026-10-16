import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { slugify } from "./utils";
import { getSector } from "@/sectors";

async function uniqueSlug(base: string) {
  const root = slugify(base) || "negocio";
  let slug = root;
  for (let i = 2; await db.organization.findUnique({ where: { slug } }); i++) slug = `${root}-${i}`;
  return slug;
}

/**
 * Crea usuario + negocio + categorías del sector. Si `withDemo`, añade
 * productos de ejemplo para que el panel no arranque vacío.
 */
export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
  businessName: string;
  sector: string;
  withDemo?: boolean;
}) {
  const sector = getSector(input.sector);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const slug = await uniqueSlug(input.businessName);

  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: input.name, email: input.email.toLowerCase(), passwordHash },
    });
    const org = await tx.organization.create({
      data: {
        name: input.businessName,
        slug,
        sector: sector.id,
        taxRateBp: sector.id === "restauracion" ? 1000 : 2100,
        memberships: { create: { userId: user.id, role: "owner" } },
      },
    });
    await seedSectorData(tx, org.id, sector.id, input.withDemo ?? false);
    return { user, org };
  });
}

export async function seedSectorData(tx: Prisma.TransactionClient, orgId: string, sectorId: string, withDemo: boolean) {
  const sector = getSector(sectorId);
  const categories = new Map<string, string>();
  for (const name of sector.defaultCategories) {
    const c = await tx.category.upsert({
      where: { orgId_name: { orgId, name } },
      create: { orgId, name },
      update: {},
    });
    categories.set(name, c.id);
  }
  if (!withDemo) return;
  for (const p of sector.demoProducts) {
    const product = await tx.product.create({
      data: {
        orgId,
        name: p.name,
        categoryId: categories.get(p.category) ?? null,
        priceCents: Math.round(p.price * 100),
        costCents: Math.round(p.cost * 100),
        stock: p.stock,
        trackStock: sector.trackStockByDefault,
        attributes: p.attributes as Prisma.InputJsonValue,
        isDemo: true,
      },
    });
    if (p.stock > 0 && sector.trackStockByDefault) {
      await tx.stockMovement.create({ data: { orgId, productId: product.id, delta: p.stock, reason: "purchase" } });
    }
  }
}
