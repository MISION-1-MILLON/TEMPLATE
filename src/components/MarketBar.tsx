import { formatMoney } from "@/lib/money";

/** Barra con el rango de precios del mercado y dónde quedo yo */
export function MarketBar({ my, min, max, avg }: { my: number; min: number; max: number; avg: number }) {
  const lo = Math.min(min, my);
  const hi = Math.max(max, my);
  const span = hi - lo || 1;
  const pos = (v: number) => `${((v - lo) / span) * 100}%`;
  return (
    <div className="w-full">
      <div className="relative h-2 rounded-full bg-slate-100">
        <div className="absolute inset-y-0 rounded-full bg-slate-300" style={{ left: pos(min), right: `calc(100% - ${pos(max)})` }} />
        <div className="absolute -top-1 h-4 w-0.5 bg-slate-500" style={{ left: pos(avg) }} title={`Media ${formatMoney(avg)}`} />
        <div className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-brand-600 shadow" style={{ left: pos(my) }} title={`Tú ${formatMoney(my)}`} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
        <span>{formatMoney(min)}</span>
        <span>media {formatMoney(avg)}</span>
        <span>{formatMoney(max)}</span>
      </div>
    </div>
  );
}
