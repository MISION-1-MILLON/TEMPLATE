/**
 * Resuelve la URL de la base de datos aunque el proveedor use otros nombres
 * (Neon: DATABASE_URL, Vercel Postgres/Supabase: POSTGRES_PRISMA_URL / POSTGRES_URL…).
 */
export function resolveDbEnv(env = process.env) {
  const pick = (...keys) => keys.map((k) => env[k]).find((v) => v && v.trim());
  const url = pick("DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "STORAGE_DATABASE_URL", "STORAGE_URL");
  const direct = pick("DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "STORAGE_DATABASE_URL_UNPOOLED", "STORAGE_URL_UNPOOLED") || url;
  return { url, direct };
}
