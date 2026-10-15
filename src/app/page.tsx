import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ModuleIcon } from "@/components/ModuleIcon";
import { BRAND } from "@/lib/brand";
import { MODULES, PLANS } from "@/lib/modules";
import { SECTOR_LIST } from "@/sectors";

export default function Home() {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden gap-8 text-sm font-semibold uppercase tracking-wide text-slate-600 md:flex">
            <a href="#herramientas" className="hover:text-brand-600">Software</a>
            <a href="#sectores" className="hover:text-brand-600">Sectores</a>
            <a href="#precios" className="hover:text-brand-600">Precios</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/acceder" className="btn-ghost uppercase">Acceder</Link>
            <Link href="/registro" className="btn-primary display uppercase">Empieza gratis</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-20 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">El software para tu negocio, sea cual sea</p>
        <h1 className="display mt-4 text-4xl leading-[1.05] sm:text-6xl">
          Seis herramientas que trabajan sobre los mismos datos
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          El producto que das de alta es el que vendes, el que aparece en tu tienda online, el que publicas en
          redes y el que acabas facturando: <strong>se escribe una vez y viaja por todo lo demás.</strong>
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/registro" className="btn-primary display px-6 py-3 text-base uppercase">Empieza gratis</Link>
          <a href="#sectores" className="btn-secondary display px-6 py-3 text-base uppercase">Ver sectores</a>
        </div>
        <p className="mt-4 text-sm text-slate-500">Sin tarjeta. Configurado para tu sector en 2 minutos.</p>
      </section>

      {/* Herramientas */}
      <section id="herramientas" className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m.id} className="card p-6">
              <div className="flex items-center gap-4">
                <ModuleIcon id={m.id} />
                <div>
                  <h3 className="display text-2xl uppercase">{m.name}</h3>
                  <p className="text-sm text-slate-500">
                    {m.status === "soon" ? "Próximamente" : `Incluido desde plan ${PLANS.find((p) => p.id === m.plan)?.name}`}
                  </p>
                </div>
              </div>
              <p className="mt-4 font-medium">{m.summary}</p>
              <p className="mt-2 text-sm text-slate-600">{m.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flujo de datos */}
      <section className="bg-ink py-20 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="display text-3xl sm:text-4xl">Un dato, todo el recorrido</h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            Nada de hojas de cálculo sueltas ni copiar y pegar entre aplicaciones. Así viaja una venta por {BRAND.name}:
          </p>
          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {[
              ["Alta", "Das de alta el producto con los campos de tu sector."],
              ["Escaparate", "Aparece al instante en tu tienda o carta online."],
              ["Venta", "Lo vendes desde el panel o el móvil en segundos."],
              ["Stock y caja", "Se descuenta del stock y entra en caja automáticamente."],
              ["Factura", "La factura queda lista y el cliente, registrado."],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <span className="display text-3xl text-brand-500">0{i + 1}</span>
                <h3 className="mt-2 font-bold">{t}</h3>
                <p className="mt-1 text-sm text-slate-300">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Sectores */}
      <section id="sectores" className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">Una base, cualquier sector</p>
        <h2 className="display mt-2 text-3xl sm:text-4xl">Hecho para tu negocio, no para uno genérico</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Al registrarte eliges tu sector y el panel se adapta: vocabulario, campos, categorías y plantillas.
          ¿Necesitas algo más específico? Lo personalizamos contigo.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTOR_LIST.map((s) => (
            <Link
              key={s.id}
              href={`/registro?sector=${s.id}`}
              className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="block h-1.5 w-12 rounded-full" style={{ background: s.accent }} />
              <h3 className="mt-4 text-lg font-bold">{s.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {s.productFields.slice(0, 4).map((f) => (
                  <span key={f.key} className="badge bg-slate-100 text-slate-600">{f.label}</span>
                ))}
              </div>
              <span className="mt-4 inline-block text-sm font-semibold text-brand-600 group-hover:underline">
                Empezar como {s.name.toLowerCase()} →
              </span>
            </Link>
          ))}
          <div className="card flex flex-col justify-center border-dashed p-6">
            <h3 className="text-lg font-bold">¿Tu sector no está?</h3>
            <p className="mt-1 text-sm text-slate-600">
              Empieza con la versión general y te ayudamos a crear tus propios campos, categorías y flujos.
            </p>
            <Link href="/registro?sector=general" className="mt-4 text-sm font-semibold text-brand-600 hover:underline">
              Empezar con la versión general →
            </Link>
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="display text-center text-3xl sm:text-4xl">Precios claros</h2>
          <p className="mt-3 text-center text-slate-600">Empieza gratis y sube de plan cuando lo necesites. IVA no incluido.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className={`card flex flex-col p-6 ${p.highlighted ? "ring-2 ring-brand-600" : ""}`}>
                <h3 className="display text-2xl uppercase">{p.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.blurb}</p>
                <p className="mt-4">
                  <span className="display text-4xl">{p.priceMonthly} €</span>
                  <span className="text-slate-500"> /mes</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brand-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/registro" className={`${p.highlighted ? "btn-primary" : "btn-secondary"} mt-6 uppercase`}>
                  {p.priceMonthly === 0 ? "Empieza gratis" : `Probar ${p.name}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} {BRAND.name}. {BRAND.claim}.</p>
        </div>
      </footer>
    </div>
  );
}
