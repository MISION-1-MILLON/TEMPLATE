"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { readAttributes } from "@/lib/attributes";
import { db } from "@/lib/db";

export type CustomerFormState = { error?: string } | undefined;

export async function saveCustomer(customerId: string | null, _: CustomerFormState, form: FormData): Promise<CustomerFormState> {
  const { org, sector } = await requireSession();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio" };

  const str = (k: string) => String(form.get(k) ?? "").trim() || null;
  const data = {
    name,
    email: str("email"),
    phone: str("phone"),
    taxId: str("taxId"),
    address: str("address"),
    notes: str("notes"),
    attributes: readAttributes(form, sector.customerFields) as Prisma.InputJsonValue,
  };

  if (customerId) {
    const res = await db.customer.updateMany({ where: { id: customerId, orgId: org.id }, data });
    if (res.count === 0) return { error: "Cliente no encontrado" };
  } else {
    await db.customer.create({ data: { ...data, orgId: org.id } });
  }
  revalidatePath("/panel/clientes");
  redirect("/panel/clientes");
}

export async function deleteCustomer(customerId: string) {
  const { org } = await requireSession();
  await db.customer.deleteMany({ where: { id: customerId, orgId: org.id } });
  revalidatePath("/panel/clientes");
  redirect("/panel/clientes");
}
