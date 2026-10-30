"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission, type PanelSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { asRole, invitableRoles, ROLE_INFO, type Role } from "@/lib/permissions";

export type InviteState = { error?: string; link?: string; email?: string } | undefined;
export type MemberState = { error?: string; ok?: boolean } | undefined;

/** Locales que se pueden asignar: solo los que ve quien asigna. La gestoría no tiene local. */
function pickLocations(s: PanelSession, role: Role, form: FormData) {
  if (role === "owner" || role === "accountant") return [];
  const allowed = new Set(s.locations.map((l) => l.id));
  const picked = form.getAll("locationIds").map(String).filter((id) => allowed.has(id));
  // Un gerente que no ve todos los locales solo puede dar acceso a los suyos
  if (picked.length === 0 && !s.can("locations.all")) return [...allowed];
  return picked.length === allowed.size && s.can("locations.all") ? [] : picked;
}

const inviteSchema = z.object({ email: z.string().trim().toLowerCase().email("Escribe un email válido"), role: z.string() });

export async function inviteMember(_: InviteState, form: FormData): Promise<InviteState> {
  const s = await requirePermission("team.manage");
  const parsed = inviteSchema.safeParse({ email: form.get("email"), role: form.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const role = asRole(parsed.data.role);
  if (!invitableRoles(s.role).includes(role)) return { error: `Tu perfil no puede invitar a un ${ROLE_INFO[role].name.toLowerCase()}.` };

  const already = await db.membership.findFirst({ where: { orgId: s.org.id, user: { email: parsed.data.email } } });
  if (already) return { error: "Esa persona ya está en el equipo." };

  const token = randomBytes(24).toString("base64url");
  const locationIds = pickLocations(s, role, form);
  await db.invitation.upsert({
    where: { orgId_email: { orgId: s.org.id, email: parsed.data.email } },
    create: { orgId: s.org.id, email: parsed.data.email, role, locationIds, token, invitedById: s.user.id },
    update: { role, locationIds, token, invitedById: s.user.id, acceptedAt: null, createdAt: new Date() },
  });
  revalidatePath("/panel/equipo");
  return { link: `/invitacion/${token}`, email: parsed.data.email };
}

export async function revokeInvitation(id: string) {
  const s = await requirePermission("team.manage");
  const inv = await db.invitation.findFirst({ where: { id, orgId: s.org.id, acceptedAt: null } });
  if (!inv || !invitableRoles(s.role).includes(asRole(inv.role))) return;
  await db.invitation.delete({ where: { id } });
  revalidatePath("/panel/equipo");
}

/** El miembro que se quiere tocar, si quien actúa puede gestionarlo */
async function manageable(s: PanelSession, membershipId: string) {
  const m = await db.membership.findFirst({ where: { id: membershipId, orgId: s.org.id } });
  if (!m || m.userId === s.user.id) return null;
  if (!invitableRoles(s.role).includes(asRole(m.role))) return null;
  // Un gerente solo gestiona a quien trabaja en alguno de sus locales
  if (!s.can("locations.all")) {
    const mine = new Set(s.locations.map((l) => l.id));
    if (m.locationIds.length === 0 || !m.locationIds.some((id) => mine.has(id))) return null;
  }
  return m;
}

export async function updateMember(membershipId: string, _: MemberState, form: FormData): Promise<MemberState> {
  const s = await requirePermission("team.manage");
  const m = await manageable(s, membershipId);
  if (!m) return { error: "No puedes cambiar a esta persona." };
  const role = asRole(String(form.get("role") ?? m.role));
  if (!invitableRoles(s.role).includes(role)) return { error: `Tu perfil no puede dar el perfil de ${ROLE_INFO[role].name.toLowerCase()}.` };
  await db.membership.update({ where: { id: m.id }, data: { role, locationIds: pickLocations(s, role, form) } });
  revalidatePath("/panel/equipo");
  return { ok: true };
}

export async function removeMember(membershipId: string) {
  const s = await requirePermission("team.manage");
  const m = await manageable(s, membershipId);
  if (!m) return;
  if (m.role === "owner" && (await db.membership.count({ where: { orgId: s.org.id, role: "owner" } })) <= 1) return;
  await db.membership.delete({ where: { id: m.id } });
  revalidatePath("/panel/equipo");
}
