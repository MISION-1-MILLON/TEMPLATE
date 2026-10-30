import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "./db";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from "./session";
import { asRole, can, PermissionError, type Permission } from "./permissions";
import { getSector } from "@/sectors";

/** Local activo del panel (se cambia desde la barra lateral) */
export const LOCATION_COOKIE = "nexo_loc";

export async function createSession(uid: string, oid: string) {
  const token = await signSession({ uid, oid });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(LOCATION_COOKIE);
}

/**
 * Devuelve usuario, negocio, rol y locales, o redirige a /acceder.
 * Todas las consultas del panel deben filtrar por `org.id` (y por `location.id`
 * cuando el dato es de un local: ventas, stock y caja).
 */
export const requireSession = cache(async () => {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/salir");

  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: session.uid, orgId: session.oid } },
    include: { user: true, org: { include: { locations: { where: { active: true }, orderBy: { createdAt: "asc" } } } } },
  });
  if (!membership) redirect("/salir"); // cookie válida pero sin acceso: limpiar

  const role = asRole(membership.role);
  const { locations: allLocations, ...org } = membership.org;
  // Locales que puede ver: los asignados, o todos si no tiene ninguno asignado o su rol lo permite
  const locations = can(role, "locations.all") || membership.locationIds.length === 0
    ? allLocations
    : allLocations.filter((l) => membership.locationIds.includes(l.id));
  const wanted = jar.get(LOCATION_COOKIE)?.value;
  const location = locations.find((l) => l.id === wanted) ?? locations[0] ?? null;

  return {
    user: membership.user,
    org,
    role,
    locations,
    /** Local activo; null solo si el negocio aún no tiene ninguno */
    location,
    sector: getSector(org.sector),
    can: (p: Permission) => can(role, p),
  };
});

export type PanelSession = Awaited<ReturnType<typeof requireSession>>;

/** Para server actions: lanza PermissionError si el rol no puede hacerlo */
export async function requirePermission(permission: Permission) {
  const s = await requireSession();
  if (!s.can(permission)) throw new PermissionError();
  return s;
}

/** Para páginas: 404 si el rol no puede verla (no se anuncia lo que no puede usar) */
export async function requirePagePermission(...permissions: Permission[]) {
  const s = await requireSession();
  if (!permissions.some((p) => s.can(p))) notFound();
  return s;
}

/** Local activo obligatorio (vender, stock, caja) */
export async function requireLocation() {
  const s = await requireSession();
  if (!s.location) throw new PermissionError("Este negocio aún no tiene ningún local. Crea uno en Ajustes.");
  return { ...s, location: s.location };
}

export async function getOptionalSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}
