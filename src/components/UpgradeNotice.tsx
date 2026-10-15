import Link from "next/link";
import { ModuleIcon } from "./ModuleIcon";
import { PLANS, type AppModule } from "@/lib/modules";

export function UpgradeNotice({ module }: { module: AppModule }) {
  const plan = PLANS.find((p) => p.id === module.plan)!;
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <div className="flex justify-center"><ModuleIcon id={module.id} /></div>
      <h1 className="display mt-4 text-3xl uppercase">{module.name}</h1>
      <p className="mt-2 font-medium">{module.summary}</p>
      <p className="mt-2 text-sm text-slate-600">{module.description}</p>
      {module.status === "soon" ? (
        <p className="mt-6 text-sm font-semibold text-slate-500">Estamos terminando esta herramienta. Muy pronto en tu panel.</p>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600">Incluida en el plan <strong>{plan.name}</strong> ({plan.priceMonthly} €/mes).</p>
          <Link href="/panel/ajustes#plan" className="btn-primary mt-4 uppercase">Mejorar plan</Link>
        </>
      )}
    </div>
  );
}
