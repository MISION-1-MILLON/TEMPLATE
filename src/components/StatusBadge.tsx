import { SALE_STATUS } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const style: Record<string, string> = { paid: "badge-positive", pending: "badge-warning", cancelled: "badge-neutral line-through" };
  return <span className={style[status] ?? "badge-neutral"}>{status === "pending" ? "Por cobrar" : SALE_STATUS[status] ?? status}</span>;
}
