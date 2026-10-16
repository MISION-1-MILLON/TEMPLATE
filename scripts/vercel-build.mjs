// Build de producción en Vercel: aplica migraciones y compila.
import { execSync } from "node:child_process";
import { resolveDbEnv } from "./db-env.mjs";

const { url, direct } = resolveDbEnv();
const fail = (msg) => {
  console.error(`\n\x1b[31m✖ ${msg}\x1b[0m\n`);
  process.exit(1);
};

if (!url) fail("No hay base de datos conectada. En Vercel: Storage → Create Database → Neon, conéctala al proyecto y vuelve a desplegar.");
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) {
  fail("Falta la variable AUTH_SECRET (mínimo 16 caracteres). Añádela en Settings → Environment Variables y vuelve a desplegar.");
}

const env = { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: direct };
const run = (cmd) => execSync(cmd, { stdio: "inherit", env });

console.log("→ Aplicando migraciones de la base de datos…");
run("npx prisma migrate deploy");
console.log("→ Compilando la aplicación…");
run("npx next build");
