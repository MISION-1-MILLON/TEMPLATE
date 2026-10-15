"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveCustomer } from "./actions";
import { FormError, SubmitButton } from "@/components/forms";
import { SectorFields } from "@/components/SectorFields";
import type { Attributes } from "@/lib/attributes";
import type { SectorField } from "@/sectors";

export interface CustomerValues {
  id?: string;
  name: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  notes: string;
  attributes: Attributes;
}

export function CustomerForm({ values, fields }: { values: CustomerValues; fields: SectorField[] }) {
  const [state, action] = useActionState(saveCustomer.bind(null, values.id ?? null), undefined);
  const input = (name: keyof CustomerValues, label: string, type = "text") => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} type={type} defaultValue={String(values[name] ?? "")} />
    </div>
  );
  return (
    <form action={action} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Nombre o razón social</label>
          <input className="input" id="name" name="name" defaultValue={values.name} required />
        </div>
        {input("email", "Email", "email")}
        {input("phone", "Teléfono", "tel")}
        {input("taxId", "NIF / CIF (para facturas)")}
        {input("address", "Dirección")}
      </div>
      <SectorFields fields={fields} values={values.attributes} />
      <div>
        <label className="label" htmlFor="notes">Notas</label>
        <textarea className="input min-h-20" id="notes" name="notes" defaultValue={values.notes} />
      </div>
      <FormError error={state?.error} />
      <div className="flex gap-2">
        <SubmitButton>{values.id ? "Guardar cambios" : "Crear cliente"}</SubmitButton>
        <Link href="/panel/clientes" className="btn-secondary">Cancelar</Link>
      </div>
    </form>
  );
}
