import { headers } from "next/headers";
import QRCode from "qrcode";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { requireModule } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { toggleProductPublished, toggleStore } from "./actions";

export const metadata = { title: "Tienda online" };

export default async function StoreAdminPage() {
  const { org, sector } = await requireModule("tienda");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const url = `${origin}/t/${org.slug}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, width: 168, color: { dark: "#141312", light: "#ffffff" } });
  const products = await db.product.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" } });
  const visible = products.filter((p) => p.published).length;

  return (
    <>
      <PageHeader title={`${sector.terms.store} online`} subtitle="Tu escaparate público, con el catálogo y el stock reales: lo que se agota, se marca solo." />
      <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <section className="card space-y-4 p-5 lg:sticky lg:top-8">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Estado</h2>
            <span className={org.storeEnabled ? "badge-positive" : "badge-neutral"}>{org.storeEnabled ? "Publicada" : "Oculta"}</span>
          </div>
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-medium hover:bg-slate-100">
            <span className="min-w-0 flex-1 truncate">{url.replace(/^https?:\/\//, "")}</span>
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />
          </a>
          <div className="flex justify-center rounded-lg bg-[#fff] p-3 ring-1 ring-slate-200" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="text-center text-xs text-slate-500">Imprime el QR para el mostrador, la mesa o el escaparate.</p>
          <form action={toggleStore}>
            <button className="btn-secondary w-full">{org.storeEnabled ? "Ocultar" : "Publicar"} {sector.terms.store.toLowerCase()}</button>
          </form>
        </section>
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Qué se muestra</h2>
            <span className="num text-sm text-slate-500">{visible} de {products.length} visibles</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {products.map((p) => (
              <li key={p.id}>
                <form action={toggleProductPublished.bind(null, p.id)}>
                  <label className="flex cursor-pointer items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      {p.trackStock && p.stock <= 0 && <span className="text-xs text-warning">Agotado: sale como no disponible</span>}
                    </span>
                    <span className="num text-sm text-slate-600">{formatMoney(p.priceCents)}</span>
                    <button className="sr-only">{p.published ? "Ocultar" : "Mostrar"} {p.name}</button>
                    <span role="switch" aria-checked={p.published} aria-hidden className={`switch pointer-events-none ${p.published ? "bg-brand-600 after:translate-x-4" : ""}`} />
                  </label>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
