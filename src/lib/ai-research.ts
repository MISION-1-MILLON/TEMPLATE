import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Búsqueda automática de precios en internet con Claude + búsqueda web.
 *
 * Variable de entorno: ANTHROPIC_API_KEY.
 * Coste aproximado: unos 0,20–0,30 € por producto buscado (tokens + búsquedas web).
 *
 * Claude busca en la web y devuelve los resultados llamando a una herramienta
 * propia con esquema estricto (`strict: true`), así siempre recibimos JSON válido.
 */

const MODEL = "claude-opus-5-5";

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY) || process.env.NEXO_AI_MOCK === "1";
}

let client: Anthropic | null = null;
function anthropic() {
  client ??= new Anthropic({ timeout: 150_000, maxRetries: 1 });
  return client;
}

export class ResearchError extends Error {}

interface RunOptions {
  system: string;
  prompt: string;
  tool: Anthropic.Beta.BetaTool;
  webSearch: boolean;
  country?: string;
}

/** Ejecuta la búsqueda y devuelve la entrada de la herramienta de resultados. */
async function run<T>({ system, prompt, tool, webSearch, country = "ES" }: RunOptions): Promise<T> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  let nudged = false;

  for (let i = 0; i < 5; i++) {
    const response = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system,
      tools: [
        ...(webSearch
          ? [{ type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 6, user_location: { type: "approximate" as const, country } }]
          : []),
        tool,
      ],
      messages,
    });

    if (response.stop_reason === "refusal") throw new ResearchError("La búsqueda no se ha podido completar");

    const report = response.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === tool.name,
    );
    if (report) return report.input as T;

    // La búsqueda web se pausó a mitad: se reenvía tal cual para que continúe
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    // Terminó sin entregar resultados: se le pide una vez que los entregue
    if (!nudged) {
      nudged = true;
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: `Entrega ya lo que tengas llamando a la herramienta ${tool.name} (lista vacía si no encontraste nada).` });
      continue;
    }
    break;
  }
  throw new ResearchError("No se han podido obtener resultados");
}

/* ─── Competencia ─────────────────────────────────────────────────────── */

export interface MarketOffer {
  seller: string;
  kind: "fisica" | "online" | "marketplace";
  price_eur: number;
  url: string;
  product_title: string;
}

const marketTool: Anthropic.Beta.BetaTool = {
  name: "report_market_prices",
  description: "Entrega los precios de venta al público encontrados para el producto.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      offers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            seller: { type: "string", description: "Nombre de la tienda o vendedor" },
            kind: { type: "string", enum: ["fisica", "online", "marketplace"] },
            price_eur: { type: "number", description: "Precio final al consumidor en euros, IVA incluido" },
            url: { type: "string", description: "Enlace a la página donde aparece el precio" },
            product_title: { type: "string", description: "Nombre exacto del producto en esa tienda" },
          },
          required: ["seller", "kind", "price_eur", "url", "product_title"],
          additionalProperties: false,
        },
      },
    },
    required: ["offers"],
    additionalProperties: false,
  },
};

export async function researchMarketPrices(input: {
  product: string;
  details: string;
  sector: string;
  businessName: string;
  location: string | null;
}): Promise<MarketOffer[]> {
  if (process.env.NEXO_AI_MOCK === "1") return mockMarket(input.product);
  const res = await run<{ offers: MarketOffer[] }>({
    system:
      "Eres un analista de precios para pequeños comercios en España. Buscas en internet el precio actual de venta al público de un producto concreto. " +
      "Solo incluyes precios que hayas visto en una página real durante esta búsqueda, con su enlace. Nunca inventes precios ni tiendas. " +
      "Busca el mismo producto (o el equivalente más cercano si es un producto genérico como un plato o una prenda sin marca). " +
      "Prioriza vendedores en España. Excluye la propia tienda del usuario. Máximo 8 resultados, sin duplicados del mismo vendedor.",
    prompt:
      `Producto: ${input.product}\n` +
      (input.details ? `Detalles: ${input.details}\n` : "") +
      `Sector: ${input.sector}\n` +
      `Negocio del usuario (excluir): ${input.businessName}\n` +
      (input.location ? `Ubicación del negocio: ${input.location} (si es un producto local, como un plato, busca en esa zona)\n` : "") +
      `\nBusca precios actuales y entrégalos con la herramienta report_market_prices.`,
    tool: marketTool,
    webSearch: true,
  });
  return res.offers.filter((o) => o.price_eur > 0 && o.seller.trim());
}

/* ─── Proveedores ─────────────────────────────────────────────────────── */

export interface SupplierOfferResult {
  supplier: string;
  price_eur: number;
  price_includes_vat: boolean;
  unit: string;
  min_order: string;
  url: string;
  phone: string;
}

