/**
 * Fechas en la zona horaria del negocio. Los servidores (Vercel) van en UTC,
 * así que "hoy", "este mes" o "las 14:00" hay que calcularlos explícitamente.
 */
export const APP_TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Madrid";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

const WEEKDAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Componentes de la fecha en la zona del negocio. weekday: 0 = lunes … 6 = domingo */
export function zonedParts(date: Date) {
  const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: WEEKDAY[p.weekday] ?? 0,
  };
}

function offsetMs(date: Date) {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instante (UTC) en que empieza ese día en la zona del negocio */
export function zonedMidnight(year: number, month: number, day: number) {
  const guess = Date.UTC(year, month - 1, day);
  let t = guess - offsetMs(new Date(guess));
  t = guess - offsetMs(new Date(t)); // segunda pasada por si cae en cambio de hora
  return new Date(t);
}

export function startOfToday(now = new Date()) {
  const p = zonedParts(now);
  return zonedMidnight(p.year, p.month, p.day);
}

export function startOfMonth(now = new Date()) {
  const p = zonedParts(now);
  return zonedMidnight(p.year, p.month, 1);
}

/** "2026-10-16" → [inicio, fin) de ese día en la zona del negocio */
export function dayRange(isoDay: string) {
  const [y, m, d] = isoDay.split("-").map(Number);
  return { start: zonedMidnight(y, m, d), end: zonedMidnight(y, m, d + 1) };
}

/** Fecha de hoy como "YYYY-MM-DD" en la zona del negocio */
export function todayIso(now = new Date()) {
  const p = zonedParts(now);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
