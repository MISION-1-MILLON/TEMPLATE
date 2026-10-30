/**
 * Negocio de ejemplo: una pizzería con dos locales, equipo, 45 días de ventas,
 * stock de bebidas y postres, caja, competencia y proveedores.
 * Uso: npx tsx prisma/pizzeria.ts   (dueño: demo+pizzeria@nexo.app / demo1234)
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { createAccount } from "../src/lib/onboarding";
import { createSale } from "../src/lib/sales";
import { moveStock } from "../src/lib/stock";

const db = new PrismaClient();
let x = 42;
const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

const MENU: Array<[string, string, number, number, Record<string, unknown>, boolean?]> = [
  ["Margarita", "Pizzas", 9.5, 2.1, { alergenos: ["Gluten", "Lácteos"], racion: "Plato", vegetariano: true }],
  ["Diavola", "Pizzas", 11.5, 2.9, { alergenos: ["Gluten", "Lácteos"], racion: "Plato", picante: true }],
  ["Cuatro quesos", "Pizzas", 12, 3.4, { alergenos: ["Gluten", "Lácteos"], racion: "Plato", vegetariano: true }],
  ["Prosciutto e funghi", "Pizzas", 12.5, 3.6, { alergenos: ["Gluten", "Lácteos"], racion: "Plato" }],
  ["Calzone", "Pizzas", 12, 3.1, { alergenos: ["Gluten", "Lácteos", "Huevo"], racion: "Plato" }],
  ["Burrata con tomate", "Entrantes", 9, 3.2, { alergenos: ["Lácteos"], racion: "Ración", vegetariano: true }],
  ["Focaccia de romero", "Entrantes", 4.5, 0.7, { alergenos: ["Gluten"], racion: "Ración", vegano: true }],
  ["Ensalada caprese", "Entrantes", 8, 2.4, { alergenos: ["Lácteos"], racion: "Ración", vegetariano: true }],
  ["Tiramisú", "Postres", 5.5, 1.4, { alergenos: ["Gluten", "Lácteos", "Huevo"], racion: "Unidad", vegetariano: true }, true],
  ["Panna cotta", "Postres", 5, 1.1, { alergenos: ["Lácteos"], racion: "Unidad", vegetariano: true }, true],
  ["Caña", "Bebidas", 2.5, 0.6, { alergenos: ["Gluten"], racion: "Bebida" }],
  ["Refresco", "Bebidas", 2.8, 0.7, { racion: "Bebida" }, true],
  ["Agua 50 cl", "Bebidas", 2, 0.3, { racion: "Bebida" }, true],
  ["Copa de vino tinto", "Bebidas", 3.8, 1.1, { alergenos: ["Sulfitos"], racion: "Bebida" }],
];

async function main() {
  const email = "demo+pizzeria@nexo.app";
  const old = await db.user.findUnique({ where: { email } });
  if (old) {
    await db.organization.deleteMany({ where: { memberships: { some: { userId: old.id } } } });
    await db.user.deleteMany({ where: { email: { startsWith: "demo+pizzeria" } } });
  }
  const { user, org } = await createAccount({ name: "Giulia Rossi", email, password: "demo1234", businessName: "Pizzería Bella Napoli", sector: "restauracion" });
  await db.organization.update({
    where: { id: org.id },
    data: { plan: "business", taxId: "B87654321", address: "Calle de Fuencarral 120, Madrid", phone: "611222333", email: "ciao@bellanapoli.es", dailyGoalCents: 90_000 },
  });
  const chamberi = (await db.location.findFirstOrThrow({ where: { orgId: org.id } })).id;
  await db.location.update({ where: { id: chamberi }, data: { name: "Chamberí", address: "Calle de Fuencarral 120, Madrid", opensAt: "12:30", closesAt: "00:00" } });
  const lavapies = (await db.location.create({ data: { orgId: org.id, name: "Lavapiés", address: "Calle del Ave María 8, Madrid", opensAt: "13:00", closesAt: "23:30" } })).id;

  // Equipo
  const hash = await bcrypt.hash("demo1234", 10);
  const member = async (suffix: string, name: string, role: string, locs: string[]) =>
    (await db.user.create({ data: { email: `demo+pizzeria.${suffix}@nexo.app`, name, passwordHash: hash, memberships: { create: { orgId: org.id, role, locationIds: locs } } } })).id;
  const marco = await member("gerente", "Marco Bianchi", "manager", [lavapies]);
  const lucia = await member("camarera", "Lucía Fernández", "staff", [chamberi]);
  const dani = await member("camarero", "Dani Ortega", "staff", [lavapies]);
  await member("gestoria", "Gestoría Martín", "accountant", []);
  await db.invitation.create({ data: { orgId: org.id, email: "pablo.cocina@gmail.com", role: "staff", locationIds: [chamberi], token: "demo-pizzeria-" + Date.now(), invitedById: user.id } });
  const sellers = new Map([[chamberi, [user.id, lucia, lucia]], [lavapies, [marco, dani, dani]]]);

  // Carta
  const cats = new Map<string, string>();
  for (const name of ["Pizzas", "Entrantes", "Postres", "Bebidas"]) {
    cats.set(name, (await db.category.upsert({ where: { orgId_name: { orgId: org.id, name } }, create: { orgId: org.id, name }, update: {} })).id);
  }
  await db.category.deleteMany({ where: { orgId: org.id, name: "Principales" } });
  const products = [];
  for (const [name, cat, price, cost, attributes, track] of MENU) {
    const p = await db.product.create({
      data: { orgId: org.id, name, categoryId: cats.get(cat)!, priceCents: Math.round(price * 100), costCents: Math.round(cost * 100), trackStock: !!track, lowStockAt: name === "Agua 50 cl" ? 40 : cat === "Bebidas" ? 24 : 8, attributes: attributes as object, published: true },
    });
    products.push(p);

  }
  const pizzas = products.filter((p) => p.categoryId === cats.get("Pizzas"));
  const sides = products.filter((p) => p.categoryId !== cats.get("Pizzas") && p.categoryId !== cats.get("Bebidas"));
  const drinks = products.filter((p) => p.categoryId === cats.get("Bebidas"));

  const customers = await Promise.all(
    ["Carmen Ruiz", "Javier Molina", "Elena Navarro", "Sergio Prieto", "Ana Beltrán", "Tomás Gil", "Oficina Fuencarral S.L."].map((name, i) =>
      db.customer.create({ data: { orgId: org.id, name, phone: `6${String(10000000 + i * 1234567).slice(0, 8)}`, taxId: i === 6 ? "B11223344" : null, attributes: {} } }),
    ),
  );

  // Ventas: comidas (13:30–16:00) y cenas (20:00–23:30), más los fines de semana
  const now = new Date();
  const madridHour = (d: Date) => Number(new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "numeric", hourCycle: "h23" }).format(d));
  // Reposición semanal (los lunes de cada semana simulada), hasta un nivel por producto
  const target = (name: string, loc: string) => (name === "Agua 50 cl" ? 60 : name === "Refresco" ? 110 : 70) * (loc === chamberi ? 1.2 : 1);
  const tracked = products.filter((p) => p.trackStock);
  for (let day = 45; day >= 0; day--) {
    const base = new Date(now.getTime() - day * 86_400_000);
    if (day % 7 === 3) {
      for (const p of tracked) for (const loc of [chamberi, lavapies]) {
        const have = (await db.productStock.findUnique({ where: { productId_locationId: { productId: p.id, locationId: loc } } }))?.quantity ?? 0;
        const delta = Math.round(target(p.name, loc)) - have;
        if (delta <= 0) continue;
        const m = await db.$transaction((tx) => moveStock(tx, { orgId: org.id, productId: p.id, locationId: loc, delta, reason: "purchase" }));
        const at = new Date(base); at.setUTCHours(9, 0, 0, 0);
        await db.stockMovement.updateMany({ where: { orgId: org.id, productId: p.id, locationId: loc, reason: "purchase", createdAt: { gt: new Date(now.getTime() - 60_000) } }, data: { createdAt: at } });
        void m;
      }
    }
    const weekend = [0, 5, 6].includes(base.getDay());
    for (const loc of [chamberi, lavapies]) {
      const n = Math.round((loc === chamberi ? 16 : 11) * (weekend ? 1.5 : 1) * (0.8 + rnd() * 0.4));
      for (let i = 0; i < n; i++) {
        const dinner = rnd() < 0.6;
        const d = new Date(base);
        const offset = madridHour(d) - d.getUTCHours();
        const minutes = dinner ? 20 * 60 + rnd() * 210 : 13 * 60 + 30 + rnd() * 150;
        d.setUTCHours(Math.floor(minutes / 60) - offset, Math.floor(minutes % 60), 0, 0);
        if (d > now) continue;
        const people = 1 + Math.floor(rnd() * 3);
        const lines = new Map<string, number>();
        const add = (id: string) => lines.set(id, (lines.get(id) ?? 0) + 1);
        for (let k = 0; k < people; k++) { add(pick(pizzas).id); add(pick(drinks).id); }
        if (rnd() < 0.5) add(pick(sides).id);
        try {
          const sale = await createSale(org.id, loc, pick(sellers.get(loc)!), {
            customerId: rnd() < 0.3 ? pick(customers).id : null,
            paymentMethod: pick(["card", "card", "card", "cash", "bizum"]),
            status: rnd() < 0.03 ? "pending" : "paid",
            discountCents: rnd() < 0.06 ? 200 : 0,
            items: [...lines].map(([productId, quantity]) => ({ productId, quantity })),
          });
          await db.sale.update({ where: { id: sale.id }, data: { createdAt: d } });
          await db.cashMovement.updateMany({ where: { saleId: sale.id }, data: { createdAt: d } });
          await db.stockMovement.updateMany({ where: { saleId: sale.id }, data: { createdAt: d } });
        } catch {
          // sin stock: se ignora
        }
      }
    }
  }

  // Caja: cambio de la mañana y gastos
  for (let day = 20; day >= 0; day--) {
    for (const loc of [chamberi, lavapies]) {
      const d = new Date(now.getTime() - day * 86_400_000);
      d.setUTCHours(10, 30, 0, 0);
      if (d > now) continue;
      await db.cashMovement.create({ data: { orgId: org.id, locationId: loc, concept: "Cambio de la mañana", amountCents: 15000, method: "cash", createdAt: d } });
      if (rnd() < 0.4) {
        const [concept, cents] = pick([["Harina y levadura", -4250], ["Mozzarella fior di latte", -8900], ["Productos de limpieza", -2340], ["Hielo", -1250]] as const);
        await db.cashMovement.create({ data: { orgId: org.id, locationId: loc, concept, amountCents: cents, method: "cash", createdAt: new Date(d.getTime() + 3_600_000) } });
      }
    }
  }

  // Al cerrar, el efectivo del día se ingresa en el banco: el cajón amanece vacío
  for (let day = 45; day >= 1; day--) for (const loc of [chamberi, lavapies]) {
    const from = new Date(now.getTime() - day * 86_400_000); from.setUTCHours(4, 0, 0, 0);
    const to = new Date(from.getTime() + 86_400_000 - 60_000);
    const { _sum } = await db.cashMovement.aggregate({ where: { orgId: org.id, locationId: loc, method: "cash", createdAt: { gte: from, lt: to } }, _sum: { amountCents: true } });
    if ((_sum.amountCents ?? 0) > 0) await db.cashMovement.create({ data: { orgId: org.id, locationId: loc, concept: "Ingreso en el banco", amountCents: -(_sum.amountCents ?? 0), method: "cash", createdAt: new Date(from.getTime() + (18 * 60 + 50) * 60_000) } });
  }

  // Competencia
  const rivals = await Promise.all([["Pizzería Da Michele", "fisica"], ["Grosso Napoletano", "fisica"], ["La Mafia se sienta a la mesa", "fisica"], ["Glovo · pizzerías de la zona", "marketplace"]].map(([name, kind]) => db.competitor.create({ data: { orgId: org.id, name, kind } })));
  for (const p of products) for (const c of rivals) {
    if (rnd() < 0.25) continue;
    await db.competitorPrice.create({ data: { orgId: org.id, competitorId: c.id, productId: p.id, priceCents: Math.round((p.priceCents * (0.82 + rnd() * 0.4)) / 10) * 10, note: p.name } });
  }

  // Proveedores
  const sups = await Promise.all(["Makro", "Mercamadrid Lácteos", "Distribuciones Italia Gourmet", "Cash & Carry GM"].map((name, i) => db.supplier.create({ data: { orgId: org.id, name, phone: `91${4000000 + i * 1111111}` } })));
  for (const [name, unit, base] of [["Harina tipo 00", "kg", 1.15], ["Mozzarella fior di latte", "kg", 8.9], ["Tomate San Marzano", "kg", 3.4], ["Aceite de oliva virgen extra", "litro", 7.6], ["Prosciutto cotto", "kg", 12.8]] as const) {
    const item = await db.supplyItem.create({ data: { orgId: org.id, name, unit } });
    let first: string | null = null;
    for (const s of sups) {
      if (rnd() < 0.2) continue;
      await db.supplierPrice.create({ data: { orgId: org.id, supplierId: s.id, supplyItemId: item.id, priceCents: Math.round(base * (0.85 + rnd() * 0.35) * 100), minOrder: rnd() < 0.4 ? "100 €" : null, deliveryDays: 1 + Math.floor(rnd() * 3) } });
      first ??= s.id;
    }
    if (first) await db.supplyItem.update({ where: { id: item.id }, data: { currentSupplierId: sups[sups.length - 1].id } });
  }

  const sales = await db.sale.count({ where: { orgId: org.id } });
  console.log(`✔ Pizzería Bella Napoli: ${sales} ventas · dueño ${email} / demo1234`);
}

main().finally(() => db.$disconnect());
