import { SALE_STATUS } from "@/lib/utils";
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    cancelled: "bg-slate-100 text-slate-500 line-through",
  };
  return <span className={`badge ${styles[status] ?? ""}`}>{SALE_STATUS[status] ?? status}</span>;
}
