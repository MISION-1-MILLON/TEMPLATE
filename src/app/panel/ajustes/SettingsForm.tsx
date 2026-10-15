"use client";

import { useActionState } from "react";
import { saveSettings } from "./actions";
import { FormError, SubmitButton } from "@/components/forms";

interface Values {
  name: string; slug: string; taxId: string; address: string; phone: string; email: string; invoicePrefix: string; taxRate: string;
}

export function SettingsForm({ values }: { values: Values }) {
  const [state, action] = useActionState(saveSettings, undefined);
  const field = (name: keyof Values, label: string, hint?: string) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} defaultValue={values[name]} />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return (
    <form action={action} className="card space-y-4 p-6">
      <h2 className="font-bold">Datos del negocio</h2>
      <p className="text-sm text-slate-500">Aparecen en tus facturas y en la tienda online.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("name", "Nombre comercial")}
        {field("taxId", "NIF / CIF")}
        {field("address", "Dirección")}
        {field("phone", "Teléfono / WhatsApp")}
        {field("email", "Email de contacto")}
        {field("slug", "Dirección de la tienda", `/t/${values.slug}`)}
        {field("invoicePrefix", "Serie de facturas", "Ej.: F → F2026-00001")}
        {field("taxRate", "IVA por defecto (%)")}
      </div>
      <FormError error={state?.error} />
      {state?.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>}
      <SubmitButton>Guardar</SubmitButton>
    </form>
  );
}
