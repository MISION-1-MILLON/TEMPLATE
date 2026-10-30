import { formatMoney } from "@/lib/money";

export interface PulseSale {
  /** Minutos desde medianoche (hora del negocio) */
  at: number;
  cents: number;
  label: string;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
const clock = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * «El pulso del día»: la jornada del local de la apertura al cierre, cada venta
 * en su hora (alto = importe), el mismo día de la semana pasada detrás en gris
 * y la línea de ahora. Es SVG de servidor: no necesita JavaScript.
 */
export function Pulse({
  opensAt,
  closesAt,
  today,
  lastWeek,
  nowMin,
  height = 112,
}: {
  opensAt: string;
  closesAt: string;
  today: PulseSale[];
  lastWeek: PulseSale[];
  nowMin: number | null;
  height?: number;
}) {
  const open = toMin(opensAt);
  let close = toMin(closesAt);
  if (close <= open) close += 24 * 60; // cierra pasada la medianoche
  // Ventas fuera del horario: el eje se estira para no esconderlas
  const all = [...today, ...lastWeek].map((s) => (s.at < open - 120 ? s.at + 1440 : s.at));
  const start = Math.min(open, ...all.map((m) => Math.floor(m / 60) * 60));
  const end = Math.max(close, ...all.map((m) => Math.ceil((m + 1) / 60) * 60));
  const span = Math.max(60, end - start);
  const W = 1000;
  const top = 8;
  const base = height - 22;
  const max = Math.max(1, ...today.map((s) => s.cents), ...lastWeek.map((s) => s.cents));
  const x = (m: number) => ((m - start) / span) * W;
  const h = (c: number) => Math.max(3, ((base - top) * c) / max);
  const step = span > 12 * 60 ? 180 : span > 6 * 60 ? 120 : 60;
  const ticks: number[] = [];
  for (let m = Math.ceil(start / step) * step; m <= end; m += step) ticks.push(m);
  const fix = (s: PulseSale) => (s.at < open - 120 ? s.at + 1440 : s.at);
  const now = nowMin === null ? null : nowMin < open - 120 ? nowMin + 1440 : nowMin;

  const pct = (m: number) => `${(x(m) / W) * 100}%`;
  return (
    <div className="relative pb-5">
      <svg viewBox={`0 0 ${W} ${base}`} preserveAspectRatio="none" className="block h-24 w-full" role="img"
        aria-label={`${today.length} ventas hoy entre las ${clock(start)} y las ${clock(end)}`}>
        {/* horario de apertura */}
        <rect x={x(open)} y={top} width={x(close) - x(open)} height={base - top} className="fill-slate-100" />
        <line x1="0" x2={W} y1={base} y2={base} className="stroke-slate-300" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {lastWeek.map((s, i) => (
          <rect key={`w${i}`} x={x(fix(s)) - 2} y={base - h(s.cents)} width="4" height={h(s.cents)} className="fill-slate-300">
            <title>{`Hace una semana, ${clock(s.at)}: ${formatMoney(s.cents)}`}</title>
          </rect>
        ))}
        {today.map((s, i) => (
          <rect key={`t${i}`} x={x(fix(s)) - 2.5} y={base - h(s.cents)} width="5" height={h(s.cents)} className="fill-brand-600">
            <title>{`${clock(s.at)} · ${s.label}: ${formatMoney(s.cents)}`}</title>
          </rect>
        ))}
        {now !== null && now >= start && now <= end && (
          <line x1={x(now)} x2={x(now)} y1={0} y2={base} className="stroke-ink" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {now !== null && now >= start && now <= end && (
        <span className="absolute -top-1 -translate-x-1/2 rounded bg-ink px-1 text-2xs font-medium text-canvas num" style={{ left: pct(now) }}>{clock(now)}</span>
      )}
      {ticks.map((m, i) => (
        <span key={m} className={`num absolute bottom-0 text-2xs text-slate-500 ${i === 0 ? "" : i === ticks.length - 1 && x(m) > W - 40 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: pct(m) }}>
          {clock(m)}
        </span>
      ))}
    </div>
  );
}