const supplierTool: Anthropic.Beta.BetaTool = {
  name: "report_supplier_prices",
  description: "Entrega los proveedores y precios mayoristas encontrados.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      offers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            supplier: { type: "string" },
            price_eur: { type: "number", description: "Precio por la unidad indicada en 'unit'" },
            price_includes_vat: { type: "boolean" },
            unit: { type: "string", description: "Unidad del precio: unidad, kg, litro, caja, metro, docena o par" },
            min_order: { type: "string", description: "Pedido mínimo si se indica, o cadena vacía" },
            url: { type: "string" },
            phone: { type: "string", description: "Teléfono si aparece, o cadena vacía" },
          },
          required: ["supplier", "price_eur", "price_includes_vat", "unit", "min_order", "url", "phone"],
          additionalProperties: false,
        },
      },
    },
    required: ["offers"],
    additionalProperties: false,
  },
};

export async function researchSupplierPrices(input: {
  item: string;
  unit: string;
  sector: string;
  location: string | null;
}): Promise<SupplierOfferResult[]> {
  if (process.env.NEXO_AI_MOCK === "1") return mockSuppliers(input.item, input.unit);
  const res = await run<{ offers: SupplierOfferResult[] }>({
    system:
      "Eres un comprador profesional para pequeños negocios en España. Buscas proveedores y distribuidores mayoristas (o tiendas para profesionales) " +
      "que vendan lo que el negocio necesita, y su precio actual. Solo incluyes precios que hayas visto en una página real durante esta búsqueda, con su enlace. " +
      "Nunca inventes proveedores, precios ni teléfonos. Prioriza proveedores que sirvan en España. Máximo 8 resultados, uno por proveedor.",
    prompt:
      `Lo que compra el negocio: ${input.item}\n` +
      `Unidad en la que quiere comparar: ${input.unit}\n` +
      `Sector del negocio: ${input.sector}\n` +
      (input.location ? `Ubicación: ${input.location}\n` : "") +
      `\nBusca proveedores con precio y entrégalos con la herramienta report_supplier_prices. Si el precio es por otra cantidad (por ejemplo, saco de 25 kg), conviértelo a la unidad pedida.`,
    tool: supplierTool,
    webSearch: true,
  });
  return res.offers.filter((o) => o.price_eur > 0 && o.supplier.trim());
}

/* ─── Detectar qué compra el negocio ──────────────────────────────────── */

export interface DetectedSupply {
  name: string;
  unit: "unidad" | "kg" | "litro" | "caja" | "metro" | "docena" | "par";
  product_name: string;
}

const suppliesTool: Anthropic.Beta.BetaTool = {
  name: "report_supplies",
  description: "Entrega la lista de cosas que el negocio necesita comprar.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nombre corto y buscable, p. ej. 'Harina de trigo' o 'Nike Air Max 90'" },
            unit: { type: "string", enum: ["unidad", "kg", "litro", "caja", "metro", "docena", "par"] },
            product_name: { type: "string", description: "Si se compra para revender tal cual, el nombre exacto del producto del catálogo; si no, cadena vacía" },
          },
          required: ["name", "unit", "product_name"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

export async function detectSupplies(input: { sector: string; products: string[] }): Promise<DetectedSupply[]> {
  if (process.env.NEXO_AI_MOCK === "1") {
    return input.products.slice(0, 8).map((p) => ({ name: p, unit: "unidad", product_name: p }));
  }
  const res = await run<{ items: DetectedSupply[] }>({
    system:
      "Ayudas a pequeños negocios a saber qué tienen que comprar a sus proveedores. " +
      "Si el negocio revende productos (tienda de ropa, zapatillas, coches…), cada producto del catálogo es algo que compra tal cual. " +
      "Si el negocio elabora (restaurante, panadería, taller…), deduce las materias primas principales que necesita, agrupadas y sin repetir. Máximo 20 elementos.",
    prompt: `Sector: ${input.sector}\nCatálogo:\n${input.products.map((p) => `- ${p}`).join("\n")}\n\nEntrega la lista con la herramienta report_supplies.`,
    tool: suppliesTool,
    webSearch: false,
  });
  return res.items.filter((i) => i.name.trim());
}

/* ─── Modo simulado (solo pruebas locales: NEXO_AI_MOCK=1) ─────────────── */

function seeded(text: string) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return () => ((h = (h * 1103515245 + 12345) >>> 0) % 1000) / 1000;
}

function mockMarket(product: string): MarketOffer[] {
  const r = seeded(product);
  const base = 20 + r() * 100;
  return ["Tienda Centro", "MegaStore Online", "Amazon"].map((seller, i) => ({
    seller: `${seller} (simulado)`,
    kind: (["fisica", "online", "marketplace"] as const)[i],
    price_eur: Math.round(base * (0.85 + r() * 0.35) * 100) / 100,
    url: "https://example.com/",
    product_title: product,
  }));
}

function mockSuppliers(item: string, unit: string): SupplierOfferResult[] {
  const r = seeded(item);
  const base = 1 + r() * 30;
  return ["Distribuciones Norte", "Mayorista Express", "Cash & Carry Sur"].map((supplier) => ({
    supplier: `${supplier} (simulado)`,
    price_eur: Math.round(base * (0.8 + r() * 0.5) * 100) / 100,
    price_includes_vat: false,
    unit,
    min_order: "",
    url: "https://example.com/",
    phone: "",
  }));
}
