import { UpgradeNotice } from "@/components/UpgradeNotice";
import { getModule } from "@/lib/modules";

export const metadata = { title: "Fideliza" };

export default function LoyaltyPage() {
  return <UpgradeNotice module={getModule("fideliza")} />;
}
