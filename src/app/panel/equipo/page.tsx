import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmButton } from "@/components/forms";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { asRole, invitableRoles, ROLE_INFO } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { removeMember, revokeInvitation } from "./actions";
import { CopyLink, InviteForm, MemberEditor } from "./TeamForms";

export const metadata = { title: "Equipo" };

const ORDER = { owner: 0, manager: 1, staff: 2, accountant: 3 };

export default async function TeamPage() {
  const s = await requirePagePermission("team.manage");
  const { org, user, locations, role: myRole } = s;
  const [members, invitations] = await Promise.all([
    db.membership.findMany({ where: { orgId: org.id }, include: { user: { select: { name: true, email: true } } } }),
    db.invitation.findMany({ where: { orgId: org.id, acceptedAt: null }, orderBy: { createdAt: "desc" } }),
  ]);
  const roles = invitableRoles(myRole).map((id) => ({ id, ...ROLE_INFO[id] }));
  const names = new Map(locations.map((l) => [l.id, l.name]));
  const mine = new Set(locations.map((l) => l.id));
  const canTouch = (m: (typeof members)[number]) =>
    m.userId !== user.id &&
    invitableRoles(myRole).includes(asRole(m.role)) &&
    (s.can("locations.all") || m.locationIds.some((id) => mine.has(id)));
  const where = (ids: string[], role: string) =>
    role === "accountant" ? "Toda la empresa" : ids.length === 0 ? (locations.length > 1 ? "Todos los locales" : "") : ids.map((id) => names.get(id)).filter(Boolean).join(", ");
  const sorted = [...members].sort((a, b) => ORDER[asRole(a.role)] - ORDER[asRole(b.role)] || a.user.name.localeCompare(b.user.name));
  const owners = members.filter((m) => m.role === "owner").length;
  const opts = locations.map((l) => ({ id: l.id, name: l.name }));

  return (
    <>
      <PageHeader title="Equipo" subtitle="Cada persona entra con su perfil y solo ve lo que necesita para su trabajo." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="card-header card-title">{members.length} {members.length === 1 ? "persona" : "personas"}</h2>
            <ul className="divide-y divide-slate-100">
              {sorted.map((m) => {
                const r = asRole(m.role);
                const editable = canTouch(m);
                const row = (
                  <div className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                      {m.user.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{m.user.name}{m.userId === user.id && <span className="font-normal text-slate-500"> · tú</span>}</span>
                      <span className="block truncate text-xs text-slate-500">{[m.user.email, where(m.locationIds, r)].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className={r === "owner" ? "badge-brand" : "badge-neutral"}>{ROLE_INFO[r].name}</span>
                    {editable && <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out group-open:rotate-180" strokeWidth={1.75} />}
                  </div>
                );
                return (
                  <li key={m.id}>
                    {editable ? (
                      <details className="group">
                        <summary className="cursor-pointer list-none hover:bg-slate-50 [&::-webkit-details-marker]:hidden">{row}</summary>
                        <div className="animate-fade space-y-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                          <MemberEditor membershipId={m.id} role={r} locationIds={m.locationIds} roles={roles} locations={opts} />
                          {!(r === "owner" && owners <= 1) && (
                            <form action={removeMember.bind(null, m.id)} className="border-t border-slate-200 pt-3">
                              <ConfirmButton className="btn-ghost btn-sm -ml-2 text-negative" message={`¿Quitar a ${m.user.name} del equipo? Dejará de poder entrar. Sus ventas se conservan.`}>Quitar del equipo</ConfirmButton>
                            </form>
                          )}
                        </div>
                      </details>
                    ) : row}
                  </li>
                );
              })}
            </ul>
          </section>

          {invitations.length > 0 && (
            <section className="card">
              <h2 className="card-header card-title">Invitaciones pendientes</h2>
              <ul className="divide-y divide-slate-100">
                {invitations.map((i) => {
                  const r = asRole(i.role);
                  const mineToManage = invitableRoles(myRole).includes(r);
                  return (
                    <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{i.email}</span>
                        <span className="block truncate text-xs text-slate-500">{ROLE_INFO[r].name} · enviada el {formatDate(i.createdAt)}</span>
                      </span>
                      {mineToManage && (
                        <span className="flex items-center gap-1">
                          <CopyLink path={`/invitacion/${i.token}`} />
                          <form action={revokeInvitation.bind(null, i.id)}>
                            <ConfirmButton className="btn-ghost btn-sm text-negative" message="¿Anular esta invitación? El enlace dejará de funcionar.">Anular</ConfirmButton>
                          </form>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="card p-5 lg:sticky lg:top-8">
          <h2 className="card-title">Invitar a alguien</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500">Crea un enlace personal; al abrirlo, la persona elige su contraseña y entra con el perfil que le des.</p>
          <InviteForm roles={roles} locations={opts} />
        </aside>
      </div>
    </>
  );
}
