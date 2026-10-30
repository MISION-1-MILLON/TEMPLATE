"use client";

import { useActionState, useRef } from "react";
import { FormError, SubmitButton } from "@/components/forms";
import { saveLocation } from "./actions";

export interface LocationValues { id?: string; name: string; address: string; opensAt: string; closesAt: string }

export function LocationForm({ values }: { values: LocationValues }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof saveLocation>>, fd: FormData) => {
    const res = await saveLocation(values.id ?? null, prev, fd);
    if (res?.ok && !values.id) form.current?.reset();
    return res;
  }, undefined);
  const id = (k: string) => `${values.id ?? "new"}-${k}`;
  return (
    <form ref={form} action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={id("name")}>Nombre</label>
          <input className="input" id={id("name")} name="name" defaultValue={values.name} placeholder="Ej.: Malasaña" required />
        </div>
        <div>
          <label className="label" htmlFor={id("address")}>Dirección</label>
          <input className="input" id={id("address")} name="address" defaultValue={values.address} placeholder="Sale en las facturas de este local" />
        </div>
        <div>
          <label className="label" htmlFor={id("opensAt")}>Abre</label>
          <input className="input num" id={id("opensAt")} name="opensAt" type="time" defaultValue={values.opensAt} required />
        </div>
        <div>
          <label className="label" htmlFor={id("closesAt")}>Cierra</label>
          <input className="input num" id={id("closesAt")} name="closesAt" type="time" defaultValue={values.closesAt} required />
        </div>
      </div>
      <FormError error={state?.error} />
      <div className="flex items-center gap-3">
        <SubmitButton className="btn-primary btn-sm">{values.id ? "Guardar" : "Abrir local"}</SubmitButton>
        {state?.ok && <span className="animate-fade text-sm text-positive">{values.id ? "Guardado" : "Local creado"}</span>}
      </div>
    </form>
  );
}
