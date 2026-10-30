import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import type { Mission, Progress } from "@/lib/game";
import { cn } from "@/lib/utils";

/** Nivel del negocio: un número sobrio, sin medallas */
export function LevelBadge({ level, size = "md", reached = true }: { level: number; size?: "sm" | "md"; reached?: boolean }) {
  return (
    <span
      className={cn(
        "num grid shrink-0 place-items-center rounded-full font-semibold",
        reached ? "bg-ink text-canvas" : "bg-slate-100 text-slate-400",
        size === "md" ? "h-12 w-12 text-lg" : "h-8 w-8 text-sm",
      )}
      title={`Nivel ${level}`}
    >
      {level}
    </span>
  );
}

export function XpBar({ progress }: { progress: Progress }) {
  const { level } = progress;
  const pct = level.isMax ? 100 : Math.min(100, (level.xpInLevel / level.xpForNext) * 100);
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full origin-left rounded-full bg-brand-600 transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <p className="num mt-1.5 text-xs text-slate-500">
        {level.isMax ? `${progress.xp} XP · nivel máximo` : `${level.xpInLevel} de ${level.xpForNext} XP para el siguiente nivel`}
      </p>
    </div>
  );
}

export function MissionRow({ m, href }: { m: Mission; href: string | null }) {
  const body = (
    <>
      <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full", m.done ? "bg-brand-600 text-white" : "border border-slate-300")}>
        {m.done && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-medium", m.done && "text-slate-500")}>{m.title}</span>
        {!m.done && <span className="block text-xs text-slate-500">{m.hint}</span>}
      </span>
      <span className={cn("num shrink-0 text-xs font-medium", m.done ? "text-slate-400" : "text-brand-700")}>+{m.xp} XP</span>
      {href && !m.done && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />}
    </>
  );
  const cls = "flex items-center gap-3 px-5 py-3";
  return href && !m.done ? <Link href={href} className={cn(cls, "transition-colors duration-150 hover:bg-slate-50")}>{body}</Link> : <div className={cls}>{body}</div>;
}
