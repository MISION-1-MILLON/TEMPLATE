"use client";

import { useActionState, useState } from "react";
import { formatMoney, parseMoney } from "@/lib/money";
import Link from "next/link";
import { saveProduct } from "./actions";
import { FormError, SubmitButton } from "@/components/forms";
import { SectorFields } from "@/components/SectorFields";
import type { SectorField } from "@/sectors";
import type { Attributes } from "@/lib/attributes";

export interface ProductFormValues {
  id?: string;
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  price: string;
  cost: string;
  taxRate: string;
  stock: number;
  trackStock: boolean;
  lowStockAt: number;
  published: boolean;
  categoryId: string;
  attributes: Attributes;
}

export function ProductForm({
  values,
  categories,
  fields,
  productLabel,
  productFeminine = false,
  examplePlaceholder = "",
  defaultTaxRate,
}: {
  values: ProductFormValues;
  categories: { id: string; name: string }[];
  fields: SectorField[];
  productLabel: string;
  productFeminine?: boolean;
  examplePlaceholder?: string;
  defaultTaxRate: string;
}) {
  const [state, action] = useActionState(saveProduct.bind(null, values.id ?? null), undefined);

  const [price, setPrice] = useState(values.price);
  const [cost, setCost] = useState(values.cost);
  const [tax, setTax] = useState(values.taxRate);
  const [image, setImage] = useState(values.imageUrl);
  const vat = Number((tax || defaultTaxRate).replace(",", ".")) || 0;
  const priceN = parseMoney(price) / 100;
  const costN = parseMoney(cost) / 100;
  const keep = priceN / (1 + vat / 100) - costN;
  const art = productFeminine ? "cada una" : "cada uno";

  return (
    <form action={action} className="space-y-6">
      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-bold">Lo básico</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Nombre</label>
            <input className="input text-base" id="name" name="name" defaultValue={values.name} placeholder={`Ej.: ${examplePlaceholder}`} required autoFocus={!values.id} />
          </div>
          <div>
            <label className="label" htmlFor="price">¿A cuánto lo vendes? (€)</label>
            <input className="input text-base" id="price" name="price" inputMode="decimal" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">El precio que paga el cliente, con IVA incluido.</p>
          </div>
          <div>
            <label className="label" htmlFor="cost">¿Cuánto te costó a ti? (€, opcional)</label>
            <input className="input text-base" id="cost" name="cost" inputMode="decimal" placeholder="0,00" value={cost} onChange={(e) => setCost(e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">Lo que pagaste al proveedor. Sirve para saber cuánto ganas.</p>
          </div>
          {priceN > 0 && costN > 0 && (
            <p className={`sm:col-span-2 rounded-lg px-3 py-2 text-sm font-medium ${keep > 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
              {keep > 0
                ? `💰 Te quedas ${formatMoney(Math.round(keep * 100))} por ${art} (después de pagar el IVA).`
                : `⚠️ Con este precio pierdes ${formatMoney(Math.round(-keep * 100))} por ${art}. Sube el precio.`}
            </p>
          )}
          {!values.id && (
            <div>
              <label className="label" htmlFor="stock">¿Cuántas unidades tienes ahora?</label>
              <input className="input text-base" id="stock" name="stock" type="number" min={0} defaultValue={values.stock} />
            </div>
          )}
          <div>
            <label className="label" htmlFor="categoryId">Categoría</label>
            <select className="input" id="categoryId" name="categoryId" defaultValue={values.categoryId}>
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input mt-2" name="newCategory" placeholder="…o escribe una nueva" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="imageUrl">Foto (enlace a la imagen, opcional)</label>
            <div className="flex items-center gap-3">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-slate-100 text-2xl">📷</span>
              )}
              <input className="input" id="imageUrl" name="imageUrl" type="url" placeholder="https://…" value={image} onChange={(e) => setImage(e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      {fields.length > 0 && (
        <section className="card space-y-4 p-6">
          <h2 className="text-lg font-bold">Detalles <span className="text-sm font-normal text-slate-500">(opcional)</span></h2>
          <SectorFields fields={fields} values={values.attributes} />
        </section>
      )}

      <details className="card p-6 [&_summary]:list-none">
        <summary className="flex cursor-pointer items-center justify-between font-bold">
          Más opciones
          <span className="text-sm font-normal text-brand-600">Mostrar</span>
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="taxRate">IVA de este producto (%)</label>
            <input className="input" id="taxRate" name="taxRate" inputMode="decimal" placeholder={`${defaultTaxRate} (el normal)`} value={tax} onChange={(e) => setTax(e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">Déjalo vacío salvo que este producto lleve un IVA distinto (por ejemplo, 10 % o 4 %).</p>
          </div>
          <div>
            <label className="label" htmlFor="lowStockAt">Avísame cuando queden</label>
            <input className="input" id="lowStockAt" name="lowStockAt" type="number" min={0} defaultValue={values.lowStockAt} />
          </div>
          <div>
            <label className="label" htmlFor="sku">Código o referencia</label>
            <input className="input" id="sku" name="sku" defaultValue={values.sku} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Descripción (sale en tu tienda online)</label>
            <textarea className="input min-h-24" id="description" name="description" defaultValue={values.description} />
          </div>
          <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-700 sm:col-span-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="trackStock" defaultChecked={values.trackStock} className="h-4 w-4" />
              Llevar la cuenta de unidades
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="published" defaultChecked={values.published} className="h-4 w-4" />
              Mostrar en mi tienda online
            </label>
          </div>
        </div>
      </details>

      <FormError error={state?.error} />
      <div className="flex gap-2">
        <SubmitButton className="btn-primary px-6 py-3 text-base">{values.id ? "Guardar cambios" : "Guardar"}</SubmitButton>
        <Link href="/panel/productos" className="btn-secondary py-3">Cancelar</Link>
      </div>
    </form>
  );
}
