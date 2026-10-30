import { Shell } from "@/components/shell/Shell";
import { requireSession } from "@/lib/auth";
import { getProgress } from "@/lib/game";
import { buildNav } from "@/lib/nav";
import { ROLE_INFO } from "@/lib/permissions";

/** Iniciales del negocio para su avatar (sin «S.L.», paréntesis ni artículos) */
function initials(name: string) {
  const words = name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(la|el|los|las|del|de|s\.?l\.?|s\.?a\.?)$/i.test(w));
  return (words.slice(0, 2).map((w) => w[0]).join("") || name.slice(0, 2)).toUpperCase();
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const { org, user, role, locations, location, sector, can } = session;
  const { groups, tabs } = buildNav(session);

  // El juego, rediseñado: un indicador discreto para quien lleva el negocio
  let level = null;
  if (can("stats.view")) {
    const lvl = (await getProgress(org)).level;
    level = { level: lvl.level, name: lvl.name, pct: lvl.isMax ? 100 : Math.round((lvl.xpInLevel / lvl.xpForNext) * 100) };
  }

  const t = sector.terms;
  const actions = [
    ...(can("sales.create") ? [{ label: "Nueva venta", href: "/panel/ventas/nueva", hint: "Vender" }] : []),
    ...(can("products.manage") ? [{ label: `${t.productFeminine ? "Nueva" : "Nuevo"} ${t.product.toLowerCase()}`, href: "/panel/productos/nuevo" }] : []),
    ...(can("customers.manage") ? [{ label: `Nuevo ${t.customer.toLowerCase()}`, href: "/panel/clientes/nuevo" }] : []),
    ...(can("team.manage") ? [{ label: "Invitar a alguien al equipo", href: "/panel/equipo" }] : []),
    ...(can("sales.export") ? [{ label: "Exportar ventas (CSV)", href: "/panel/ventas/exportar" }] : []),
  ];

  return (
    <Shell
      groups={groups}
      tabs={tabs}
      orgName={org.name}
      orgInitials={initials(org.name)}
      roleName={ROLE_INFO[role].name}
      userName={user.name}
      locations={locations.map((l) => ({ id: l.id, name: l.name }))}
      locationId={location?.id ?? null}
      level={level}
      actions={actions}
    >
      {children}
    </Shell>
  );
}
