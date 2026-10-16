"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const STEPS = ["Buscando en internet", "Mirando tiendas", "Comparando precios", "Ordenando resultados"];

/** Botón que lanza una búsqueda en internet y muestra el progreso mientras tanto */
export function SearchButton({
  action,
  label,
  className = "btn-primary",
  compact = false,
}: {
  action: () => Promise<{ ok?: string; error?: string }>;
  label: string;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!pending) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 4000);
    return () => clearInterval(t);
  }, [pending]);

  return (
    <div className={cn(!compact && "w-full")}>
      <button
        type="button"
        disabled={pending}
        className={cn(className, pending && "cursor-wait")}
        onClick={() =>
          start(async () => {
            setMsg(undefined);
            const res = await action();
            setMsg(res);
            router.refresh();
          })
        }
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {STEPS[step]}…
          </span>
        ) : (
          label
        )}
      </button>
      {pending && !compact && <p className="mt-2 text-xs text-slate-500">Suele tardar entre 20 y 60 segundos. Puedes esperar aquí.</p>}
      {msg?.ok && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg.ok}</p>}
      {msg?.error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg.error}</p>}
    </div>
  );
}
