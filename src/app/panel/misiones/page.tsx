import { Figures, PageHeader } from "@/components/PageHeader";
import { LevelBadge, MissionRow, XpBar } from "@/components/game";
import { requirePagePermission } from "@/lib/auth";
import { getProgress, LEVELS, XP_PER_PRODUCT, XP_PER_SALE } from "@/lib/game";
import { formatMoney } from "@/lib/money";
import type { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const metadata = { title: "Progreso" };

/** Qué permiso hace falta para abrir el enlace de cada misión */
const NEEDS: Record<string, Permission> = {
  "/panel/ajustes": "settings.manage", "/panel/competencia": "market.use", "/panel/proveedores": "market.use",
  "/panel/caja": "cash.manage", "/panel/clientes/nuevo": "customers.manage", "/panel/productos/nuevo": "products.manage",
};

export default async function MissionsPage() {
  const { org, can } = await requirePagePermission("stats.view");
  const progress = await getProgress(org);
  const pending = progress.missions.filter((m) => !m.done);
  const done = progress.missions.filter((m) => m.done);
  const href = (h: string) => (NEEDS[h] && !can(NEEDS[h]) ? null : h);

  return (
    <>
      <PageHeader title="Progreso del negocio" subtitle="Pequeñas metas que dejan el negocio mejor montado. Cada una suma experiencia y sube de nivel." />
      <section className="card mb-6 flex flex-wrap items-center gap-5 p-6">
        <LevelBadge level={progress.level.level} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">Nivel {progress.level.level}</p>
          <p className="text-xl font-semibold tracking-tight">{progress.level.name}</p>
          <div className="mt-3 max-w-md"><XpBar progress={progress} /></div>
        </div>
      </section>

      <Figures
        items={[
          { label: "Experiencia", value: `${progress.xp} XP`, hint: `${XP_PER_SALE} por venta y ${XP_PER_PRODUCT} por cada cosa del catálogo` },
          { label: "Racha", value: `${progress.streak} ${progress.streak === 1 ? "día" : "días"}`, hint: "Seguidos con ventas" },
          { label: "Objetivo de hoy", value: formatMoney(progress.goalCents), hint: progress.todayCents >= progress.goalCents ? "Cumplido" : `Faltan ${formatMoney(progress.goalCents - progress.todayCents)}` },
          { label: "Misiones", value: `${done.length} de ${progress.missions.length}` },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          {pending.length > 0 && (
            <section className="card">
              <h2 className="card-header card-title">Siguientes misiones</h2>
              <div className="divide-y divide-slate-100">{pending.map((m) => <MissionRow key={m.id} m={m} href={href(m.href)} />)}</div>
            </section>
          )}
          {done.length > 0 && (
            <section className="card">
              <h2 className="card-header card-title">Completadas</h2>
              <div className="divide-y divide-slate-100">{done.map((m) => <MissionRow key={m.id} m={m} href={null} />)}</div>
            </section>
          )}
        </div>
        <section className="card lg:sticky lg:top-8">
          <h2 className="card-header card-title">Niveles</h2>
          <ol className="divide-y divide-slate-100">
            {LEVELS.map((l, i) => {
              const reached = progress.xp >= l.xp;
              const current = progress.level.level === i + 1;
              return (
                <li key={l.name} className={cn("flex items-center gap-3 px-5 py-2.5", current && "bg-brand-50")}>
                  <LevelBadge level={i + 1} size="sm" reached={reached} />
                  <span className={cn("min-w-0 flex-1 text-sm", reached ? "font-medium" : "text-slate-500")}>{l.name}</span>
                  <span className="num text-xs text-slate-500">{l.xp} XP</span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </>
  );
}
