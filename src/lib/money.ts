export function formatMoney(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(cents / 100);
}

/** "12,50" | "12.50" | "1.234,50" → 1250 */
export function parseMoney(input: FormDataEntryValue | string | null | undefined): number {
  if (input == null) return 0;
  let s = String(input).trim().replace(/[€\s]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Precio con IVA incluido → base imponible e impuesto */
export function splitTax(grossCents: number, taxRateBp: number) {
  const base = Math.round((grossCents * 10000) / (10000 + taxRateBp));
  return { base, tax: grossCents - base };
}

export function formatPercent(bp: number) {
  return `${(bp / 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })} %`;
}
