import {
  BarChart3, Box, Calculator, Heart, Home, Landmark, MapPin, Megaphone, Radar, Receipt, Settings, ShoppingBasket, Store, Target, Truck,
  UserRound, Users, Wallet, type LucideProps,
} from "lucide-react";
import type { IconName } from "@/lib/nav";

const ICONS: Record<IconName, React.ComponentType<LucideProps>> = {
  home: Home, pos: ShoppingBasket, receipt: Receipt, box: Box, users: UserRound, wallet: Wallet, radar: Radar, truck: Truck,
  calculator: Calculator, store: Store, megaphone: Megaphone, chart: BarChart3, heart: Heart, settings: Settings, team: Users,
  map: MapPin, target: Target, landmark: Landmark,
};

/** Iconos de trazo de 1,75 px, del mismo juego en toda la app */
export function NavIcon({ name, className = "h-[18px] w-[18px]" }: { name: IconName; className?: string }) {
  const C = ICONS[name];
  return <C className={className} strokeWidth={1.75} aria-hidden />;
}
