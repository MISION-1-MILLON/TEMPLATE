import { headers } from "next/headers";
import QRCode from "qrcode";
import { PageHeader } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { toggleProductPublished, toggleStore } from "./actions";

export default async function StoreAdminPage() {
  const { org, sector } = await requireSession();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const url = `${origin}/t/${org.slug}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, width: 180 });
  const products = await db.product.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader title={sector.terms.store} subtitle="Tu escaparate público, alimentado por el catálogo y el stock reales." />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card space-y-4 self-start p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Estado</h2>
            <span className={`badge ${org.storeEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {org.storeEnabled ? "Publicada" : "Oculta"}
            </span>
          </div>
          <div className="break-all rounded-lg bg-slate-50 p-3 text-sm">
            <a href={url} target="_blank" className="font-medium text-brand-600 hover:underline">{url}</a>
          </div>
          <div className="flex justify-center rounded-lg border border-slate-100 p-3" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="text-center text-xs text-slate-500">Imprime este QR para el mostrador, la mesa o el escaparate.</p>
          <form action={toggleStore}>
            <button className="btn-secondary w-full">{org.storeEnabled ? "Ocultar" : "Publicar"} {sector.terms.store.toLowerCase()}</button>
          </form>
        </section>
        <section className="card lg:col-span-2">
          <h2 className="border-b border-slate-100 px-5 py-3 font-bold">Qué se muestra</h2>
          <table className="table">
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="text-right tabular-nums">{formatMoney(p.priceCents)}</td>
                  <td className="text-right text-slate-500">{p.trackStock && p.stock <= 0 ? "Agotado" : ""}</td>
                  <td className="text-right">
                    <form action={toggleProductPublished.bind(null, p.id)}>
                      <button className={`badge cursor-pointer ${p.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {p.published ? "Visible" : "Oculto"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
