export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {subtitle && <p className="mt-1 text-[0.9375rem] text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Estado vacío que enseña qué irá aquí y cómo empezar */
export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1.5 max-w-md text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="num mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** Tira de cifras con reglas (estilo Stripe): la primera es la principal */
export function Figures({ items }: { items: { label: string; value: string; hint?: React.ReactNode; tone?: "warning" | "negative" }[] }) {
  return (
    <dl className="card mb-6 grid grid-cols-2 divide-slate-100 sm:flex sm:divide-x">
      {items.map((f, i) => (
        <div key={f.label} className={`min-w-0 flex-1 px-5 py-4 ${i > 1 ? "border-t border-slate-100 sm:border-t-0" : ""} ${i % 2 === 1 ? "border-l border-slate-100 sm:border-l-0" : ""}`}>
          <dt className="truncate text-sm text-slate-500">{f.label}</dt>
          <dd className={`num mt-1 truncate font-semibold tracking-tight ${i === 0 ? "text-2xl" : "text-xl"} ${f.tone === "warning" ? "text-warning" : f.tone === "negative" ? "text-negative" : ""}`}>{f.value}</dd>
          {f.hint && <dd className="mt-0.5 truncate text-xs text-slate-500">{f.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Filtros rápidos como enlaces (funcionan sin JavaScript y se pueden compartir) */
export function FilterChips({ items }: { items: { label: string; href: string; active: boolean }[] }) {
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-0.5" aria-label="Filtro">
      {items.map((c) => (
        <a key={c.href} href={c.href} aria-current={c.active ? "page" : undefined}
          className={`whitespace-nowrap rounded-md px-2.5 py-1 text-sm font-medium transition-colors duration-150 ${c.active ? "bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-slate-600 hover:text-ink"}`}>
          {c.label}
        </a>
      ))}
    </nav>
  );
}
