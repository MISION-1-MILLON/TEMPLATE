import { aiEnabled } from "@/lib/ai-research";
import { db } from "@/lib/db";
import { refreshStale } from "@/lib/research";

/**
 * Tarea diaria (Vercel Cron, ver vercel.json): actualiza los precios de
 * competencia y proveedores que lleven más de una semana sin revisarse.
 * Vercel envía "Authorization: Bearer $CRON_SECRET".
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  if (!aiEnabled()) return Response.json({ skipped: "ANTHROPIC_API_KEY no configurada" });

  const deadline = Date.now() + 250_000;
  // Primero los negocios de pago, luego los más antiguos
  const rank: Record<string, number> = { business: 0, pro: 1, free: 2 };
  const orgs = (await db.organization.findMany({ orderBy: { createdAt: "asc" } })).sort((a, b) => (rank[a.plan] ?? 3) - (rank[b.plan] ?? 3));
  const report: Array<{ org: string; processed: number; pending: number }> = [];
  for (const org of orgs) {
    if (Date.now() > deadline) break;
    const r = await refreshStale(org, { kind: "both", max: 6, deadline });
    if (r.processed || r.pending) report.push({ org: org.slug, ...r });
  }
  return Response.json({ ok: true, report });
}
