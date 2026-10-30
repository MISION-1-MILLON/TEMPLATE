/**
 * Las seis herramientas de la suite. Todas leen y escriben sobre los mismos
 * datos (productos, clientes, ventas), igual que el resto del núcleo.
 */
import type { Permission } from "./permissions";
import { getSector } from "@/sectors";

export type ModuleStatus = "live" | "soon";

export interface AppModule {
  id: string;
  name: string;
  summary: string;
  description: string;
  href: string;
  status: ModuleStatus;
  /** Plan mínimo en el que se incluye */
  plan: "free" | "pro" | "business";
  /** Permiso que necesita el rol para verla */
  permission: Permission;
  /** La caja es el núcleo: no se puede apagar */
  core?: boolean;
}

export const MODULES: AppModule[] = [
  {
    id: "gestion",
    permission: "sales.create",
    core: true,
    name: "Caja",
    summary: "Vende, cobra y factura en segundos",
    description: "Tu caja registradora: lo que vendes descuenta stock, queda en la ficha del cliente, entra en tu dinero del día y genera su factura.",
    href: "/panel",
    status: "live",
    plan: "free",
  },
  {
    id: "competencia",
    permission: "market.use",
    name: "Competencia",
    summary: "¿Estás caro o barato?",
    description: "Buscamos solos en internet a cuánto venden lo mismo que tú y te decimos si estás por encima o por debajo del mercado.",
    href: "/panel/competencia",
    status: "live",
    plan: "free",
  },
  {
    id: "proveedores",
    permission: "market.use",
    name: "Proveedores",
    summary: "Compra siempre al mejor precio",
    description: "Detectamos lo que compras y te enseñamos un ranking de proveedores del más barato al más caro, con lo que ahorrarías.",
    href: "/panel/proveedores",
    status: "live",
    plan: "free",
  },
  {
    id: "precio",
    permission: "pricing.use",
    name: "Calculadora de precios",
    summary: "Cuánto cobrar, con tus márgenes reales",
    description: "Calcula el precio óptimo a partir de coste, IVA y margen objetivo, y detecta productos que te están dejando poco.",
    href: "/panel/precio",
    status: "live",
    plan: "free",
  },
  {
    id: "tienda",
    permission: "store.manage",
    name: "Tienda",
    summary: "Tu catálogo o carta online, siempre al día",
    description: "Una página pública con tus productos o tu carta, alimentada por el stock real. Compártela con un enlace o un QR.",
    href: "/panel/tienda",
    status: "live",
    plan: "free",
  },
  {
    id: "publica",
    permission: "publish.use",
    name: "Publica",
    summary: "Posts para redes en un clic",
    description: "Genera textos para Instagram, WhatsApp o Wallapop a partir de la ficha del producto, con el tono de tu sector.",
    href: "/panel/publica",
    status: "live",
    plan: "pro",
  },
  {
    id: "mercado",
    permission: "stats.view",
    name: "Estadísticas",
    summary: "Qué se vende, a qué precio y cuándo",
    description: "Analítica de tus ventas: productos estrella, horas punta, rotación de stock y tendencias.",
    href: "/panel/mercado",
    status: "live",
    plan: "pro",
  },
  {
    id: "fideliza",
    permission: "customers.manage",
    name: "Fideliza",
    summary: "Clientes que vuelven",
    description: "Segmenta clientes, lanza campañas por WhatsApp o email y gestiona cupones y puntos.",
    href: "/panel/fideliza",
    status: "soon",
    plan: "business",
  },
];

export interface Plan {
  id: "free" | "pro" | "business";
  name: string;
  priceMonthly: number;
  blurb: string;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratis",
    priceMonthly: 0,
    blurb: "Para empezar a ordenar el negocio.",
    features: ["Hasta 50 productos", "Ventas y facturas ilimitadas", "Revisión mensual gratis de competencia y proveedores", "Tienda / carta online", "Equipo con perfiles: gerente, empleados y gestoría"],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 29,
    blurb: "Para negocios que quieren crecer.",
    features: ["Productos ilimitados", "Todo lo de Gratis", "Publica: posts para redes", "Estadísticas de ventas", "Personalización de sector"],
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 79,
    blurb: "Varios locales y necesidades a medida.",
    features: ["Todo lo de Pro", "Fideliza: campañas y cupones", "Varios locales", "Campos y flujos a medida", "Soporte prioritario y onboarding"],
  },
];

const PLAN_RANK = { free: 0, pro: 1, business: 2 } as const;

export function planIncludes(orgPlan: string, required: Plan["id"]) {
  return (PLAN_RANK[orgPlan as Plan["id"]] ?? 0) >= PLAN_RANK[required];
}

export function getModule(id: string) {
  return MODULES.find((m) => m.id === id)!;
}

/** Herramientas que el sector enciende al darse de alta (el dueño las cambia en Ajustes) */
export function defaultModulesFor(sectorId: string): string[] {
  const sector = getSector(sectorId);
  return MODULES.filter((m) => m.status === "live" && (sector.modules ? sector.modules.includes(m.id) || m.core : true)).map((m) => m.id);
}

/** ¿Está encendida en este negocio? (la caja siempre lo está) */
export function moduleEnabled(org: { modules: string[] }, id: string) {
  const m = getModule(id);
  return !!m && (m.core || org.modules.includes(id));
}
