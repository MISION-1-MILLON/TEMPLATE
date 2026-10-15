"use client";

import { useMemo, useState, useTransition } from "react";
import { submitSale } from "../actions";
import { formatMoney, parseMoney, centsToInput } from "@/lib/money";
import { cn, PAYMENT_METHODS } from "@/lib/utils";
import type { SectorTerms } from "@/sectors/types";

interface PosProduct {
  id: string;
  name: string;
  sku: string | null;
  priceCents: number;
  stock: number;
  trackStock: boolean;
  categoryId: string | null;
  imageUrl: string | null;
}
interface Line { productId: string; quantity: number; unitPriceCents: number }

export function PointOfSale({
  products,
  customers,
  categories,
  terms,
  defaultCustomerId,
}: {
  products: PosProduct[];
  customers: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  terms: SectorTerms;
  defaultCustomerId: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [pendingPayment, setPendingPayment] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const visible = products.filter(
    (p) =>
      (!category || p.categoryId === category) &&
      (!query || p.name.toLowerCase().includes(query.toLowerCase()) || p.sku?.toLowerCase().includes(query.toLowerCase())),
  );
  const total = lines.reduce((a, l) => a + l.unitPriceCents * l.quantity, 0);

  function add(p: PosProduct) {
    const existing = lines.find((l) => l.productId === p.id);
    const qty = (existing?.quantity ?? 0) + 1;
    if (p.trackStock && qty > p.stock) {
      setError(`No hay más stock de «${p.name}»`);
      return;
    }
    setError(undefined);
    setLines(
      existing
        ? lines.map((l) => (l.productId === p.id ? { ...l, quantity: qty } : l))
        : [...lines, { productId: p.id, quantity: 1, unitPriceCents: p.priceCents }],
    );
  }

  function setQty(id: string, qty: number) {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.productId !== id) : ls.map((l) => (l.productId === id ? { ...l, quantity: qty } : l))));
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const res = await submitSale({
        customerId: customerId || null,
        newCustomerName: customerId ? undefined : newCustomerName,
        paymentMethod,
        status: pendingPayment ? "pending" : "paid",
        items: lines,
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="lg:col-span-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <input className="input max-w-xs" placeholder={`Buscar ${terms.product.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          <select className="input max-w-[200px]" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {products.length === 0 && <p className="card p-6 text-sm text-slate-600">Aún no tienes {terms.products.toLowerCase()}. Añádelos primero en el catálogo.</p>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visible.map((p) => {
            const out = p.trackStock && p.stock <= 0;
            return (
              <button
                key={p.id}
                type="button"
                disabled={out}
                onClick={() => add(p)}
                className="card flex flex-col p-3 text-left transition hover:border-brand-500 disabled:opacity-40"
              >
                <span className="line-clamp-2 text-sm font-semibold">{p.name}</span>
                <span className="mt-auto flex items-end justify-between pt-2">
                  <span className="font-bold tabular-nums">{formatMoney(p.priceCents)}</span>
                  {p.trackStock && <span className="text-xs text-slate-500">{out ? "Agotado" : `${p.stock} uds`}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="card flex flex-col self-start p-5 lg:sticky lg:top-6 lg:col-span-2">
        <h2 className="font-bold">Ticket</h2>
        {lines.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Añade {terms.products.toLowerCase()} desde la izquierda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {lines.map((l) => {
              const p = byId.get(l.productId)!;
              return (
                <li key={l.productId} className="py-2.5">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="font-semibold tabular-nums">{formatMoney(l.unitPriceCents * l.quantity)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-sm">
                    <button type="button" className="btn-secondary h-7 w-7 p-0" onClick={() => setQty(l.productId, l.quantity - 1)}>−</button>
                    <span className="w-6 text-center tabular-nums">{l.quantity}</span>
                    <button type="button" className="btn-secondary h-7 w-7 p-0" onClick={() => add(p)}>+</button>
                    <span className="ml-auto text-xs text-slate-500">a</span>
                    <input
                      className="input w-24 py-1 text-right"
                      defaultValue={centsToInput(l.unitPriceCents)}
                      onBlur={(e) => {
                        const cents = parseMoney(e.target.value);
                        setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, unitPriceCents: cents } : x)));
                      }}
                      aria-label="Precio unitario"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <div>
            <label className="label">{terms.customer} (opcional)</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Sin {terms.customer.toLowerCase()} / nuevo</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!customerId && (
              <input className="input mt-2" placeholder="Nombre de un cliente nuevo (opcional)" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
            )}
          </div>
          <div>
            <label className="label">Forma de pago</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPaymentMethod(k)}
                  className={cn("rounded-full border px-3 py-1 text-sm", paymentMethod === k ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200")}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={pendingPayment} onChange={(e) => setPendingPayment(e.target.checked)} />
            Pendiente de cobro (se cobra más tarde)
          </label>
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-4">
          <span className="text-slate-600">Total (IVA incl.)</span>
          <span className="display text-3xl tabular-nums">{formatMoney(total)}</span>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="button" className="btn-primary mt-4 py-3 text-base uppercase" disabled={lines.length === 0 || isPending} onClick={submit}>
          {isPending ? "Registrando…" : pendingPayment ? "Registrar venta" : "Cobrar y registrar"}
        </button>
      </aside>
    </div>
  );
}
