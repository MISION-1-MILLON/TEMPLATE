"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";

const num = (s: string) => Number(s.replace(",", ".")) || 0;

export function PriceCalculator({ defaultTax }: { defaultTax: number }) {
  const [cost, setCost] = useState("10");
  const [margin, setMargin] = useState("40");
  const [tax, setTax] = useState(String(defaultTax));
  const [rounding, setRounding] = useState(true);

  const m = Math.min(num(margin), 95) / 100;
  const base = num(cost) / (1 - m);
  let pvp = base * (1 + num(tax) / 100);
  // Precio "psicológico": redondeo a ,90 / ,95 / ,99 según el tramo
  if (rounding && pvp > 0) pvp = pvp < 10 ? Math.ceil(pvp * 2) / 2 - 0.05 : Math.ceil(pvp) - 0.1;
  const realBase = pvp / (1 + num(tax) / 100);
  const realMargin = realBase > 0 ? ((realBase - num(cost)) / realBase) * 100 : 0;

  return (
    <section className="card space-y-4 self-start p-5">
      <h2 className="font-bold">Calculadora</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Coste sin IVA (€)</label>
          <input className="input" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <div>
          <label className="label">Margen deseado %</label>
          <input className="input" inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} />
        </div>
        <div>
          <label className="label">IVA %</label>
          <input className="input" inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={rounding} onChange={(e) => setRounding(e.target.checked)} /> Redondear a precio comercial
      </label>
      <div className="rounded-lg bg-brand-50 p-4">
        <p className="text-sm text-slate-600">Precio de venta recomendado</p>
        <p className="display text-4xl tabular-nums text-brand-700">{formatMoney(Math.round(pvp * 100))}</p>
        <p className="mt-1 text-xs text-slate-600">
          Base {formatMoney(Math.round(realBase * 100))} · margen real {realMargin.toFixed(1)} % · ganas {formatMoney(Math.round((realBase - num(cost)) * 100))} por unidad
        </p>
      </div>
    </section>
  );
}
