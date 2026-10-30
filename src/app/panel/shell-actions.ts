"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCATION_COOKIE, requireSession } from "@/lib/auth";

/** Cambia el local activo. Solo a uno de los locales que el perfil puede ver. */
export async function switchLocation(locationId: string) {
  const { locations } = await requireSession();
  if (!locations.some((l) => l.id === locationId)) return;
  (await cookies()).set(LOCATION_COOKIE, locationId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/panel", "layout");
}
