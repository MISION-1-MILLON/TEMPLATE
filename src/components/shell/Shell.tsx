"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronsUpDown, LogOut, Menu, Moon, Search, Sun, X } from "lucide-react";
import type { NavGroup, NavItem } from "@/lib/nav";
import { NavIcon } from "./Icon";
import { switchLocation } from "@/app/panel/shell-actions";
import { cn } from "@/lib/utils";

export interface ShellProps {
  groups: NavGroup[];
  tabs: NavItem[];
  orgName: string;
  orgInitials: string;
  roleName: string;
  userName: string;
  locations: Array<{ id: string; name: string }>;
  locationId: string | null;
  /** Progreso del negocio (solo perfiles que lo ven) */
  level: { level: number; name: string; pct: number } | null;
  /** Acciones rápidas de la paleta de comandos */
  actions: Array<{ label: string; href: string; hint?: string }>;
  children: React.ReactNode;
}

/** El enlace más específico que coincide con la ruta es el activo */
function useActive(items: NavItem[]) {
  const pathname = usePathname();
  const active = items
    .map((i) => i.href)
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
  return (href: string) => href === active;
}

export function Shell(p: ShellProps) {
  const allItems = useMemo(() => p.groups.flatMap((g) => g.items), [p.groups]);
  const isActive = useActive(allItems);
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const [palette, setPalette] = useState(false);
  useEffect(() => { setMore(false); setPalette(false); }, [pathname]);

  // ⌘K / Ctrl+K abre la paleta de comandos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const location = p.locations.find((l) => l.id === p.locationId);

  const navList = (
    <nav className="flex flex-col gap-5" aria-label="Secciones">
      {p.groups.map((g, gi) => (
        <div key={gi}>
          {g.title && <p className="mb-1 px-2.5 text-xs font-medium text-slate-500">{g.title}</p>}
          <ul className="space-y-px">
            {g.items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={isActive(i.href) ? "page" : undefined}
                  className={cn(
                    "group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
                    isActive(i.href) ? "bg-slate-200/70 font-medium text-ink" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
                  )}
                >
                  <NavIcon name={i.icon} className={cn("h-[17px] w-[17px] shrink-0", isActive(i.href) ? "text-brand-600" : "text-slate-500 group-hover:text-slate-700")} />
                  <span className="truncate">{i.label}</span>
                  {i.badge && <span className="ml-auto rounded px-1 text-2xs font-medium text-slate-500 ring-1 ring-slate-200">{i.badge}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen">
      {/* ── Barra lateral (escritorio) ── */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-slate-50 lg:flex">
        <div className="space-y-2 p-3">
          <Workspace {...p} />
          <LocationPicker locations={p.locations} current={location} />
          <button type="button" onClick={() => setPalette(true)} className="flex h-8 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-500 transition-colors duration-150 hover:border-slate-300 hover:text-slate-700">
            <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Buscar o ir a…
            <span className="ml-auto flex gap-0.5"><kbd className="kbd">⌘</kbd><kbd className="kbd">K</kbd></span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2">{navList}</div>
        <Footer {...p} />
      </aside>

      {/* ── Cabecera (móvil) ── */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-canvas/90 px-4 backdrop-blur lg:hidden">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-xs font-semibold text-canvas">{p.orgInitials}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{p.orgName}</p>
          <p className="truncate text-xs leading-tight text-slate-500">{location ? `${location.name} · ${p.roleName}` : p.roleName}</p>
        </div>
        <button type="button" className="btn-icon" onClick={() => setPalette(true)} aria-label="Buscar">
          <Search className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </header>

      <main className="pb-24 lg:pb-0 lg:pl-60">
        {/* El TPV ocupa todo el ancho: el ticket va pegado al borde */}
        <div className={cn("px-4 py-6 sm:px-6 lg:py-8", pathname === "/panel/ventas/nueva" ? "lg:pl-8 lg:pr-0" : "mx-auto max-w-6xl lg:px-10")}>{p.children}</div>
      </main>

      {/* ── Barra inferior (móvil): lo más usado por el perfil ── */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${p.tabs.length + 1}, minmax(0, 1fr))` }} aria-label="Accesos principales">
        {p.tabs.map((t) => (
          <Link key={t.href} href={t.href} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors duration-150 active:scale-95", isActive(t.href) ? "text-ink" : "text-slate-500")}>
            <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors duration-200", isActive(t.href) && "bg-brand-100 text-brand-700")}>
              <NavIcon name={t.icon} className="h-5 w-5" />
            </span>
            <span className="max-w-full truncate px-1">{t.label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => setMore(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-slate-500 active:scale-95">
          <span className="grid h-7 w-12 place-items-center"><Menu className="h-5 w-5" strokeWidth={1.75} /></span>
          Más
        </button>
      </nav>

      {/* ── «Más» (móvil): hoja que sube con la curva de cajón ── */}
      {more && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="animate-fade absolute inset-0 bg-ink/30" aria-label="Cerrar menú" onClick={() => setMore(false)} />
          <div className="animate-sheet absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
            <div className="mb-4 flex items-center justify-between">
              <Workspace {...p} />
              <button type="button" className="btn-icon" onClick={() => setMore(false)} aria-label="Cerrar"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-4"><LocationPicker locations={p.locations} current={location} /></div>
            {navList}
            <div className="mt-4 border-t border-slate-200 pt-3"><Footer {...p} compact /></div>
          </div>
        </div>
      )}

      {palette && <CommandPalette items={allItems} actions={p.actions} locations={p.locations} onClose={() => setPalette(false)} />}
    </div>
  );
}

function Workspace(p: Pick<ShellProps, "orgName" | "orgInitials" | "roleName">) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-1">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-xs font-semibold tracking-wide text-canvas">{p.orgInitials}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{p.orgName}</p>
        <p className="truncate text-xs leading-tight text-slate-500">{p.roleName}</p>
      </div>
    </div>
  );
}

/** Selector de local: menú que nace del propio botón (transform-origin arriba) */
function LocationPicker({ locations, current }: { locations: ShellProps["locations"]; current?: { id: string; name: string } }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  if (!current) return null;
  if (locations.length < 2) {
    return <p className="flex h-8 items-center gap-2 px-2.5 text-sm text-slate-600"><NavIcon name="map" className="h-4 w-4 text-slate-500" />{current.name}</p>;
  }
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cn("flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-100", pending && "opacity-60")}>
        <NavIcon name="map" className="h-4 w-4 text-slate-500" />
        <span className="truncate">{current.name}</span>
        <ChevronsUpDown className="ml-auto h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <ul role="listbox" className="animate-pop absolute inset-x-0 top-full z-50 mt-1 origin-top rounded-lg border border-slate-200 bg-white p-1 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.18)]">
          {locations.map((l) => (
            <li key={l.id}>
              <button type="button" role="option" aria-selected={l.id === current.id} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-slate-700 hover:bg-slate-100" onClick={() => { setOpen(false); start(() => switchLocation(l.id)); }}>
                <span className="truncate">{l.name}</span>
                {l.id === current.id && <Check className="ml-auto h-4 w-4 text-brand-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Footer(p: Pick<ShellProps, "level" | "userName" | "roleName"> & { compact?: boolean }) {
  return (
    <div className={cn("space-y-2", !p.compact && "border-t border-slate-200 p-3")}>
      {p.level && (
        <Link href="/panel/misiones" className="block rounded-md px-2.5 py-2 transition-colors duration-150 hover:bg-slate-100">
          <span className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-slate-700">Nivel {p.level.level} · {p.level.name}</span>
            <span className="num text-slate-500">{p.level.pct}%</span>
          </span>
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate-200">
            <span className="block h-full rounded-full bg-brand-500" style={{ width: `${p.level.pct}%` }} />
          </span>
        </Link>
      )}
      <div className="flex items-center gap-1 px-1">
        <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{p.userName}</p>
        <ThemeToggle />
        <Link href="/salir" className="btn-icon h-8 w-8" aria-label="Salir" title="Salir"><LogOut className="h-4 w-4" strokeWidth={1.75} /></Link>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const toggle = useCallback(() => {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("nexo-theme", next ? "dark" : "light"); } catch {}
    setDark(next);
  }, [dark]);
  return (
    <button type="button" className="btn-icon h-8 w-8" onClick={toggle} aria-label={dark ? "Usar modo claro" : "Usar modo oscuro"} title={dark ? "Modo claro" : "Modo oscuro"}>
      {dark ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
    </button>
  );
}

/** Paleta de comandos: se abre con el teclado, así que aparece sin animación (Emil Kowalski) */
function CommandPalette({ items, actions, locations, onClose }: { items: NavItem[]; actions: ShellProps["actions"]; locations: ShellProps["locations"]; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [, start] = useTransition();
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const entries = useMemo(() => {
    const all = [
      ...actions.map((a) => ({ group: "Acciones", label: a.label, hint: a.hint, run: () => router.push(a.href) })),
      ...items.map((i) => ({ group: "Ir a", label: i.label, hint: undefined, run: () => router.push(i.href) })),
      ...(locations.length > 1 ? locations.map((l) => ({ group: "Cambiar de local", label: l.name, hint: undefined, run: () => start(() => switchLocation(l.id)) })) : []),
    ];
    const nq = norm(q.trim());
    return nq ? all.filter((e) => norm(e.label).includes(nq)) : all;
  }, [q, actions, items, locations, router]);
  useEffect(() => setSel(0), [q]);
  const run = (i: number) => { const e = entries[i]; if (!e) return; onClose(); e.run(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/30 px-4 pt-[12vh]" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Buscar o ir a">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_64px_-16px_rgb(0_0_0/0.35)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-slate-200 px-4">
          <Search className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, entries.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); run(sel); }
            }}
            placeholder="Buscar una pantalla o una acción…"
            className="h-12 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-slate-400"
            aria-label="Buscar"
          />
          <kbd className="kbd">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5" role="listbox">
          {entries.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">Nada coincide con «{q}».</li>}
          {entries.map((e, i) => (
            <li key={`${e.group}-${e.label}`}>
              {(i === 0 || entries[i - 1].group !== e.group) && <p className="px-2.5 pb-1 pt-2 text-xs font-medium text-slate-500">{e.group}</p>}
              <button type="button" role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => run(i)} className={cn("flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm", i === sel ? "bg-slate-100 text-ink" : "text-slate-700")}>
                <span className="truncate">{e.label}</span>
                {e.hint && <span className="ml-auto text-xs text-slate-500">{e.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
