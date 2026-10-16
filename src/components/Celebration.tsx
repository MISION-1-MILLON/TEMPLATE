"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface Reward {
  xp: number;
  total: string;
  messages: string[];
  levelUp?: { level: number; name: string };
  goalReached: boolean;
}

/** Ventana de "¡Venta hecha!" con confeti. Se muestra una vez tras registrar una venta. */
export function Celebration({ reward }: { reward: Reward }) {
  const [open, setOpen] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);

  // Quitar ?nueva=1 de la URL para que al recargar no vuelva a salir
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("nueva");
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    const el = canvas.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = el.getContext("2d")!;
    el.width = window.innerWidth;
    el.height = window.innerHeight;
    const colors = ["#4f46e5", "#f59e0b", "#10b981", "#ec4899", "#0ea5e9"];
    const count = reward.levelUp || reward.goalReached ? 220 : 120;
    const parts = Array.from({ length: count }, () => ({
      x: el.width / 2 + (Math.random() - 0.5) * 200,
      y: el.height / 2.5,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      r: Math.random() * 6 + 4,
      c: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, el.width, el.height);
      for (const p of parts) {
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += 0.1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - frame / 160);
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      }
      if (++frame < 160) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [reward]);

  if (!open) return null;
  const title = reward.levelUp ? "¡Has subido de nivel!" : reward.goalReached ? "¡Objetivo del día cumplido!" : "¡Venta hecha!";
  const emoji = reward.levelUp ? "🚀" : reward.goalReached ? "🏆" : "🎉";

  return (
    <div className="no-print fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <canvas ref={canvas} className="pointer-events-none fixed inset-0" />
      <div className="relative w-full max-w-sm animate-[pop_.35s_ease-out] rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-6xl">{emoji}</p>
        <h2 className="display mt-2 text-3xl">{title}</h2>
        {reward.levelUp && (
          <p className="mt-1 font-semibold text-amber-700">Nivel {reward.levelUp.level} · {reward.levelUp.name}</p>
        )}
        <p className="mt-3 text-slate-600">Has cobrado <strong className="text-ink">{reward.total}</strong></p>
        <p className="mx-auto mt-3 inline-block rounded-full bg-amber-100 px-4 py-1 text-lg font-black text-amber-800">+{reward.xp} XP</p>
        {reward.messages.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {reward.messages.map((m) => <li key={m} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-800">{m}</li>)}
          </ul>
        )}
        <div className="mt-6 grid gap-2">
          <Link href="/panel/ventas/nueva" className="btn-primary py-3 text-base uppercase">Otra venta</Link>
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Ver el ticket</button>
        </div>
      </div>
    </div>
  );
}
