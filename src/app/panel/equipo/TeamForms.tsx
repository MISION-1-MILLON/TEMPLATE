"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { FormError, SubmitButton } from "@/components/forms";
import { cn } from "@/lib/utils";
import { inviteMember, updateMember } from "./actions";

type Opt = { id: string; name: string };
type RoleOpt = { id: string; name: string; summary: string };

/** Elección de perfil con su explicación: se ve qué podrá hacer antes de invitar */
function RolePicker({ roles, value, onChange, name = "role" }: { roles: RoleOpt[]; value: string; onChange: (v: string) => void; name?: string }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="label">Perfil</legend>
      {roles.map((r) => (
        <label key={r.id} className={cn("flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150", value === r.id ? "border-ink bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
          <input type="radio" name={name} value={r.id} checked={value === r.id} onChange={() => onChange(r.id)} className="mt-1 accent-ink" />
          <span>
            <span className="block text-sm font-medium">{r.name}</span>
            <span className="block text-xs text-slate-500">{r.summary}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function LocationPicker({ locations, selected }: { locations: Opt[]; selected: string[] }) {
  if (locations.length < 2) return null;
  return (
    <fieldset>
      <legend className="label">Locales</legend>
      <div className="flex flex-wrap gap-2">
        {locations.map((l) => (
          <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-slate-50">
            <input type="checkbox" name="locationIds" value={l.id} defaultChecked={selected.length === 0 || selected.includes(l.id)} />
            {l.name}
          </label>
        ))}
      </div>
      <p className="hint mt-1">Solo verá y venderá en los locales marcados.</p>
    </fieldset>
  );
}

export function InviteForm({ roles, locations }: { roles: RoleOpt[]; locations: Opt[] }) {
  const [state, action] = useActionState(inviteMember, undefined);
  const [role, setRole] = useState(roles.find((r) => r.id === "staff")?.id ?? roles[0].id);
  const [copied, setCopied] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const url = state?.link ? `${typeof window === "undefined" ? "" : window.location.origin}${state.link}` : "";

  return (
    <form ref={form} action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="invite-email">Email</label>
        <input className="input" id="invite-email" name="email" type="email" placeholder="nombre@correo.com" required />
      </div>
      {roles.length > 1 ? <RolePicker roles={roles} value={role} onChange={setRole} /> : <input type="hidden" name="role" value={role} />}
      {role !== "owner" && role !== "accountant" && <LocationPicker locations={locations} selected={[]} />}
      <FormError error={state?.error} />
      <SubmitButton className="btn-primary w-full">Crear invitación</SubmitButton>
      {state?.link && (
        <div className="animate-pop space-y-2 rounded-lg bg-brand-50 p-3 text-sm" role="status">
          <p className="text-brand-800">Invitación lista para <span className="font-medium">{state.email}</span>. Envíale este enlace:</p>
          <p className="num truncate rounded-md bg-white px-2 py-1.5 text-xs text-slate-600">{url}</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary btn-sm flex-1" onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
              {copied ? <Check className="h-4 w-4" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={1.75} />} {copied ? "Copiado" : "Copiar"}
            </button>
            <a className="btn-secondary btn-sm flex-1" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Te invito a nuestro panel de Nexo: ${url}`)}`}>
              <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> WhatsApp
            </a>
          </div>
        </div>
      )}
    </form>
  );
}

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(window.location.origin + path); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
      {copied ? <Check className="h-4 w-4" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={1.75} />} {copied ? "Copiado" : "Copiar enlace"}
    </button>
  );
}

export function MemberEditor({ membershipId, role, locationIds, roles, locations }: { membershipId: string; role: string; locationIds: string[]; roles: RoleOpt[]; locations: Opt[] }) {
  const [state, action] = useActionState(updateMember.bind(null, membershipId), undefined);
  const [value, setValue] = useState(role);
  return (
    <form action={action} className="space-y-4">
      {roles.length > 1 ? <RolePicker roles={roles} value={value} onChange={setValue} name={`role`} /> : <input type="hidden" name="role" value={value} />}
      {value !== "owner" && value !== "accountant" && <LocationPicker locations={locations} selected={locationIds} />}
      <FormError error={state?.error} />
      <div className="flex items-center gap-3">
        <SubmitButton className="btn-primary btn-sm">Guardar</SubmitButton>
        {state?.ok && <span className="animate-fade text-sm text-positive">Guardado</span>}
      </div>
    </form>
  );
}
