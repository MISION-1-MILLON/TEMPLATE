import Link from "next/link";
import type { Mission, Progress } from "@/lib/game";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function LevelBadge({ level, size = "md" }: { level: number; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 font-black text-amber-950 shadow-inner ring-2 ring-white",
        size === "md" ? "h-14 w-14 text-xl" : "h-8 w-8 text-sm",
      )}
      title={`Nivel ${level}`}
    >
      {level}
    </span>
  );
}

export function XpBar({ progress, dark = false }: { progress: Progress; dark?: boolean }) {
  const { level } = progress;
  const pct = level.isMax ? 100 : Math.min(100, (level.xpInLevel / level.xpForNext) * 100);
  return (
    <div>
      <div className={cn("h-2.5 overflow-hidden rounded-full", dark ? "bg-white/15" : "bg-slate-100")}>
        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className={cn("mt-1 text-xs", dark ? "text-white/70" : "text-slate-500")}>
        {level.isMax ? `${progress.xp} XP · nivel máximo` : `${level.xpInLevel} / ${level.xpForNext} XP para el siguiente nivel`}
      </p>
    </div>
  );
}

export function GoalRing({ today, goal }: { today: number; goal: number }) {
  const pct = goal ? Math.min(1, today / goal) : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  const done = today >= goal && goal > 0;
  return (
    <div className="relative h-32 w-32 shrink-0 sm:h-36 sm:w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-slate-100" />
        <circle
          cx="60" cy="60" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
          className={done ? "stroke-emerald-500" : "stroke-brand-600"}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl">{done ? "🏆" : "🎯"}</p>
          <p className="text-lg font-black tabular-nums">{Math.floor(pct * 100)}%</p>
        </div>
      </div>
    </div>
  );
}

export function MissionRow({ m }: { m: Mission }) {
  return (
    <Link
      href={m.href}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 transition",
        m.done ? "border-emerald-100 bg-emerald-50/60" : "border-slate-200 bg-white hover:border-brand-500 hover:shadow-sm",
      )}
    >
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold", m.done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
        {m.done ? "✓" : "★"}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block font-semibold", m.done && "text-slate-500 line-through")}>{m.title}</span>
        <span className="block text-xs text-slate-500">{m.hint}</span>
      </span>
      <span className={cn("badge shrink-0", m.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")}>+{m.xp} XP</span>
    </Link>
  );
}

export function TodaySummary({ progress }: { progress: Progress }) {
  const left = Math.max(0, progress.goalCents - progress.todayCents);
  if (progress.todayCents === 0) return <>Aún no has vendido nada hoy. ¡Vamos a por la primera venta!</>;
  if (left === 0) return <>¡Objetivo cumplido! Llevas <strong>{formatMoney(progress.todayCents)}</strong> hoy.</>;
  return (
    <>
      Llevas <strong>{formatMoney(progress.todayCents)}</strong> hoy. Te faltan <strong>{formatMoney(left)}</strong> para tu objetivo.
    </>
  );
}
