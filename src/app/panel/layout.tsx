import { Sidebar, type NavGroup } from "@/components/Sidebar";
import { requireSession } from "@/lib/auth";
import { MODULES, planIncludes } from "@/lib/modules";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { org, user, sector } = await requireSession();
  const t = sector.terms;

  const toolBadge = (id: string) => {
    const m = MODULES.find((x) => x.id === id)!;
    if (m.status === "soon") return "Pronto";
    return planIncludes(org.plan, m.plan) ? undefined : m.plan;
  };

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/panel", label: "Inicio" },
        { href: "/panel/ventas/nueva", label: "Nueva venta" },
      ],
    },
    {
      title: "Gestión",
      items: [
        { href: "/panel/ventas", label: "Ventas y facturas" },
        { href: "/panel/productos", label: t.products },
        { href: "/panel/clientes", label: t.customers },
        { href: "/panel/caja", label: "Caja" },
      ],
    },
    {
      title: "Herramientas",
      items: ["precio", "tienda", "publica", "mercado", "fideliza"].map((id) => {
        const m = MODULES.find((x) => x.id === id)!;
        return { href: m.href, label: id === "tienda" ? t.store : m.name, badge: toolBadge(id) };
      }),
    },
    { items: [{ href: "/panel/ajustes", label: "Ajustes" }] },
  ];

  return (
    <div className="min-h-screen">
      <Sidebar groups={groups} orgName={org.name} sectorName={sector.name} userName={user.name} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
