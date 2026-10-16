import { APP_TZ } from "./time";

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(d: Date, withTime = false) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: APP_TZ,
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(d);
}

export const PAYMENT_METHODS: Record<string, string> = {
  card: "Tarjeta",
  cash: "Efectivo",
  bizum: "Bizum",
  transfer: "Transferencia",
  other: "Otro",
};

export const SALE_STATUS: Record<string, string> = {
  paid: "Pagada",
  pending: "Pendiente de cobro",
  cancelled: "Anulada",
};
