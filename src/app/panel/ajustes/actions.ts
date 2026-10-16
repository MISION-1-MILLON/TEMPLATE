"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { billingEnabled, createCheckoutUrl, createPortalUrl, setCancelAtPeriodEnd, switchSubscriptionPlan, type PaidPlan } from "@/lib/billing";
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

/** Participación en la bolsa común de productos */
export async function savePoolSettings(form: FormData) {
  const { org, role } = await requireSession();
  if (role === "staff") return;
  await db.organization.update({
    where: { id: org.id },
    data: { poolShare: form.get("poolShare") === "on", poolPublic: form.get("poolPublic") === "on" },
  });
  revalidatePath("/panel", "layout");
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

/** Vuelve a Ajustes con el motivo que da Stripe (solo lo ve el dueño del negocio) */
function errorUrl(e: unknown) {
  const detail = e instanceof Error ? e.message.slice(0, 300) : "";
  return `/panel/ajustes?pago=error${detail ? `&detalle=${encodeURIComponent(detail)}` : ""}#plan`;
}

async function origin() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/**
 * Cambio de plan.
 * - Con Stripe: contratar abre el pago de Stripe; cambiar entre Pro y Business
 *   actualiza la suscripción; pasar a Gratis la cancela al final del periodo.
 * - Sin Stripe (solo en desarrollo): cambia el plan directamente para poder probar.
 */
export async function changePlan(form: FormData) {
  const { org, role, user } = await requireSession();
  const plan = String(form.get("plan") ?? "");
  if (role === "staff" || !["free", "pro", "business"].includes(plan)) return;

  if (!billingEnabled()) {
    if (process.env.NODE_ENV === "production") redirect("/panel/ajustes?pago=no-configurado#plan");
    await db.organization.update({ where: { id: org.id }, data: { plan } });
    revalidatePath("/panel", "layout");
    return;
  }

  const hasSubscription = Boolean(org.stripeSubscriptionId) && org.subscriptionStatus !== "canceled";
  let target: string | null = null;
  try {
    if (plan === "free") {
      if (hasSubscription) await setCancelAtPeriodEnd(org.stripeSubscriptionId!, true);
    } else if (hasSubscription) {
      await switchSubscriptionPlan(org.stripeSubscriptionId!, plan as PaidPlan);
    } else {
      target = await createCheckoutUrl(org, user.email, plan as PaidPlan, await origin());
    }
  } catch (e) {
    console.error("[stripe] changePlan", e);
    target = errorUrl(e);
  }
  revalidatePath("/panel", "layout");
  if (target) redirect(target);
}

export async function resumeSubscription() {
  const { org, role } = await requireSession();
  if (role === "staff" || !org.stripeSubscriptionId || !billingEnabled()) return;
  await setCancelAtPeriodEnd(org.stripeSubscriptionId, false);
  revalidatePath("/panel", "layout");
}

export async function openBillingPortal() {
  const { org, role } = await requireSession();
  if (role === "staff" || !org.stripeCustomerId || !billingEnabled()) return;
  let url: string;
  try {
    url = await createPortalUrl(org.stripeCustomerId, await origin());
  } catch (e) {
    console.error("[stripe] portal", e);
    url = errorUrl(e);
  }
  redirect(url);
}
