"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface Item { id: string; name: string; vars: Record<string, string> }

const CHANNELS = {
  instagram: { label: "Instagram", hashtags: true, link: false },
  whatsapp: { label: "WhatsApp / Estados", hashtags: false, link: true },
  marketplace: { label: "Wallapop / Vinted / Milanuncios", hashtags: false, link: false },
} as const;
type Channel = keyof typeof CHANNELS;

function fill(template: string, vars: Record<string, string>) {
  return template
    .replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "")
    .split("\n")
    // Quita líneas que han quedado vacías o colgando por datos que faltan
    .map((l) => l.replace(/\s+·\s*$/g, "").replace(/\(\s*\)/g, "").trimEnd())
    .filter((l, i, arr) => l.trim() !== "" || (arr[i - 1]?.trim() ?? "") !== "")
    .join("\n")
    .trim();
}

export function PostComposer({ items, templates, hashtags, storeUrlPath, productLabel }: {
  items: Item[];
  templates: string[];
  hashtags: string[];
  storeUrlPath: string | null;
  productLabel: string;
}) {
  const [productId, setProductId] = useState(items[0]?.id ?? "");
  const [tpl, setTpl] = useState(0);
  const [channel, setChannel] = useState<Channel>("instagram");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const item = items.find((i) => i.id === productId);
  const generated = useMemo(() => {
    if (!item) return "";
    const c = CHANNELS[channel];
    let out = fill(templates[tpl] ?? templates[0], item.vars);
    if (channel === "marketplace") {
      const details = Object.entries(item.vars)
        .filter(([k, v]) => v && !["nombre", "precio", "negocio", "descripcion"].includes(k))
        .map(([k, v]) => `• ${k.replace(/_/g, " ").replace(/^\w/, (m) => m.toUpperCase())}: ${v}`);
      out = [item.vars.nombre, "", item.vars.descripcion, ...details, "", `Precio: ${item.vars.precio}`].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n").trim();
    }
    if (c.link && storeUrlPath && origin) out += `\n\n👉 ${origin}${storeUrlPath}`;
    if (c.hashtags) out += `\n\n${hashtags.join(" ")}`;
    return out;
  }, [item, tpl, channel, templates, hashtags, storeUrlPath, origin]);

  useEffect(() => setText(generated), [generated]);

  if (items.length === 0) return <p className="card p-6 text-sm text-slate-600">Añade algún {productLabel.toLowerCase()} al catálogo para generar publicaciones.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4 self-start p-5">
        <div>
          <label className="label">{productLabel}</label>
          <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Canal</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CHANNELS) as Channel[]).map((c) => (
              <button key={c} type="button" onClick={() => setChannel(c)} className={cn("rounded-full border px-3 py-1 text-sm", channel === c ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200")}>
                {CHANNELS[c].label}
              </button>
            ))}
          </div>
        </div>
        {channel !== "marketplace" && templates.length > 1 && (
          <div>
            <label className="label">Estilo</label>
            <div className="flex gap-1.5">
              {templates.map((_, i) => (
                <button key={i} type="button" onClick={() => setTpl(i)} className={cn("rounded-full border px-3 py-1 text-sm", tpl === i ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200")}>
                  Plantilla {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Las plantillas vienen de tu sector y usan los datos de la ficha. Próximamente: redacción con IA y publicación directa en Instagram.
        </p>
      </section>
      <section className="card p-5">
        <label className="label">Texto (puedes editarlo)</label>
        <textarea className="input min-h-72 font-sans leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
        <button
          type="button"
          className="btn-primary mt-3 w-full"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "¡Copiado!" : "Copiar texto"}
        </button>
      </section>
    </div>
  );
}
