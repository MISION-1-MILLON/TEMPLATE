"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { seedSectorData } from "@/lib/onboarding";
import { slugify } from "@/lib/utils";
import { SECTORS } from "@/sectors";

export type SettingsState = { error?: string; ok?: string } | undefined;

export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const { org, role } = await requireSession();
  if (role === "staff") return { error: "Solo el propietario puede cambiar los ajustes" };

  const str = (k: string) => String(form.get(k) ?? "").trim() || null;
  const name = str("name");
  if (!name) return { error: "El nombre del negocio es obligatorio" };

  const slug = slugify(String(form.get("slug") ?? "")) || org.slug;
  if (slug !== org.slug && (await db.organization.findUnique({ where: { slug } }))) {
    return { error: "Esa dirección de tienda ya está en uso" };
  }
  const tax = Number(String(form.get("taxRate") ?? "21").replace(",", "."));
  await db.organization.update({
    where: { id: org.id },
    data: {
      name,
      slug,
      taxId: str("taxId"),
      address: str("address"),
      phone: str("phone"),
      email: str("email"),
      invoicePrefix: (str("invoicePrefix") ?? "F").slice(0, 6),
      taxRateBp: Number.isFinite(tax) ? Math.round(tax * 100) : org.taxRateBp,
    },
  });
  revalidatePath("/panel", "layout");
  return { ok: "Cambios guardados" };
}

/** Cambiar de sector no borra nada: los campos extra viven en JSON y se añaden las categorías del nuevo sector. */
export async function changeSector(form: FormData) {
  const { org, role } = await requireSession();
  const sector = String(form.get("sector") ?? "");
  if (role === "staff" || !(sector in SECTORS)) return;
  await db.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: org.id }, data: { sector } });
    await seedSectorData(tx, org.id, sector, false);
  });
  revalidatePath("/panel", "layout");
}

/** TODO: sustituir por Stripe Checkout + webhook. De momento cambia el plan directamente para poder probar. */
export async function changePlan(form: FormData) {
  const { org, role } = await requireSession();
  const plan = String(form.get("plan") ?? "");
  if (role === "staff" || !["free", "pro", "business"].includes(plan)) return;
  await db.organization.update({ where: { id: org.id }, data: { plan } });
  revalidatePath("/panel", "layout");
}
