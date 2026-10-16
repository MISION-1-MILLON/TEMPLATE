const STYLES: Record<string, { bg: string; fg: string; path: React.ReactNode }> = {
  gestion: {
    bg: "bg-indigo-50",
    fg: "text-indigo-600",
    path: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  },
  precio: {
    bg: "bg-amber-50",
    fg: "text-amber-600",
    path: <path d="M6 3h12v18H6zM9 7h6M9 11h1M12 11h1M15 11h0M9 14h1M12 14h1M9 17h1M12 17h1M15 14v3" />,
  },
  tienda: {
    bg: "bg-emerald-50",
    fg: "text-emerald-600",
    path: <path d="M4 9 5.5 4h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6" />,
  },
  publica: {
    bg: "bg-pink-50",
    fg: "text-pink-600",
    path: <path d="M4 12v-2l12-5v14L4 14v-2zM16 9a3 3 0 0 1 0 6M7 14l1 5h3l-1-4" />,
  },
  mercado: {
    bg: "bg-sky-50",
    fg: "text-sky-600",
    path: <path d="M4 20h16M7 16v-5M11 16V7M15 16v-3M19 16V9" />,
  },
  competencia: {
    bg: "bg-sky-50",
    fg: "text-sky-600",
    path: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
  proveedores: {
    bg: "bg-emerald-50",
    fg: "text-emerald-600",
    path: <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
  },
  fideliza: {
    bg: "bg-violet-50",
    fg: "text-violet-600",
    path: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  },
};

export function ModuleIcon({ id, size = "lg" }: { id: string; size?: "sm" | "lg" }) {
  const s = STYLES[id] ?? STYLES.gestion;
  const box = size === "lg" ? "h-14 w-14 rounded-xl" : "h-8 w-8 rounded-lg";
  const icon = size === "lg" ? "h-7 w-7" : "h-4 w-4";
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${s.bg} ${s.fg}`}>
      <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {s.path}
      </svg>
    </span>
  );
}
