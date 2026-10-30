"use server";

import { revalidatePath } from "next/cache";
import { requireLocation } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { PAYMENT_METHODS } from "@/lib/utils";

export async function addCashMovement(form: FormData) {
  const { org, location, can } = await requireLocation();
  if (!can("cash.manage")) throw new PermissionError();
  const amount = parseMoney(form.get("amount"));
  const concept = String(form.get("concept") ?? "").trim();
  if (!amount || !concept) return;
  const sign = form.get("type") === "out" ? -1 : 1;
  const method = String(form.get("method") ?? "cash");
  await db.cashMovement.create({
    data: { orgId: org.id, locationId: location.id, amountCents: sign * Math.abs(amount), concept, method: method in PAYMENT_METHODS ? method : "cash" },
  });
  revalidatePath("/panel/caja");
}
