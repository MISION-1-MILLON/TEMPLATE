import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ModuleIcon } from "@/components/ModuleIcon";
import { Pulse, type PulseSale } from "@/components/Pulse";
import { BRAND } from "@/lib/brand";
import { formatMoney } from "@/lib/money";
import { MODULES, PLANS } from "@/lib/modules";
import { SECTOR_LIST } from "@/sectors";

/** Un día de ejemplo para el pulso de la portada (siempre el mismo: nada aleatorio) */
function demoDay(seed: number, n: number): PulseSale[] {
  let x = seed;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => {
    const lunch = rnd() < 0.55;
    const at = lunch ? 780 + rnd() * 150 : 1200 + rnd() * 150;
    return { at: Math.round(at), cents: Math.round((8 + rnd() * 52) * 100), label: "Venta" };
  });
}

const PROFILES = [
  {
    role: "Dueño",
    lead: "Lo ve y lo decide todo.",
    points: ["Beneficio y márgenes por producto", "Todos los locales, juntos o por separado", "Equipo, plan y herramientas"],
  },
  {
    role: "Gerente",
    lead: "Lleva el día a día de sus locales.",
    points: ["Ventas, caja y stock de su local", "Invita y organiza a los empleados", "Competencia y proveedores, sin ver márgenes"],
  },
  {
    role: "Empleado",
    lead: "Vende y cobra, sin distracciones.",
    points: ["Un TPV rápido en móvil o tablet", "Descuentos en el ticket", "Entradas, recuentos y mermas de stock"],
  },
  {
    role: "Gestoría",
    lead: "Consulta y exporta, sin tocar nada.",
    points: ["Facturas con base e IVA", "IVA repercutido por trimestre", "CSV listo para su programa"],
  },
];

