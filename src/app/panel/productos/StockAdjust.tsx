"use client";

import { useRef, useState } from "react";
import { SubmitButton } from "@/components/forms";
import { cn } from "@/lib/utils";
import { adjustStock } from "./actions";

const MODES = [
  { id: "purchase", label: "Entrada", field: "¿Cuántas han llegado?", button: "Sumar al stock" },
  { id: "count", label: "Recuento", field: "¿Cuántas hay al contarlas?", button: "Guardar recuento" },
  { id: "waste", label: "Merma", field: "¿Cuántas se han roto o caducado?", button: "Restar del stock" },
] as const;

/** Entrada, recuento o merma en el local activo: tres gestos, un solo campo */
export function StockAdjust({ productId, current }: { productId: string; current: number }) {
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("purchase");
  const form = useRef<HTMLFormElement>(null);
  const m = MODES.find((x) => x.id === mode)!;
  return (
    <form ref={form} action={async (fd) => { await adjustStock(productId, fd); form.current?.reset(); }} className="space-y-3">
      <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-3 gap-0.5 rounded-lg bg-slate-100 p-0.5">
        {MODES.map((x) => (
          <label key={x.id} className={cn("cursor-pointer rounded-md py-1.5 text-center text-sm font-medium transition-colors duration-150", mode === x.id ? "bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-slate-600 hover:text-ink")}>
            <input type="radio" name="reason" value={x.id} checked={mode === x.id} onChange={() => setMode(x.id)} className="sr-only" />
            {x.label}
          </label>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="amount">{m.field}</label>
        <input id="amount" name="amount" className="input num text-base" type="number" inputMode="numeric" min={0} required placeholder={mode === "count" ? String(current) : "0"} />
      </div>
      <SubmitButton className="btn-secondary w-full">{m.button}</SubmitButton>
    </form>
  );
}
