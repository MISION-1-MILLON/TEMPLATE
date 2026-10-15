import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoiceNumber } from "@/lib/sales";
import { PAYMENT_METHODS, SALE_STATUS } from "@/lib/utils";

/** CSV de ventas para la gestoría (separador ; y decimales con coma, como espera Excel en español) */
export async function GET(req: Request) {
  const { org } = await requireSession();
  const params = new URL(req.url).searchParams;
  const createdAt: Prisma.DateTimeFilter = {};
  if (params.get("desde")) createdAt.gte = new Date(params.get("desde")!);
  if (params.get("hasta")) createdAt.lt = new Date(new Date(params.get("hasta")!).getTime() + 86_400_000);

  const sales = await db.sale.findMany({
    where: { orgId: org.id, ...(params.get("estado") ? { status: params.get("estado")! } : {}), ...(createdAt.gte || createdAt.lt ? { createdAt } : {}) },
    orderBy: { number: "asc" },
    include: { customer: true },
  });

  const n = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [
    ["Factura", "Fecha", "Cliente", "NIF", "Base imponible", "IVA", "Total", "Forma de pago", "Estado"],
    ...sales.map((s) => [
      invoiceNumber(org.invoicePrefix, s.number, s.createdAt),
      s.createdAt.toISOString().slice(0, 10),
      s.customer?.name ?? "",
      s.customer?.taxId ?? "",
      n(s.subtotalCents),
      n(s.taxCents),
      n(s.totalCents),
      PAYMENT_METHODS[s.paymentMethod] ?? s.paymentMethod,
      SALE_STATUS[s.status] ?? s.status,
    ]),
  ];
  const csv = "﻿" + rows.map((r) => r.map((c) => esc(String(c))).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ventas-${org.slug}.csv"`,
    },
  });
}
