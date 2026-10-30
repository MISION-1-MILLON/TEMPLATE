import Link from "next/link";
import { ModuleIcon } from "./ModuleIcon";
import { PLANS, type AppModule } from "@/lib/modules";

export function UpgradeNotice({ module, canUpgrade = true }: { module: AppModule; canUpgrade?: boolean }) {
  const plan = PLANS.find((p) => p.id === module.plan)!;
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <div className="flex justify-center"><ModuleIcon id={module.id} /></div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{module.name}</h1>
      <p className="mt-1 text-slate-600">{module.summary}</p>
      <p className="mt-3 text-sm text-slate-500">{module.description}</p>
      {module.status === "soon" ? (
        <p className="mt-6 text-sm text-slate-500">Estamos terminando esta herramienta. Muy pronto en tu panel.</p>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600">Incluida en el plan <span className="font-medium text-ink">{plan.name}</span> ({plan.priceMonthly} €/mes).</p>
          {canUpgrade
            ? <Link href="/panel/ajustes#plan" className="btn-primary mt-4">Ver planes</Link>
            : <p className="mt-2 text-xs text-slate-500">Pídeselo al dueño del negocio.</p>}
        </>
      )}
    </div>
  );
}
