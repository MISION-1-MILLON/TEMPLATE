import type { PanelSession } from "./auth";
import { getModule, moduleEnabled, planIncludes } from "./modules";
import type { Permission } from "./permissions";

/** Nombre del icono (lucide) que pinta la barra lateral */
export type IconName =
  | "home" | "pos" | "receipt" | "box" | "users" | "wallet" | "radar" | "truck" | "calculator"
  | "store" | "megaphone" | "chart" | "heart" | "settings" | "team" | "map" | "target" | "landmark";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Plan necesario (si el negocio no lo tiene) o «Pronto» */
  badge?: string;
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}

/**
 * La navegación de cada perfil: solo lo que su rol puede usar y lo que el
 * negocio tiene encendido. El servidor vuelve a comprobarlo en cada página.
 */
export function buildNav(s: PanelSession): { groups: NavGroup[]; tabs: NavItem[] } {
  const t = s.sector.terms;
  const on = (moduleId: string, perm: Permission) => moduleEnabled(s.org, moduleId) && s.can(perm);
  const badge = (moduleId: string) => {
    const m = getModule(moduleId);
    if (m.status === "soon") return "Pronto";
    return planIncludes(s.org.plan, m.plan) ? undefined : m.plan === "pro" ? "Pro" : "Business";
  };
  const item = (cond: boolean, i: NavItem) => (cond ? [i] : []);

  // La gestoría tiene su propio menú: lo suyo es consultar y exportar
  if (s.role === "accountant") {
    const items: NavItem[] = [
      { href: "/panel", label: "Resumen", icon: "home" },
      { href: "/panel/ventas", label: "Ventas y facturas", icon: "receipt" },
      { href: "/panel/caja", label: "Caja y gastos", icon: "wallet" },
      { href: "/panel/impuestos", label: "IVA por trimestre", icon: "landmark" },
    ];
    return { groups: [{ items }], tabs: items };
  }

  const sections: NavGroup[] = [
    {
      items: [
        { href: "/panel", label: s.role === "staff" ? "Mi turno" : "Inicio", icon: "home" },
        ...item(s.can("sales.create"), { href: "/panel/ventas/nueva", label: "Vender", icon: "pos" }),
        { href: "/panel/ventas", label: s.can("sales.viewAll") ? "Ventas" : "Mis ventas de hoy", icon: "receipt" },
        ...item(s.can("cash.view"), { href: "/panel/caja", label: "Caja", icon: "wallet" }),
      ],
    },
    {
      title: "Catálogo",
      items: [
        ...item(s.can("stock.view"), { href: "/panel/productos", label: s.can("products.manage") ? t.products : "Stock", icon: "box" }),
        ...item(s.can("customers.manage"), { href: "/panel/clientes", label: t.customers, icon: "users" }),
      ],
    },
    {
      title: "Mercado",
      items: [
        ...item(on("competencia", "market.use"), { href: "/panel/competencia", label: "Competencia", icon: "radar", badge: badge("competencia") }),
        ...item(on("proveedores", "market.use"), { href: "/panel/proveedores", label: "Proveedores", icon: "truck", badge: badge("proveedores") }),
        ...item(on("precio", "pricing.use"), { href: "/panel/precio", label: "Precios y márgenes", icon: "calculator", badge: badge("precio") }),
      ],
    },
    {
      title: "Crecer",
      items: [
        ...item(on("tienda", "store.manage"), { href: "/panel/tienda", label: `${t.store} online`, icon: "store", badge: badge("tienda") }),
        ...item(on("publica", "publish.use"), { href: "/panel/publica", label: "Publicar en redes", icon: "megaphone", badge: badge("publica") }),
        ...item(on("mercado", "stats.view"), { href: "/panel/mercado", label: "Estadísticas", icon: "chart", badge: badge("mercado") }),
        ...item(on("fideliza", "customers.manage"), { href: "/panel/fideliza", label: "Fidelizar", icon: "heart", badge: badge("fideliza") }),
      ],
    },
    {
      title: "Negocio",
      items: [
        ...item(s.can("stats.view"), { href: "/panel/misiones", label: "Progreso", icon: "target" }),
        ...item(s.can("team.manage"), { href: "/panel/equipo", label: "Equipo", icon: "team" }),
        ...item(s.can("locations.manage"), { href: "/panel/locales", label: "Locales", icon: "map" }),
        ...item(s.can("settings.manage") || s.can("billing.manage"), { href: "/panel/ajustes", label: "Ajustes", icon: "settings" }),
      ],
    },
  ];
  const groups = sections.filter((g) => g.items.length > 0);

  // Barra inferior del móvil: lo más usado por cada perfil (el resto, en «Más»)
  const all = groups.flatMap((g) => g.items);
  const pick = (...hrefs: string[]) => hrefs.map((h) => all.find((i) => i.href === h)).filter((i): i is NavItem => !!i);
  const tabs = s.role === "staff"
    ? pick("/panel/ventas/nueva", "/panel", "/panel/ventas", "/panel/productos")
    : pick("/panel", "/panel/ventas/nueva", "/panel/ventas", "/panel/caja");
  return { groups, tabs };
}
