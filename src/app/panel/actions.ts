"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";

export async function setDailyGoal(form: FormData) {
  const { org } = await requireSession();
  const raw = String(form.get("goal") ?? "").trim();
  const cents = raw ? parseMoney(raw) : 0;
  await db.organization.update({ where: { id: org.id }, data: { dailyGoalCents: cents > 0 ? cents : null } });
  revalidatePath("/panel");
}
