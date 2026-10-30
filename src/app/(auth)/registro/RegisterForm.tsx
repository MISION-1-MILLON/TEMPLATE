"use client";

import { useActionState, useState } from "react";
import { registerAction } from "../actions";
import { FormError, SubmitButton } from "@/components/forms";
import { cn } from "@/lib/utils";

interface SectorOption { id: string; name: string; tagline: string; accent: string }

export function RegisterForm({ sectors, defaultSector }: { sectors: SectorOption[]; defaultSector?: string }) {
  const [state, action] = useActionState(registerAction, undefined);
  const [sector, setSector] = useState(sectors.some((s) => s.id === defaultSector) ? defaultSector! : "general");

  return (
    <form action={action} className="mt-6 space-y-6">
      <fieldset>
        <legend className="label">¿A qué se dedica tu negocio?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {sectors.map((s) => (
            <label
              key={s.id}
              className={cn(
                "cursor-pointer rounded-lg border p-3 transition-[border-color,background-color] duration-150 ease-out",
                sector === s.id ? "border-ink bg-slate-50 ring-1 ring-ink" : "border-slate-200 hover:border-slate-300",
              )}
            >
              <input type="radio" name="sector" value={s.id} checked={sector === s.id} onChange={() => setSector(s.id)} className="sr-only" />
              <span className="block text-sm font-medium">{s.name}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{s.tagline}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="businessName">Nombre del negocio</label>
          <input className="input" id="businessName" name="businessName" required />
        </div>
        <div>
          <label className="label" htmlFor="name">Tu nombre</label>
          <input className="input" id="name" name="name" autoComplete="name" required />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="withDemo" defaultChecked className="h-4 w-4 rounded border-slate-300 accent-ink" />
        Cargar productos de ejemplo para probar (podrás borrarlos)
      </label>

      <FormError error={state?.error} />
      <SubmitButton className="btn-primary btn-lg w-full">Crear mi panel</SubmitButton>
    </form>
  );
}
