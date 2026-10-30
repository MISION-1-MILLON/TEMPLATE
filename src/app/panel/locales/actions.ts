"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { planIncludes } from "@/lib/modules";

export type LocationState = { error?: string; ok?: boolean } | undefined;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida");
const schema = z.object({
  name: z.string().trim().min(2, "Ponle un nombre al local"),
  address: z.string().trim().max(200).optional(),
  opensAt: hhmm,
  closesAt: hhmm,
});

export async function saveLocation(locationId: string | null, _: LocationState, form: FormData): Promise<LocationState> {
  const { org } = await requirePermission("locations.manage");
  const parsed = schema.safeParse(Object.fromEntries(["name", "address", "opensAt", "closesAt"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = { ...parsed.data, address: parsed.data.address || null };
  if (locationId) {
    const { count } = await db.location.updateMany({ where: { id: locationId, orgId: org.id }, data });
    if (!count) return { error: "Local no encontrado" };
  } else {
    if (!planIncludes(org.plan, "business") && (await db.location.count({ where: { orgId: org.id, active: true } })) >= 1) {
      return { error: "Tener varios locales está incluido en el plan Business. Puedes cambiarlo en Ajustes → Plan." };
    }
    await db.location.create({ data: { ...data, orgId: org.id } });
  }
  revalidatePath("/panel", "layout");
  return { ok: true };
}

/** Cerrar un local lo oculta del panel; su histórico (ventas, caja, stock) se conserva */
export async function setLocationActive(locationId: string, active: boolean) {
  const { org } = await requirePermission("locations.manage");
  if (!active && (await db.location.count({ where: { orgId: org.id, active: true } })) <= 1) return;
  await db.location.updateMany({ where: { id: locationId, orgId: org.id }, data: { active } });
  revalidatePath("/panel", "layout");
}
