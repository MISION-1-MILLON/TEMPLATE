import { Sidebar, type NavGroup } from "@/components/Sidebar";
import { requireSession } from "@/lib/auth";
import { getProgress } from "@/lib/game";
import { MODULES, planIncludes } from "@/lib/modules";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { org, user, sector } = await requireSession();
  const progress = await getProgress(org);
  const t = sector.terms;

  const toolBadge = (id: string) => {
    const m = MODULES.find((x) => x.id === id)!;
    if (m.status === "soon") return "Pronto";
    return planIncludes(org.plan, m.plan) ? undefined : m.plan;
  };

  // Tres secciones principales y, aparte, el resto de herramientas
  const groups: NavGroup[] = [
    {
      title: "Caja",
      items: [
        { href: "/panel", label: "Inicio", icon: "🏠" },
        { href: "/panel/ventas", label: "Mis ventas", icon: "🧾" },
        { href: "/panel/productos", label: t.products, icon: "📦" },
        { href: "/panel/clientes", label: t.customers, icon: "👥" },
        { href: "/panel/caja", label: "Mi dinero", icon: "💶" },
      ],
    },
    {
      title: "Mercado",
      items: [
        { href: "/panel/competencia", label: "Competencia", icon: "📊" },
        { href: "/panel/proveedores", label: "Proveedores", icon: "🚚" },
      ],
    },
    {
      title: "Más",
      items: [
        { href: "/panel/misiones", label: "Misiones", icon: "⭐" },
        { href: "/panel/precio", label: "Calcular precios", icon: "🧮", badge: toolBadge("precio") },
        { href: "/panel/tienda", label: `Mi ${t.store.toLowerCase()} online`, icon: "🏪", badge: toolBadge("tienda") },
        { href: "/panel/publica", label: "Redes sociales", icon: "📣", badge: toolBadge("publica") },
        { href: "/panel/mercado", label: "Estadísticas", icon: "📈", badge: toolBadge("mercado") },
        { href: "/panel/fideliza", label: "Fidelizar clientes", icon: "💜", badge: toolBadge("fideliza") },
        { href: "/panel/ajustes", label: "Ajustes", icon: "⚙️" },
      ],
    },
  ];

  const lvl = progress.level;
  return (
    <div className="min-h-screen">
      <Sidebar
        groups={groups}
        orgName={org.name}
        sectorName={sector.name}
        userName={user.name}
        level={{ level: lvl.level, name: lvl.name, pct: lvl.isMax ? 100 : Math.round((lvl.xpInLevel / lvl.xpForNext) * 100) }}
      />
      <main className="pb-28 lg:pb-0 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
