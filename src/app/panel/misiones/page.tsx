import { LevelBadge, MissionRow, XpBar } from "@/components/game";
import { requireSession } from "@/lib/auth";
import { getProgress, LEVELS, XP_PER_PRODUCT, XP_PER_SALE } from "@/lib/game";
import { cn } from "@/lib/utils";

export const metadata = { title: "Misiones" };

export default async function MissionsPage() {
  const { org } = await requireSession();
  const progress = await getProgress(org);
  const pending = progress.missions.filter((m) => !m.done);
  const done = progress.missions.filter((m) => m.done);

  return (
    <div className="space-y-8">
      <section className="card flex flex-wrap items-center gap-5 p-6">
        <LevelBadge level={progress.level.level} />
        <div className="min-w-0 flex-1">
          <h1 className="display text-3xl">Nivel {progress.level.level} · {progress.level.name}</h1>
          <p className="text-sm text-slate-500">{progress.xp} XP en total</p>
          <div className="mt-2 max-w-md"><XpBar progress={progress} /></div>
        </div>
      </section>

      <section>
        <h2 className="display mb-1 text-2xl">Cómo ganar XP</h2>
        <p className="mb-3 text-sm text-slate-600">
          Cada venta suma <strong>{XP_PER_SALE} XP</strong>, cada producto en tu catálogo <strong>{XP_PER_PRODUCT} XP</strong>, y cada misión, lo que indica.
        </p>
        {pending.length > 0 && <div className="space-y-2">{pending.map((m) => <MissionRow key={m.id} m={m} />)}</div>}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="display mb-3 text-2xl">Completadas 🏅</h2>
          <div className="space-y-2">{done.map((m) => <MissionRow key={m.id} m={m} />)}</div>
        </section>
      )}

      <section>
        <h2 className="display mb-3 text-2xl">Niveles</h2>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {LEVELS.map((l, i) => {
            const reached = progress.xp >= l.xp;
            return (
              <li key={l.name} className={cn("card flex items-center gap-3 p-3", !reached && "opacity-50")}>
                <LevelBadge level={i + 1} size="sm" />
                <span>
                  <span className="block font-semibold">{l.name}</span>
                  <span className="text-xs text-slate-500">{l.xp} XP</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
