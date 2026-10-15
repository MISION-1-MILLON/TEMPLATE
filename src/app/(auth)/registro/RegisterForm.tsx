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
        <input type="hidden" name="sector" value={sector} />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {sectors.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => setSector(s.id)}
              className={cn(
                "rounded-lg border p-3 text-left transition",
                sector === s.id ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-200 hover:border-slate-300",
              )}
            >
              <span className="flex items-center gap-2 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.accent }} />
                {s.name}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">{s.tagline}</span>
            </button>
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
        <input type="checkbox" name="withDemo" defaultChecked className="h-4 w-4 rounded border-slate-300" />
        Cargar productos de ejemplo para probar (podrás borrarlos)
      </label>

      <FormError error={state?.error} />
      <SubmitButton className="btn-primary w-full py-3 uppercase">Crear mi panel</SubmitButton>
    </form>
  );
}
