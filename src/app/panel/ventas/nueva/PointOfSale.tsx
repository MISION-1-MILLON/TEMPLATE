"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { Banknote, Check, ChevronUp, CircleDot, CreditCard, Landmark, Minus, Plus, Search, Smartphone, Trash2, X } from "lucide-react";
import { submitSale, type SaleResult } from "../actions";
import { centsToInput, formatMoney, parseMoney } from "@/lib/money";
import { cn, PAYMENT_METHODS } from "@/lib/utils";
import type { SectorTerms } from "@/sectors/types";

interface PosProduct {
  id: string;
  name: string;
  sku: string | null;
  priceCents: number;
  /** Existencias en el local activo */
  stock: number;
  trackStock: boolean;
  categoryId: string | null;
  imageUrl: string | null;
}
interface Line { productId: string; quantity: number; unitPriceCents: number }

const PAY_ICON: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  card: CreditCard, cash: Banknote, bizum: Smartphone, transfer: Landmark, other: CircleDot,
};

/** Iniciales para la ficha sin foto: dos letras de las palabras con peso */
const initials = (name: string) => name.replace(/\(.*?\)/g, "").split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || name.slice(0, 2).toUpperCase();

export function PointOfSale({
  products, customers, categories, terms, defaultCustomerId, locationName, canDiscount,
}: {
  products: PosProduct[];
  customers: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  terms: SectorTerms;
  defaultCustomerId: string;
  locationName: string;
  canDiscount: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [later, setLater] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<Extract<SaleResult, { ok: true }> | null>(null);
  const [sheet, setSheet] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const visible = products.filter((p) => (!category || p.categoryId === category) && (!query || norm(p.name).includes(norm(query)) || (p.sku && norm(p.sku).includes(norm(query)))));
  const gross = lines.reduce((a, l) => a + l.unitPriceCents * l.quantity, 0);
  const discount = canDiscount ? Math.min(gross, parseMoney(discountInput || "0")) : 0;
  const total = gross - discount;
  const units = lines.reduce((a, l) => a + l.quantity, 0);
  const inTicket = (id: string) => lines.find((l) => l.productId === id)?.quantity ?? 0;

  function add(p: PosProduct) {
    const qty = inTicket(p.id) + 1;
    if (p.trackStock && qty > p.stock) { setError(`No hay más «${p.name}» en ${locationName} (quedan ${p.stock})`); return; }
    setError(undefined);
    setDone(null);
    setLines((ls) => (ls.some((l) => l.productId === p.id) ? ls.map((l) => (l.productId === p.id ? { ...l, quantity: qty } : l)) : [...ls, { productId: p.id, quantity: 1, unitPriceCents: p.priceCents }]));
  }
  const setQty = (id: string, qty: number) => setLines((ls) => (qty <= 0 ? ls.filter((l) => l.productId !== id) : ls.map((l) => (l.productId === id ? { ...l, quantity: qty } : l))));

  function reset() {
    setLines([]); setDiscountInput(""); setLater(false); setNewCustomerName(""); setCustomerId(""); setSheet(false);
  }
  function submit() {
    setError(undefined);
    startTransition(async () => {
      const res = await submitSale({
        customerId: customerId || null,
        newCustomerName: customerId ? undefined : newCustomerName,
        paymentMethod,
        status: later ? "pending" : "paid",
        discountCents: discount,
        items: lines,
      });
      if ("error" in res) setError(res.error);
      else { setDone(res); reset(); searchRef.current?.focus(); }
    });
  }

  const ticket = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <h2 className="text-sm font-semibold">Ticket <span className="font-normal text-slate-500">· {locationName}</span></h2>
        {lines.length > 0 && <button type="button" className="btn-ghost btn-sm -mr-2 text-slate-500" onClick={reset}><Trash2 className="h-3.5 w-3.5" />Vaciar</button>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        {lines.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Toca {terms.productFeminine ? "una" : "un"} {terms.product.toLowerCase()} para empezar el ticket.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lines.map((l) => {
              const p = byId.get(l.productId)!;
              return (
                <li key={l.productId} className="animate-rise py-3">
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="font-medium leading-snug">{p.name}</span>
                    <span className="num shrink-0 font-medium">{formatMoney(l.unitPriceCents * l.quantity)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <button type="button" className="btn-secondary h-8 w-8 px-0" onClick={() => setQty(l.productId, l.quantity - 1)} aria-label={`Quitar una unidad de ${p.name}`}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="num w-7 text-center text-sm font-medium">{l.quantity}</span>
                    <button type="button" className="btn-secondary h-8 w-8 px-0" onClick={() => add(p)} aria-label={`Añadir una unidad de ${p.name}`}><Plus className="h-3.5 w-3.5" /></button>
                    {canDiscount ? (
                      <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
                        a
                        <input
                          className="input num h-8 w-20 text-right"
                          defaultValue={centsToInput(l.unitPriceCents)}
                          inputMode="decimal"
                          onBlur={(e) => { const c = parseMoney(e.target.value); setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, unitPriceCents: c } : x))); }}
                          aria-label={`Precio de ${p.name}`}
                        />
                      </label>
                    ) : (
                      <span className="num ml-auto text-xs text-slate-500">{formatMoney(l.unitPriceCents)} / ud.</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-4 border-t border-slate-200 px-5 pb-5 pt-4">
        <div className="grid grid-cols-5 gap-1 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Forma de pago">
          {Object.entries(PAYMENT_METHODS).map(([k, v]) => {
            const Icon = PAY_ICON[k] ?? CircleDot;
            return (
              <button key={k} type="button" role="radio" aria-checked={paymentMethod === k} onClick={() => setPaymentMethod(k)}
                className={cn("flex h-12 flex-col items-center justify-center gap-0.5 rounded-md text-[0.6875rem] font-medium transition-colors duration-150", paymentMethod === k ? "bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-slate-500 hover:text-ink")}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />{v}
              </button>
            );
          })}
        </div>

        <details className="group text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between text-slate-600">
            <span>{customerId ? customers.find((c) => c.id === customerId)?.name : newCustomerName || `Sin ${terms.customer.toLowerCase()}`}{later ? " · paga más tarde" : ""}{discount ? ` · descuento ${formatMoney(discount)}` : ""}</span>
            <span className="text-xs font-medium text-slate-500 group-open:hidden">Cambiar</span>
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="pos-customer">{terms.customer}</label>
              <select id="pos-customer" className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Sin nombre o {terms.customer.toLowerCase()} nuevo</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {!customerId && <input className="input mt-2" placeholder="Nombre, si quieres guardarlo" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} aria-label="Nombre del cliente nuevo" />}
            </div>
            {canDiscount && (
              <div>
                <label className="label" htmlFor="pos-discount">Descuento en el ticket (€)</label>
                <input id="pos-discount" className="input num" inputMode="decimal" placeholder="0,00" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} />
              </div>
            )}
            <label className="flex items-center gap-2 text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={later} onChange={(e) => setLater(e.target.checked)} />
              Me lo pagará más tarde
            </label>
          </div>
        </details>

        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-500">{units} {units === 1 ? "artículo" : "artículos"}</span>
          <span className="num text-3xl font-semibold tracking-tight">{formatMoney(total)}</span>
        </div>
        {error && <p className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative" role="alert">{error}</p>}
        <button type="button" className="btn-primary btn-lg w-full text-base" disabled={lines.length === 0 || isPending} onClick={submit}>
          {isPending ? "Cobrando…" : later ? "Apuntar venta" : `Cobrar ${formatMoney(total)}`}
        </button>
      </div>
    </div>
  );

  return (
    <div className="lg:-my-8 lg:grid lg:min-h-screen lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-0 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="pb-28 lg:py-8 lg:pr-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Vender</h1>
          {done && (
            <div key={done.saleId} className="animate-pop rounded-lg bg-brand-50 px-3 py-1.5 text-sm text-brand-800" role="status">
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4" strokeWidth={2.25} /> Venta nº {done.number} · {formatMoney(done.totalCents)}
                <Link href={`/panel/ventas/${done.saleId}`} className="font-medium underline decoration-brand-300">Ver ticket</Link>
                {done.reward && <span className="num text-xs font-medium text-brand-700">+{done.reward.xp} XP</span>}
              </p>
              {done.reward && (done.reward.levelUp || done.reward.notes.length > 0) && (
                <p className="mt-0.5 pl-6 text-xs text-brand-700">
                  {[done.reward.levelUp && `Nivel ${done.reward.levelUp.level}: ${done.reward.levelUp.name}`, ...done.reward.notes].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
          <input ref={searchRef} className="input h-11 pl-9 text-[0.9375rem]" placeholder={`Buscar ${terms.product.toLowerCase()} o código…`} value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && visible[0]) { e.preventDefault(); add(visible[0]); setQuery(""); } }} aria-label={`Buscar ${terms.product.toLowerCase()}`} autoFocus />
        </div>
        {categories.length > 1 && (
          <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {[{ id: "", name: "Todo" }, ...categories].map((c) => (
              <button key={c.id} type="button" onClick={() => setCategory(c.id)} aria-pressed={category === c.id}
                className={cn("btn-sm btn shrink-0 rounded-full border", category === c.id ? "border-ink bg-ink text-canvas" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-ink")}>
                {c.name}
              </button>
            ))}
          </div>
        )}
        {products.length === 0 && <p className="card p-6 text-sm text-slate-600">Aún no tienes {terms.products.toLowerCase()}. Añádelos en el catálogo y aparecerán aquí.</p>}
        {products.length > 0 && visible.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nada coincide con «{query}».</p>}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => {
            const out = p.trackStock && p.stock <= 0;
            const n = inTicket(p.id);
            return (
              <button key={p.id} type="button" disabled={out} onClick={() => add(p)}
                className={cn("card group relative flex flex-col overflow-hidden text-left transition-[transform,border-color] duration-150 ease-out hover:border-slate-300 active:scale-[0.97] disabled:opacity-40", n > 0 && "border-ink")}>
                <span className={cn("relative block w-full bg-slate-100", p.imageUrl ? "aspect-[4/3]" : "h-14")}>
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="grid h-full place-items-center text-sm font-semibold tracking-wide text-slate-400">{initials(p.name)}</span>
                  )}
                  {n > 0 && <span key={n} className="animate-pop num absolute right-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-ink px-1.5 text-xs font-semibold text-canvas">{n}</span>}
                </span>
                <span className="flex flex-1 flex-col p-3">
                  <span className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</span>
                  <span className="mt-auto flex items-end justify-between pt-1.5">
                    <span className="num text-sm font-semibold">{formatMoney(p.priceCents)}</span>
                    {p.trackStock && <span className={cn("num text-xs", out ? "text-negative" : p.stock <= 2 ? "text-warning" : "text-slate-500")}>{out ? "Agotado" : `${p.stock} uds`}</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Ticket fijo a la derecha en escritorio */}
      <aside className="sticky top-0 hidden h-screen border-l border-slate-200 bg-white lg:block" aria-label="Ticket">{ticket}</aside>

      {/* Móvil y tableta: barra con el total que abre el ticket en una hoja */}
      <div className="fixed inset-x-3 bottom-[5.25rem] z-20 lg:hidden">
        <button type="button" onClick={() => setSheet(true)} disabled={lines.length === 0}
          className="flex h-14 w-full items-center justify-between rounded-xl bg-ink px-5 text-canvas shadow-[0_12px_32px_-12px_rgb(0_0_0/0.5)] transition-transform duration-150 ease-out active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none">
          <span className="flex items-center gap-2 text-sm"><ChevronUp className="h-4 w-4" />{units ? `${units} ${units === 1 ? "artículo" : "artículos"}` : "Ticket vacío"}</span>
          <span className="num font-semibold">{units ? `Cobrar ${formatMoney(total)}` : formatMoney(0)}</span>
        </button>
      </div>
      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Ticket">
          <button type="button" className="animate-fade absolute inset-0 bg-ink/30" onClick={() => setSheet(false)} aria-label="Cerrar ticket" />
          <div className="animate-sheet absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-center pt-2"><span className="h-1 w-10 rounded-full bg-slate-300" /></div>
            <button type="button" className="btn-icon absolute right-2 top-2" onClick={() => setSheet(false)} aria-label="Cerrar"><X className="h-5 w-5" /></button>
            {ticket}
          </div>
        </div>
      )}
    </div>
  );
}
