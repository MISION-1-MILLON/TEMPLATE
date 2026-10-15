"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function toggleStore() {
  const { org } = await requireSession();
  await db.organization.update({ where: { id: org.id }, data: { storeEnabled: !org.storeEnabled } });
  revalidatePath("/panel/tienda");
  revalidatePath(`/t/${org.slug}`);
}

export async function toggleProductPublished(productId: string) {
  const { org } = await requireSession();
  const p = await db.product.findFirst({ where: { id: productId, orgId: org.id } });
  if (!p) return;
  await db.product.update({ where: { id: p.id }, data: { published: !p.published } });
  revalidatePath("/panel/tienda");
  revalidatePath(`/t/${org.slug}`);
}
