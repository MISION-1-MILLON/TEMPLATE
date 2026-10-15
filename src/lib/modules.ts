/**
 * Las seis herramientas de la suite. Todas leen y escriben sobre los mismos
 * datos (productos, clientes, ventas), igual que el resto del núcleo.
 */
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
}

export const MODULES: AppModule[] = [
  {
    id: "gestion",
    name: "Gestión",
    summary: "Stock, clientes, ventas, caja y facturas",
    description: "El corazón del negocio. Lo que vendes descuenta stock, queda en la ficha del cliente, entra en caja y genera su factura.",
    href: "/panel",
    status: "live",
    plan: "free",
  },
  {
    id: "precio",
    name: "Precio",
    summary: "Cuánto cobrar, con tus márgenes reales",
    description: "Calcula el precio óptimo a partir de coste, IVA y margen objetivo, y detecta productos que te están dejando poco.",
    href: "/panel/precio",
    status: "live",
    plan: "free",
  },
  {
    id: "tienda",
    name: "Tienda",
    summary: "Tu catálogo o carta online, siempre al día",
    description: "Una página pública con tus productos o tu carta, alimentada por el stock real. Compártela con un enlace o un QR.",
    href: "/panel/tienda",
    status: "live",
    plan: "free",
  },
  {
    id: "publica",
    name: "Publica",
    summary: "Posts para redes en un clic",
    description: "Genera textos para Instagram, WhatsApp o Wallapop a partir de la ficha del producto, con el tono de tu sector.",
    href: "/panel/publica",
    status: "live",
    plan: "pro",
  },
  {
    id: "mercado",
    name: "Mercado",
    summary: "Qué se vende, a qué precio y cuándo",
    description: "Analítica de tus ventas: productos estrella, horas punta, rotación de stock y tendencias.",
    href: "/panel/mercado",
    status: "live",
    plan: "pro",
  },
  {
    id: "fideliza",
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
    features: ["Hasta 50 productos", "Ventas y facturas ilimitadas", "Tienda / carta online", "Calculadora de precios", "1 usuario"],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 29,
    blurb: "Para negocios que quieren crecer.",
    features: ["Productos ilimitados", "Todo lo de Gratis", "Publica: posts para redes", "Mercado: analítica de ventas", "Hasta 5 usuarios", "Personalización de sector"],
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
