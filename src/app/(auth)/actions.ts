"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { createAccount } from "@/lib/onboarding";
import { SECTORS } from "@/sectors";

export type FormState = { error?: string } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre"),
  email: z.string().trim().email("Email no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  businessName: z.string().trim().min(2, "Escribe el nombre de tu negocio"),
  sector: z.string().refine((s) => s in SECTORS, "Elige un sector"),
  withDemo: z.boolean(),
});

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
    businessName: form.get("businessName"),
    sector: form.get("sector"),
    withDemo: form.get("withDemo") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const exists = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (exists) return { error: "Ya existe una cuenta con ese email" };

  const { user, org } = await createAccount(parsed.data);
  await createSession(user.id, org.id);
  redirect("/panel");
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({
    where: { email },
    include: { memberships: { take: 1, orderBy: { id: "asc" } } },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Email o contraseña incorrectos" };
  }
  const membership = user.memberships[0];
  if (!membership) return { error: "Tu usuario no tiene ningún negocio asociado" };

  await createSession(user.id, membership.orgId);
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/panel") ? next : "/panel");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

const INVITE_DAYS = 14;

/** Invitación vigente (no aceptada y de menos de dos semanas) */
export async function findInvitation(token: string) {
  const inv = await db.invitation.findUnique({ where: { token }, include: { org: { select: { name: true } } } });
  if (!inv || inv.acceptedAt || Date.now() - inv.createdAt.getTime() > INVITE_DAYS * 86_400_000) return null;
  return inv;
}

/**
 * Acepta una invitación: si el email ya tiene cuenta, pide su contraseña; si no,
 * crea la cuenta con nombre y contraseña. Entra directamente en ese negocio.
 */
export async function acceptInvitation(token: string, _: FormState, form: FormData): Promise<FormState> {
  const inv = await findInvitation(token);
  if (!inv) return { error: "Esta invitación ya no es válida. Pide que te envíen otra." };
  const password = String(form.get("password") ?? "");
  let user = await db.user.findUnique({ where: { email: inv.email } });
  if (user) {
    if (!(await bcrypt.compare(password, user.passwordHash))) return { error: "La contraseña no es correcta" };
  } else {
    const name = String(form.get("name") ?? "").trim();
    if (name.length < 2) return { error: "Escribe tu nombre" };
    if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
    user = await db.user.create({ data: { name, email: inv.email, passwordHash: await bcrypt.hash(password, 10) } });
  }
  const userId = user.id;
  await db.$transaction([
    db.membership.upsert({
      where: { userId_orgId: { userId, orgId: inv.orgId } },
      create: { userId, orgId: inv.orgId, role: inv.role, locationIds: inv.locationIds },
      update: { role: inv.role, locationIds: inv.locationIds },
    }),
    db.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
  ]);
  await destroySession();
  await createSession(userId, inv.orgId);
  redirect("/panel");
}