export default function Home() {
  const today = demoDay(7, 26);
  const lastWeek = demoDay(19, 22);
  const sold = today.filter((s) => s.at <= 1260).reduce((a, s) => a + s.cents, 0);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden gap-7 text-sm text-slate-600 md:flex" aria-label="Secciones">
            <a href="#perfiles" className="transition-colors duration-150 hover:text-ink">Perfiles</a>
            <a href="#herramientas" className="transition-colors duration-150 hover:text-ink">Herramientas</a>
            <a href="#sectores" className="transition-colors duration-150 hover:text-ink">Sectores</a>
            <a href="#precios" className="transition-colors duration-150 hover:text-ink">Precios</a>
          </nav>
          <div className="flex items-center gap-1.5">
            <Link href="/acceder" className="btn-ghost btn-sm">Acceder</Link>
            <Link href="/registro" className="btn-primary btn-sm">Empieza gratis</Link>
          </div>
        </div>
      </header>

      {/* Hero: la promesa y, debajo, el producto de verdad */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-brand-700">Centro de mando para negocios con mostrador</p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl">
            Todo tu negocio, en una pantalla. Y cada persona, en la suya.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600 text-pretty">
            Ventas, caja, stock, clientes y facturas sobre los mismos datos. El dueño ve el beneficio, el gerente lleva su local,
            el empleado vende y la gestoría descarga el IVA, cada uno con su perfil.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/registro" className="btn-primary btn-lg">Empieza gratis <ArrowRight className="h-4 w-4" strokeWidth={2} /></Link>
            <a href="#perfiles" className="btn-secondary btn-lg">Ver cómo funciona</a>
          </div>
          <p className="mt-4 text-sm text-slate-500">Sin tarjeta. Preparado para tu sector en dos minutos.</p>
        </div>

        <figure className="card mt-14 overflow-hidden shadow-[0_24px_64px_-32px_rgb(0_0_0/0.35)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 text-sm">
            <span className="font-medium">El pulso del día <span className="font-normal text-slate-500">· Centro</span></span>
            <span className="num text-slate-500">21:00</span>
          </div>
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div>
              <p className="text-sm text-slate-500">Vendido hoy</p>
              <p className="num mt-1 text-4xl font-semibold tracking-tight">{formatMoney(sold)}</p>
              <p className="mt-1 text-sm text-positive">+12 % que el mismo día de la semana pasada</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-slate-500">Tickets</dt><dd className="num mt-0.5 font-medium">{today.filter((s) => s.at <= 1260).length}</dd></div>
                <div><dt className="text-slate-500">Requiere atención</dt><dd className="mt-0.5 font-medium">2 avisos</dd></div>
              </dl>
            </div>
            <Pulse opensAt="12:00" closesAt="23:30" today={today.filter((s) => s.at <= 1260)} lastWeek={lastWeek} nowMin={1260} />
          </div>
          <figcaption className="sr-only">Ejemplo del inicio del panel: las ventas del día en su hora, frente a la semana pasada.</figcaption>
        </figure>
      </section>

      {/* Perfiles */}
      <section id="perfiles" className="border-t border-slate-200 bg-surface py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Cuatro perfiles. Cada uno ve lo que necesita, y nada más.</h2>
          <p className="mt-3 max-w-2xl text-slate-600">Los permisos se comprueban en el servidor, no solo en la pantalla: un empleado no puede ver tus márgenes aunque lo intente.</p>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {PROFILES.map((p) => (
              <article key={p.role} className="bg-surface p-6">
                <h3 className="font-semibold">{p.role}</h3>
                <p className="mt-1 text-sm text-slate-600">{p.lead}</p>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {p.points.map((x) => (
                    <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2} />{x}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-500">¿Varios locales? Cada uno con su caja, su stock y su equipo. Cambias de local desde la barra lateral.</p>
        </div>
      </section>

      {/* Recorrido de un dato */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Una venta, todo el recorrido</h2>
        <p className="mt-3 max-w-2xl text-slate-600">Nada de hojas sueltas ni de copiar entre aplicaciones. Lo que pasa en el mostrador llega solo a todas partes.</p>
        <ol className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Ficha", "El producto, con los campos de tu sector."],
            ["Venta", "Se cobra en segundos desde el TPV."],
            ["Stock", "Se descuenta en el local donde se vendió."],
            ["Caja", "Entra en la caja de ese local, por forma de pago."],
            ["Factura", "Queda numerada, con su base y su IVA."],
          ].map(([t, d], i) => (
            <li key={t} className="border-t border-slate-300 pt-4">
              <span className="num text-sm text-slate-400">0{i + 1}</span>
              <h3 className="mt-1 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Herramientas */}
      <section id="herramientas" className="border-t border-slate-200 bg-surface py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Enciende solo lo que uses</h2>
          <p className="mt-3 max-w-2xl text-slate-600">La caja es el núcleo. Lo demás son herramientas que cada negocio activa o apaga en Ajustes.</p>
          <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => (
              <div key={m.id}>
                <ModuleIcon id={m.id} />
                <h3 className="mt-3 flex items-center gap-2 font-semibold">{m.name}{m.status === "soon" && <span className="badge-neutral">Pronto</span>}</h3>
                <p className="mt-1 text-sm text-slate-600">{m.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sectores */}
      <section id="sectores" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Habla el idioma de tu sector</h2>
        <p className="mt-3 max-w-2xl text-slate-600">Al darte de alta eliges tu sector y el panel se adapta: platos o productos, alérgenos o tallas, carta o tienda.</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTOR_LIST.map((s) => (
            <Link key={s.id} href={`/registro?sector=${s.id}`} className="card group p-5 transition-[border-color,transform] duration-200 ease-out hover:border-slate-300 active:scale-[0.99]">
              <h3 className="font-semibold">{s.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.tagline}</p>
              <p className="mt-4 flex flex-wrap gap-1.5">
                {s.productFields.slice(0, 4).map((f) => <span key={f.key} className="badge-neutral">{f.label}</span>)}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                Empezar <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" strokeWidth={2} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="border-t border-slate-200 bg-surface py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Precios claros</h2>
          <p className="mt-3 text-slate-600">Empieza gratis. Los planes de pago incluyen 14 días de prueba. IVA no incluido.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className={`card flex flex-col p-6 ${p.highlighted ? "border-ink ring-1 ring-ink" : ""}`}>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.blurb}</p>
                <p className="mt-5"><span className="num text-4xl font-semibold tracking-tight">{p.priceMonthly} €</span><span className="text-slate-500"> /mes</span></p>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2} />{f}</li>)}
                </ul>
                <Link href="/registro" className={`${p.highlighted ? "btn-primary" : "btn-secondary"} mt-6`}>{p.priceMonthly === 0 ? "Empieza gratis" : "Probar 14 días gratis"}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Abre el panel hoy y vende esta tarde</h2>
        <Link href="/registro" className="btn-primary btn-lg mt-8">Empieza gratis <ArrowRight className="h-4 w-4" strokeWidth={2} /></Link>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} {BRAND.name}. {BRAND.claim}.</p>
        </div>
      </footer>
    </div>
  );
}
