import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from "./session";
import { getSector } from "@/sectors";

export async function createSession(uid: string, oid: string) {
  const token = await signSession({ uid, oid });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Devuelve usuario + negocio activos o redirige a /acceder.
 * Todas las consultas del panel deben filtrar por `org.id`.
 */
export const requireSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) redirect("/salir");

  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: session.uid, orgId: session.oid } },
    include: { user: true, org: true },
  });
  if (!membership) redirect("/salir"); // cookie válida pero sin acceso: limpiar

  return {
    user: membership.user,
    org: membership.org,
    role: membership.role,
    sector: getSector(membership.org.sector),
  };
});

export async function getOptionalSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}
