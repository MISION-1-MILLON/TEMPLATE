"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  badge?: string;
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export function Sidebar({ groups, orgName, sectorName, userName }: { groups: NavGroup[]; orgName: string; sectorName: string; userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Activo = el enlace más específico que coincide (así /panel/ventas/nueva no marca también "Ventas")
  const activeHref = groups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {groups.map((g, i) => (
        <div key={i}>
          {g.title && <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{g.title}</p>}
          <ul className="space-y-0.5">
            {g.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive(item.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {item.label}
                  {item.badge && <span className="badge bg-slate-100 text-[10px] uppercase text-slate-500">{item.badge}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <div className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Logo href="/panel" />
        <button className="btn-ghost" onClick={() => setOpen((o) => !o)} aria-label="Abrir menú">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <Logo href="/panel" />
          <p className="mt-3 truncate text-sm font-semibold">{orgName}</p>
          <p className="truncate text-xs text-slate-500">{sectorName}</p>
        </div>
        {nav}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
          <span className="truncate text-slate-600">{userName}</span>
          <a href="/salir" className="text-slate-500 hover:text-red-600">Salir</a>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
