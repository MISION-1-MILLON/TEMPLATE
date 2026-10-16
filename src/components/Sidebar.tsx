"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}
export interface LevelInfo {
  level: number;
  name: string;
  pct: number;
}

export function Sidebar({
  groups,
  orgName,
  sectorName,
  userName,
  level,
}: {
  groups: NavGroup[];
  orgName: string;
  sectorName: string;
  userName: string;
  level: LevelInfo;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  // Activo = el enlace más específico que coincide (así /panel/ventas/nueva no marca también "Ventas")
  // "/panel/ventas/nueva" tiene su propio botón (VENDER): se incluye para que no marque "Mis ventas"
  const allHrefs = [...groups.flatMap((g) => g.items.map((i) => i.href)), "/panel/ventas/nueva"];
  const activeHref = allHrefs
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;

  const levelWidget = (
    <Link href="/panel/misiones" className="mx-3 mt-3 flex items-center gap-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100 transition hover:bg-amber-100">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-sm font-black text-amber-950">
        {level.level}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-amber-950">{level.name}</span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-amber-200">
          <span className="block h-full rounded-full bg-amber-500" style={{ width: `${level.pct}%` }} />
        </span>
      </span>
    </Link>
  );

  return (
    <>
      {/* Cabecera móvil */}
      <div className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Logo href="/panel" />
        <Link href="/panel/misiones" className="flex items-center gap-2 rounded-full bg-amber-50 py-1 pl-1 pr-3 text-sm font-bold text-amber-900 ring-1 ring-amber-100">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-xs font-black text-amber-950">{level.level}</span>
          {level.name}
        </Link>
      </div>

      {/* Menú lateral (en móvil se abre desde "Más") */}
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:z-40 lg:w-64 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <Logo href="/panel" />
          <p className="mt-3 truncate text-sm font-semibold">{orgName}</p>
          <p className="truncate text-xs text-slate-500">{sectorName}</p>
        </div>
        {levelWidget}
        <div className="px-3 pt-3">
          <Link href="/panel/ventas/nueva" className="btn-primary display w-full py-3 text-base uppercase">
            🛒 Vender
          </Link>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((g, i) => (
            <div key={i}>
              {g.title && <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{g.title}</p>}
              <ul className="space-y-0.5">
                {g.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                        isActive(item.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      <span className="w-5 text-center text-base">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && <span className="badge bg-slate-100 text-[10px] uppercase text-slate-500">{item.badge}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
          <span className="truncate text-slate-600">{userName}</span>
          <a href="/salir" className="text-slate-500 hover:text-red-600">Salir</a>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Barra inferior móvil, como una app */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 items-end text-[11px] font-medium text-slate-500">
          <BottomLink href="/panel" icon="🏠" label="Inicio" active={pathname === "/panel"} />
          <BottomLink href="/panel/competencia" icon="📊" label="Competencia" active={pathname.startsWith("/panel/competencia")} />
          <Link href="/panel/ventas/nueva" className="-mt-6 flex flex-col items-center gap-1 pb-2">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-2xl text-white shadow-lg ring-4 ring-white">🛒</span>
            <span className="font-bold text-brand-700">VENDER</span>
          </Link>
          <BottomLink href="/panel/proveedores" icon="🚚" label="Proveedores" active={pathname.startsWith("/panel/proveedores")} />
          <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2">
            <span className="text-xl">☰</span>
            Más
          </button>
        </div>
      </nav>
    </>
  );
}

function BottomLink({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-0.5 py-2", active && "text-brand-700")}>
      <span className="text-xl">{icon}</span>
      <span className="max-w-full truncate px-1">{label}</span>
    </Link>
  );
}
