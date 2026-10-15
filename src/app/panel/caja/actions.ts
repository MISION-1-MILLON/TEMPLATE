"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { PAYMENT_METHODS } from "@/lib/utils";

export async function addCashMovement(form: FormData) {
  const { org } = await requireSession();
  const amount = parseMoney(form.get("amount"));
  const concept = String(form.get("concept") ?? "").trim();
  if (!amount || !concept) return;
  const sign = form.get("type") === "out" ? -1 : 1;
  const method = String(form.get("method") ?? "cash");
  await db.cashMovement.create({
    data: { orgId: org.id, amountCents: sign * Math.abs(amount), concept, method: method in PAYMENT_METHODS ? method : "cash" },
  });
  revalidatePath("/panel/caja");
}
