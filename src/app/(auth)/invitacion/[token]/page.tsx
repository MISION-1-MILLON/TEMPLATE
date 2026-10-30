import Link from "next/link";
import { db } from "@/lib/db";
import { asRole, ROLE_INFO } from "@/lib/permissions";
import { findInvitation } from "../../actions";
import { AcceptForm } from "./AcceptForm";

export const metadata = { title: "Invitación" };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await findInvitation(token);
  if (!inv) {
    return (
      <div className="card w-full max-w-sm p-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Esta invitación ya no vale</h1>
        <p className="mt-2 text-sm text-slate-500">Puede que ya se haya usado o que haya caducado. Pide a quien te invitó que te mande un enlace nuevo.</p>
        <Link href="/acceder" className="btn-secondary mt-5 w-full">Ir a acceder</Link>
      </div>
    );
  }
  const role = ROLE_INFO[asRole(inv.role)];
  const exists = Boolean(await db.user.findUnique({ where: { email: inv.email }, select: { id: true } }));
  return (
    <div className="card w-full max-w-sm p-6">
      <p className="text-sm text-slate-500">Te han invitado a</p>
      <h1 className="text-2xl font-semibold tracking-tight">{inv.org.name}</h1>
      <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5">
        <p className="text-sm font-medium">Como {role.name.toLowerCase()}</p>
        <p className="mt-0.5 text-xs text-slate-500">{role.summary}</p>
      </div>
      <AcceptForm token={token} email={inv.email} exists={exists} />
    </div>
  );
}
