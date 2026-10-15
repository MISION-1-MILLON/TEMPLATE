"use client";

import { useActionState } from "react";
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
  defaultTaxRate,
}: {
  values: ProductFormValues;
  categories: { id: string; name: string }[];
  fields: SectorField[];
  productLabel: string;
  defaultTaxRate: string;
}) {
  const [state, action] = useActionState(saveProduct.bind(null, values.id ?? null), undefined);

  return (
    <form action={action} className="space-y-6">
      <section className="card space-y-4 p-6">
        <h2 className="font-bold">Datos básicos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Nombre</label>
            <input className="input" id="name" name="name" defaultValue={values.name} required />
          </div>
          <div>
            <label className="label" htmlFor="categoryId">Categoría</label>
            <select className="input" id="categoryId" name="categoryId" defaultValue={values.categoryId}>
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="newCategory">…o crea una nueva</label>
            <input className="input" id="newCategory" name="newCategory" placeholder="Nombre de la categoría" />
          </div>
          <div>
            <label className="label" htmlFor="sku">Referencia / SKU</label>
            <input className="input" id="sku" name="sku" defaultValue={values.sku} />
          </div>
          <div>
            <label className="label" htmlFor="imageUrl">URL de la imagen</label>
            <input className="input" id="imageUrl" name="imageUrl" type="url" placeholder="https://…" defaultValue={values.imageUrl} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Descripción</label>
            <textarea className="input min-h-24" id="description" name="description" defaultValue={values.description} />
          </div>
        </div>
      </section>

      {fields.length > 0 && (
        <section className="card space-y-4 p-6">
          <h2 className="font-bold">Detalles de tu sector</h2>
          <SectorFields fields={fields} values={values.attributes} />
        </section>
      )}

      <section className="card space-y-4 p-6">
        <h2 className="font-bold">Precio y stock</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="price">Precio de venta (IVA incl.)</label>
            <input className="input" id="price" name="price" inputMode="decimal" placeholder="0,00" defaultValue={values.price} />
          </div>
          <div>
            <label className="label" htmlFor="cost">Coste (sin IVA)</label>
            <input className="input" id="cost" name="cost" inputMode="decimal" placeholder="0,00" defaultValue={values.cost} />
          </div>
          <div>
            <label className="label" htmlFor="taxRate">IVA %</label>
            <input className="input" id="taxRate" name="taxRate" inputMode="decimal" placeholder={`${defaultTaxRate} (por defecto)`} defaultValue={values.taxRate} />
          </div>
          {!values.id && (
            <div>
              <label className="label" htmlFor="stock">Stock inicial</label>
              <input className="input" id="stock" name="stock" type="number" min={0} defaultValue={values.stock} />
            </div>
          )}
          <div>
            <label className="label" htmlFor="lowStockAt">Avisar con stock ≤</label>
            <input className="input" id="lowStockAt" name="lowStockAt" type="number" min={0} defaultValue={values.lowStockAt} />
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="trackStock" defaultChecked={values.trackStock} className="h-4 w-4" />
            Controlar stock
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="published" defaultChecked={values.published} className="h-4 w-4" />
            Mostrar en la tienda online
          </label>
        </div>
      </section>

      <FormError error={state?.error} />
      <div className="flex gap-2">
        <SubmitButton>{values.id ? "Guardar cambios" : `Crear ${productLabel.toLowerCase()}`}</SubmitButton>
        <Link href="/panel/productos" className="btn-secondary">Cancelar</Link>
      </div>
    </form>
  );
}
