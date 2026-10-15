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
