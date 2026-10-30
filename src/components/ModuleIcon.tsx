import type { IconName } from "@/lib/nav";
import { NavIcon } from "./shell/Icon";

const ICONS: Record<string, IconName> = {
  gestion: "pos", competencia: "radar", proveedores: "truck", precio: "calculator",
  tienda: "store", publica: "megaphone", mercado: "chart", fideliza: "heart",
};

/** Icono de cada herramienta: el mismo trazo que el menú, sin colores propios */
export function ModuleIcon({ id, size = "md", className }: { id: string; size?: "sm" | "md"; className?: string }) {
  const icon = <NavIcon name={ICONS[id] ?? "box"} className={className ?? (size === "sm" ? "h-4 w-4" : "h-5 w-5")} />;
  if (className) return icon;
  return <span className={`grid shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 ${size === "sm" ? "h-8 w-8" : "h-10 w-10"}`}>{icon}</span>;
}
