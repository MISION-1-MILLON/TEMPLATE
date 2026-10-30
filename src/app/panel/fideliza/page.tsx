import { UpgradeNotice } from "@/components/UpgradeNotice";
import { requirePagePermission } from "@/lib/auth";
import { getModule } from "@/lib/modules";

export const metadata = { title: "Fidelizar" };

export default async function LoyaltyPage() {
  const { can } = await requirePagePermission("customers.manage");
  return <UpgradeNotice module={getModule("fideliza")} canUpgrade={can("billing.manage")} />;
}
