import type { Organization } from "@prisma/client";
import { billingEnabled, TRIAL_DAYS } from "@/lib/billing";
import { ConfirmButton } from "@/components/forms";
import { PLANS } from "@/lib/modules";
import { cn, formatDate } from "@/lib/utils";
import { changePlan, openBillingPortal, resumeSubscription } from "./actions";

const MESSAGES: Record<string, { tone: "ok" | "warn" | "error"; text: string }> = {
  ok: { tone: "ok", text: "¡Gracias! Tu suscripción está activa. Si no ves el plan nuevo, recarga en unos segundos." },
  cancelado: { tone: "warn", text: "Has cancelado el pago. No se ha cobrado nada." },
  error: { tone: "error", text: "No hemos podido conectar con la pasarela de pago. Inténtalo de nuevo en unos minutos." },
  "no-configurado": { tone: "error", text: "Los pagos aún no están configurados en este servidor." },
};

export function BillingSection({ org, status }: { org: Organization; status?: string }) {
  const enabled = billingEnabled();
  const msg = status ? MESSAGES[status] : undefined;
  const current = PLANS.find((p) => p.id === org.plan) ?? PLANS[0];
  const subscribed = Boolean(org.stripeSubscriptionId) && org.subscriptionStatus !== "canceled";
  const firstTime = !org.subscriptionStatus;

  return (
    <section id="plan" className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-bold">Plan y facturación</h2>
          <p className="mt-1 text-sm text-slate-600">
            Plan actual: <strong>{current.name}</strong>
            {org.subscriptionStatus === "trialing" && org.currentPeriodEnd && <> · prueba gratis hasta el {formatDate(org.currentPeriodEnd)}</>}
            {org.subscriptionStatus === "active" && org.currentPeriodEnd && !org.cancelAtPeriodEnd && <> · se renueva el {formatDate(org.currentPeriodEnd)}</>}
          </p>
        </div>
        {enabled && org.stripeCustomerId && (
          <form action={openBillingPortal}>
            <button className="btn-secondary">Tarjeta y facturas</button>
          </form>
        )}
      </div>

      {msg && (
        <p className={cn("mt-4 rounded-lg px-3 py-2 text-sm",
          msg.tone === "ok" && "bg-emerald-50 text-emerald-800",
          msg.tone === "warn" && "bg-amber-50 text-amber-800",
          msg.tone === "error" && "bg-red-50 text-red-700")}>
          {msg.text}
        </p>
      )}
      {org.subscriptionStatus === "past_due" && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          No hemos podido cobrar la última cuota. Actualiza tu tarjeta en «Tarjeta y facturas» para no perder el plan.
        </p>
      )}
      {org.cancelAtPeriodEnd && org.currentPeriodEnd && (
        <form action={resumeSubscription} className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Tu suscripción termina el {formatDate(org.currentPeriodEnd)} y pasarás al plan Gratis.
          <button className="font-semibold underline">Mantener mi plan</button>
        </form>
      )}
      {!enabled && (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Modo desarrollo: Stripe no está configurado, así que el cambio de plan es inmediato y sin cobro.
        </p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = org.plan === p.id;
          let label = "Cambiar";
          if (p.id === "free") label = subscribed ? "Cancelar suscripción" : "Cambiar";
          else if (!subscribed) label = firstTime && enabled ? `Probar ${TRIAL_DAYS} días gratis` : `Contratar ${p.name}`;
          else label = `Cambiar a ${p.name}`;
          const confirmFree = p.id === "free" && subscribed;
          return (
            <form key={p.id} action={changePlan} className={cn("flex flex-col rounded-xl border p-4", isCurrent ? "border-brand-600 ring-1 ring-brand-600" : "border-slate-200")}>
              <input type="hidden" name="plan" value={p.id} />
              <p className="display text-xl uppercase">{p.name}</p>
              <p className="text-sm text-slate-500">{p.priceMonthly} €/mes{p.priceMonthly ? " + IVA" : ""}</p>
              <ul className="mt-3 flex-1 space-y-1 text-xs text-slate-600">
                {p.features.slice(0, 4).map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              {confirmFree && !org.cancelAtPeriodEnd ? (
                <ConfirmButton className="btn-ghost mt-4 w-full" message="¿Cancelar la suscripción? Mantienes tu plan hasta el final del periodo pagado y después pasas a Gratis.">
                  {label}
                </ConfirmButton>
              ) : (
                <button
                  className={cn("mt-4 w-full", isCurrent ? "btn-secondary" : p.id === "free" ? "btn-ghost" : "btn-primary")}
                  disabled={isCurrent || (p.id === "free" && org.cancelAtPeriodEnd)}
                >
                  {isCurrent ? "Plan actual" : label}
                </button>
              )}
            </form>
          );
        })}
      </div>
      {enabled && <p className="mt-3 text-xs text-slate-500">Pago seguro con Stripe. Cancela cuando quieras desde «Tarjeta y facturas».</p>}
    </section>
  );
}
