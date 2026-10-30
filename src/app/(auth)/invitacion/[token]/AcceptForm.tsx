"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/forms";
import { acceptInvitation } from "../../actions";

export function AcceptForm({ token, email, exists }: { token: string; email: string; exists: boolean }) {
  const [state, action] = useActionState(acceptInvitation.bind(null, token), undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input bg-slate-50 text-slate-600" id="email" value={email} readOnly />
      </div>
      {!exists && (
        <div>
          <label className="label" htmlFor="name">Tu nombre</label>
          <input className="input" id="name" name="name" autoComplete="name" required autoFocus />
        </div>
      )}
      <div>
        <label className="label" htmlFor="password">{exists ? "Tu contraseña de Nexo" : "Elige una contraseña"}</label>
        <input className="input" id="password" name="password" type="password" autoComplete={exists ? "current-password" : "new-password"} minLength={exists ? undefined : 8} required autoFocus={exists} />
        {!exists && <p className="hint mt-1">Mínimo 8 caracteres.</p>}
      </div>
      <FormError error={state?.error} />
      <SubmitButton className="btn-primary w-full">{exists ? "Entrar y unirme" : "Crear cuenta y entrar"}</SubmitButton>
    </form>
  );
}
