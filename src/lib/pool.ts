import "server-only";
import { cache } from "react";
import { db } from "./db";
import { asAttributes } from "./attributes";

/**
 * Bolsa común de productos: los productos de todos los negocios de la plataforma.
 * No hace búsquedas en internet (coste cero) y mejora con cada cliente nuevo.
 *
 * Privacidad: solo se usa el precio de venta (público). El coste nunca sale de su negocio.
 * Por defecto el vendedor aparece como "Un negocio de <ciudad>"; con poolPublic, con su nombre.
 */

const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las", "con", "para", "y", "en", "a", "al", "un", "una", "the", "and", "of", "uds", "ud"]);
/** Similitud mínima para considerar que dos productos son "el mismo" */
const SAME_PRODUCT = 0.6;

export function tokens(text: string) {
  return new Set(
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w && !STOPWORDS.has(w)),
  );
}

/** Parecido entre dos nombres de producto (0–1): palabras en común / palabras del más corto */
export function similarity(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const w of a) if (b.has(w)) common++;
  return common / Math.min(a.size, b.size) * (common / Math.max(a.size, b.size)) ** 0.25;
}

export function cityOf(address: string | null) {
  if (!address) return null;
  const last = address.split(",").pop()?.trim();
  return last && !/\d{3,}/.test(last) ? last : null;
}

export interface PoolItem {
  id: string;
  name: string;
  priceCents: number;
  category: string | null;
  sector: string;
  orgId: string;
  seller: string;
  sellerUrl: string | null;
  city: string | null;
  imageUrl: string | null;
  words: Set<string>;
}

/** Toda la bolsa, menos los productos del propio negocio */
export const getPool = cache(async (excludeOrgId: string) => {
  const rows = await db.product.findMany({
    where: { active: true, isDemo: false, priceCents: { gt: 0 }, orgId: { not: excludeOrgId }, org: { poolShare: true } },
    take: 5000,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      priceCents: true,
      imageUrl: true,
      attributes: true,
      category: { select: { name: true } },
      org: { select: { id: true, name: true, slug: true, sector: true, address: true, poolPublic: true, storeEnabled: true } },
    },
  });
  return rows.map<PoolItem>((r) => {
    const city = cityOf(r.org.address);
    const brand = String(asAttributes(r.attributes).marca ?? "");
    return {
      id: r.id,
      name: r.name,
      priceCents: r.priceCents,
      category: r.category?.name ?? null,
      sector: r.org.sector,
      orgId: r.org.id,
      seller: r.org.poolPublic ? r.org.name : city ? `Un negocio de ${city}` : "Un negocio de la plataforma",
      sellerUrl: r.org.poolPublic && r.org.storeEnabled ? `/t/${r.org.slug}` : null,
      city,
      imageUrl: r.imageUrl,
      words: tokens(`${brand} ${r.name}`),
    };
  });
});

export interface MyProduct {
  id: string;
  name: string;
  priceCents: number;
  attributes: unknown;
}

/** Para cada producto mío, los mismos productos en la bolsa (del más barato al más caro) */
export async function poolMatches(orgId: string, mine: MyProduct[]) {
  const pool = await getPool(orgId);
  const out = new Map<string, PoolItem[]>();
  for (const p of mine) {
    const brand = String(asAttributes(p.attributes).marca ?? "");
    const words = tokens(`${brand} ${p.name}`);
    const list = pool.filter((x) => similarity(words, x.words) >= SAME_PRODUCT).sort((a, b) => a.priceCents - b.priceCents);
    // Un precio por negocio (el más barato de cada uno)
    const seen = new Set<string>();
    out.set(p.id, list.filter((x) => (seen.has(x.orgId) ? false : (seen.add(x.orgId), true))));
  }
  return out;
}

/**
 * Productos de la bolsa que yo no vendo, ordenados por interés para mi negocio:
 * mismo sector, mis categorías, palabras de mi catálogo, mi ciudad y popularidad.
 */
export async function poolDiscover(org: { id: string; sector: string; address: string | null }, mine: MyProduct[], myCategories: string[], limit = 24) {
  const pool = await getPool(org.id);
  const myWords = mine.map((p) => tokens(`${String(asAttributes(p.attributes).marca ?? "")} ${p.name}`));
  const catalogWords = new Set(myWords.flatMap((w) => [...w]));
  const cats = new Set(myCategories.map((c) => c.toLowerCase()));
  const myCity = cityOf(org.address)?.toLowerCase();

  // Popularidad: cuántos negocios venden algo parecido
  const popularity = new Map<string, number>();
  for (const x of pool) {
    const key = [...x.words].sort().join(" ");
    popularity.set(key, (popularity.get(key) ?? 0) + 1);
  }

  const seenKeys = new Set<string>();
  return pool
    .filter((x) => !myWords.some((w) => similarity(w, x.words) >= SAME_PRODUCT))
    .map((x) => {
      let score = 0;
      const reasons: string[] = [];
      // Números sueltos ("1", "90") no indican parecido por sí solos
      const shared = [...x.words].filter((w) => w.length >= 3 && !/^\d+$/.test(w) && catalogWords.has(w)).length;
      // Solo interesa lo de tu sector o lo parecido a lo que ya vendes
      if (x.sector !== org.sector && !shared) return { item: x, score: 0, reasons };
      if (x.sector === org.sector) { score += 4; reasons.push("De tu sector"); }
      if (x.category && cats.has(x.category.toLowerCase())) { score += 3; reasons.push(`Categoría ${x.category}`); }
      if (shared) { score += Math.min(shared, 3); reasons.push("Parecido a lo que vendes"); }
      if (myCity && x.city?.toLowerCase() === myCity) { score += 2; reasons.push("En tu ciudad"); }
      const pop = popularity.get([...x.words].sort().join(" ")) ?? 1;
      if (pop > 1) { score += Math.min(pop, 4); reasons.push(`Lo venden ${pop} negocios`); }
      return { item: x, score, reasons };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.priceCents - b.item.priceCents)
    // No repetir el mismo producto de varios negocios
    .filter((r) => {
      const key = [...r.item.words].sort().join(" ");
      return seenKeys.has(key) ? false : (seenKeys.add(key), true);
    })
    .slice(0, limit);
}

export async function poolSize() {
  const where = { active: true, isDemo: false, priceCents: { gt: 0 }, org: { poolShare: true } };
  const [products, orgs] = await Promise.all([
    db.product.count({ where }),
    db.product.groupBy({ by: ["orgId"], where }),
  ]);
  return { products, orgs: orgs.length };
}
