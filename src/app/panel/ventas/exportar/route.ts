import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoiceNumber } from "@/lib/sales";
import { salesWhere } from "@/lib/sales-filter";
import { formatDate, PAYMENT_METHODS, SALE_STATUS } from "@/lib/utils";

/** CSV de ventas para la gestoría (separador ; y decimales con coma, como espera Excel en español) */
export async function GET(req: Request) {
  const session = await requirePermission("sales.export");
  const { org } = session;
  const { where } = salesWhere(session, Object.fromEntries(new URL(req.url).searchParams));

  const sales = await db.sale.findMany({
    where,
    orderBy: { number: "asc" },
    include: { customer: true, location: true },
  });

  const n = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [
    ["Factura", "Fecha", "Local", "Cliente", "NIF", "Base imponible", "IVA", "Descuento", "Total", "Forma de pago", "Estado"],
    ...sales.map((s) => [
      invoiceNumber(org.invoicePrefix, s.number, s.createdAt),
      formatDate(s.createdAt),
      s.location?.name ?? "",
      s.customer?.name ?? "",
      s.customer?.taxId ?? "",
      n(s.subtotalCents),
      n(s.taxCents),
      n(s.discountCents),
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
