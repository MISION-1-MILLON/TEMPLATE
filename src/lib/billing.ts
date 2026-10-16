import "server-only";
import Stripe from "stripe";
import { db } from "./db";
import { BRAND } from "./brand";
import { PLANS, type Plan } from "./modules";

/**
 * Cobro de suscripciones con Stripe.
 *
 * Variables de entorno:
 *   STRIPE_SECRET_KEY      sk_test_… / sk_live_…
 *   STRIPE_WEBHOOK_SECRET  whsec_…  (del endpoint /api/stripe/webhook)
 *
 * No hace falta crear productos ni precios a mano: se crean solos la primera
 * vez, identificados por su `lookup_key` (nexo_pro_monthly, nexo_business_monthly).
 * Si cambias el precio en src/lib/modules.ts, cambia también la versión de la
 * lookup_key (…_v2) para que se cree un precio nuevo.
 */

export const TRIAL_DAYS = 14;
export type PaidPlan = Exclude<Plan["id"], "free">;

const LOOKUP_KEYS: Record<PaidPlan, string> = {
  pro: "nexo_pro_monthly",
  business: "nexo_business_monthly",
};

export function billingEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY no está configurada");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: BRAND.name } });
  return client;
}

/** lookup_key de un precio → plan de la app */
export function planFromLookupKey(key: string | null | undefined): PaidPlan | null {
  const entry = Object.entries(LOOKUP_KEYS).find(([, k]) => k === key);
  return (entry?.[0] as PaidPlan) ?? null;
}

/** Busca el precio del plan en Stripe y, si no existe, crea producto y precio. */
export async function getPriceId(plan: PaidPlan) {
  const s = stripe();
  const lookup_key = LOOKUP_KEYS[plan];
  const found = await s.prices.list({ lookup_keys: [lookup_key], active: true, limit: 1 });
  if (found.data[0]) return found.data[0].id;

  const def = PLANS.find((p) => p.id === plan)!;
  const price = await s.prices.create({
    lookup_key,
    currency: "eur",
    unit_amount: def.priceMonthly * 100,
    recurring: { interval: "month" },
    // IVA no incluido, como se anuncia en la web
    tax_behavior: "exclusive",
    product_data: { name: `${BRAND.name} ${def.name}` },
  });
  return price.id;
}

async function ensureCustomer(org: { id: string; name: string; email: string | null; stripeCustomerId: string | null }, fallbackEmail: string) {
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const customer = await stripe().customers.create({
    name: org.name,
    email: org.email ?? fallbackEmail,
    metadata: { orgId: org.id },
  });
  await db.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/** Página de pago de Stripe para contratar un plan (con prueba gratis la primera vez). */
export async function createCheckoutUrl(
  org: { id: string; name: string; email: string | null; stripeCustomerId: string | null; subscriptionStatus: string | null },
  userEmail: string,
  plan: PaidPlan,
  origin: string,
) {
  const customer = await ensureCustomer(org, userEmail);
  const firstTime = !org.subscriptionStatus;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: org.id,
    line_items: [{ price: await getPriceId(plan), quantity: 1 }],
    subscription_data: {
      metadata: { orgId: org.id },
      ...(firstTime ? { trial_period_days: TRIAL_DAYS } : {}),
    },
    metadata: { orgId: org.id },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    locale: "es",
    success_url: `${origin}/panel/ajustes?pago=ok#plan`,
    cancel_url: `${origin}/panel/ajustes?pago=cancelado#plan`,
  });
  if (!session.url) throw new Error("Stripe no devolvió la URL de pago");
  return session.url;
}

/** Portal de Stripe: cambiar tarjeta, ver facturas, cancelar. */
export async function createPortalUrl(customerId: string, origin: string) {
  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/panel/ajustes#plan`,
    locale: "es",
  });
  return session.url;
}

/** Cambia entre Pro y Business en una suscripción existente (prorrateando). */
export async function switchSubscriptionPlan(subscriptionId: string, plan: PaidPlan) {
  const s = stripe();
  const sub = await s.subscriptions.retrieve(subscriptionId);
  const item = sub.items.data[0];
  const updated = await s.subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price: await getPriceId(plan) }],
    proration_behavior: "create_prorations",
    cancel_at_period_end: false,
  });
  await syncSubscription(updated);
}

export async function setCancelAtPeriodEnd(subscriptionId: string, cancel: boolean) {
  const updated = await stripe().subscriptions.update(subscriptionId, { cancel_at_period_end: cancel });
  await syncSubscription(updated);
}

const ACTIVE = new Set(["active", "trialing", "past_due"]);

/**
 * Copia el estado de la suscripción de Stripe al negocio. Es la única función
 * que cambia `plan` cuando hay Stripe: la llama el webhook y las acciones.
 */
export async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const org =
    (sub.metadata?.orgId && (await db.organization.findUnique({ where: { id: sub.metadata.orgId } }))) ||
    (await db.organization.findUnique({ where: { stripeCustomerId: customerId } }));
  if (!org) return null;

  // Si el negocio tiene otra suscripción más reciente, ignorar eventos de la antigua
  if (org.stripeSubscriptionId && org.stripeSubscriptionId !== sub.id && sub.status === "canceled") return org;

  const item = sub.items.data[0];
  const paidPlan = planFromLookupKey(item?.price.lookup_key);
  const isActive = ACTIVE.has(sub.status);
  // Según la versión de la API, el fin de periodo está en la suscripción o en la línea
  const periodEnd =
    (item as unknown as { current_period_end?: number })?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;

  return db.organization.update({
    where: { id: org.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.status === "canceled" ? null : sub.id,
      subscriptionStatus: sub.status,
      plan: isActive && paidPlan ? paidPlan : "free",
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}
