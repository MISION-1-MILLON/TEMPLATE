import type Stripe from "stripe";
import { stripe, syncSubscription } from "@/lib/billing";
import { db } from "@/lib/db";

/**
 * Webhook de Stripe. Configúralo en Stripe → Developers → Webhooks con la URL
 * https://<tu-dominio>/api/stripe/webhook y estos eventos:
 *   checkout.session.completed
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return new Response("Stripe no está configurado", { status: 503 });

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature ?? "", secret);
  } catch {
    return new Response("Firma no válida", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orgId = session.client_reference_id ?? session.metadata?.orgId;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (orgId && subscriptionId) {
        await db.organization.update({
          where: { id: orgId },
          data: {
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          },
        });
        await syncSubscription(await stripe().subscriptions.retrieve(subscriptionId));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
  }
  return Response.json({ received: true });
}
