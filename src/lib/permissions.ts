/**
 * Quién puede hacer qué. Es la única fuente de verdad: el servidor lo comprueba
 * en cada acción y página (`requirePermission`), y la interfaz solo esconde lo
 * que el rol no puede usar. La tabla legible está en docs/REDISENO.md.
 */
export type Role = "owner" | "manager" | "staff" | "accountant";

export const ROLES: Role[] = ["owner", "manager", "staff", "accountant"];

export const ROLE_INFO: Record<Role, { name: string; summary: string }> = {
  owner: { name: "Dueño", summary: "Ve y decide todo, incluido el beneficio, el equipo y el plan." },
  manager: { name: "Gerente", summary: "Lleva el día a día de sus locales: ventas, caja, stock, equipo y proveedores. No ve beneficio ni márgenes." },
  staff: { name: "Empleado", summary: "Vende en el mostrador, aplica descuentos y consulta o ajusta el stock." },
  accountant: { name: "Gestoría", summary: "Consulta y exporta ventas, facturas, gastos e IVA. No puede cambiar nada." },
};

export type Permission =
  | "sales.create" // vender y cobrar
  | "sales.discount" // descuentos en el ticket
  | "sales.cancel" // anular ventas
  | "sales.viewAll" // ver ventas de todos (si no, solo las suyas de hoy)
  | "sales.export" // exportar ventas y facturas
  | "products.manage" // crear y editar productos
  | "stock.view"
  | "stock.adjust" // recuentos, mermas, entradas
  | "customers.manage"
  | "cash.view" // movimientos de caja
  | "cash.manage" // apuntar entradas y gastos
  | "finance.profit" // beneficio, márgenes y costes
  | "finance.tax" // gastos e IVA
  | "market.use" // competencia y proveedores
  | "pricing.use" // calculadora de precios (enseña márgenes)
  | "store.manage" // tienda online
  | "publish.use" // posts para redes
  | "stats.view"
  | "team.manage" // invitar y quitar miembros
  | "locations.manage"
  | "settings.manage" // herramientas, sector y datos del negocio
  | "billing.manage" // plan y suscripción
  | "locations.all"; // ver y cambiar a cualquier local aunque no esté asignado

const GRANTS: Record<Role, Permission[]> = {
  owner: [
    "sales.create", "sales.discount", "sales.cancel", "sales.viewAll", "sales.export",
    "products.manage", "stock.view", "stock.adjust", "customers.manage", "cash.view", "cash.manage",
    "finance.profit", "finance.tax", "market.use", "pricing.use", "store.manage", "publish.use", "stats.view",
    "team.manage", "locations.manage", "settings.manage", "billing.manage", "locations.all",
  ],
  manager: [
    "sales.create", "sales.discount", "sales.cancel", "sales.viewAll", "sales.export",
    "products.manage", "stock.view", "stock.adjust", "customers.manage", "cash.view", "cash.manage",
    "market.use", "store.manage", "publish.use", "stats.view", "team.manage",
  ],
  staff: ["sales.create", "sales.discount", "stock.view", "stock.adjust"],
  accountant: ["sales.viewAll", "sales.export", "cash.view", "finance.tax", "locations.all"],
};

export function asRole(value: string | null | undefined): Role {
  if (value === "admin") return "manager"; // nombre anterior
  return (ROLES as string[]).includes(value ?? "") ? (value as Role) : "staff";
}

export function can(role: Role | string, permission: Permission): boolean {
  return GRANTS[asRole(role)].includes(permission);
}

/** Roles que este rol puede invitar o gestionar */
export function invitableRoles(role: Role): Role[] {
  if (role === "owner") return ["manager", "staff", "accountant", "owner"];
  if (role === "manager") return ["staff"];
  return [];
}

export class PermissionError extends Error {
  constructor(message = "Tu perfil no puede hacer esto. Pídeselo al dueño o al gerente.") {
    super(message);
  }
}
