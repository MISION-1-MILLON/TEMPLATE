/**
 * Crea una cuenta demo por sector con productos, clientes y ~60 días de ventas.
 * Usuarios: demo+<sector>@nexo.app / demo1234
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { createAccount } from "../src/lib/onboarding";
import { createSale } from "../src/lib/sales";
import { SECTOR_LIST } from "../src/sectors";

const db = new PrismaClient();
const NAMES = ["Lucía García", "Hugo Martín", "Martina López", "Daniel Sánchez", "Sofía Pérez", "Pablo Gómez", "Valeria Ruiz", "Álvaro Díaz"];
const BUSINESS: Record<string, string> = {
  general: "Bazar Central",
  zapatillas: "Kicks Lab",
  moda: "Atelier Norte",
  restauracion: "La Taberna de Ana",
  motor: "Auto Ocasión Sur",
};
const rand = (n: number) => Math.floor(Math.random() * n);

/** Negocios de ejemplo (sin usuario) que llenan la bolsa común en la demo */
const POOL_ORGS: Array<{ name: string; sector: string; city: string; pub: boolean; products: Array<[string, string, number, Record<string, unknown>?]> }> = [
  { name: "Urban Kicks", sector: "zapatillas", city: "Madrid", pub: true, products: [["Nike Air Max 90 Infrared", "Lifestyle", 139.95, { marca: "Nike" }], ["Adidas Samba OG", "Lifestyle", 115, { marca: "Adidas" }], ["New Balance 550", "Lifestyle", 129.99, { marca: "New Balance" }], ["Air Force 1 '07", "Lifestyle", 119.99, { marca: "Nike" }]] },
  { name: "Sneaker Corner", sector: "zapatillas", city: "Valencia", pub: false, products: [["Air Max 90", "Lifestyle", 154.9, { marca: "Nike" }], ["Gel-Kayano 14 Cream", "Running", 149, { marca: "Asics" }], ["Jordan 1 High Chicago", "Ediciones limitadas", 399, { marca: "Jordan" }], ["Vans Old Skool", "Skate", 75, { marca: "Vans" }]] },
  { name: "Run & Go", sector: "zapatillas", city: "Barcelona", pub: true, products: [["Gel-Kayano 14", "Running", 165, { marca: "Asics" }], ["Nike Pegasus 41", "Running", 139.99, { marca: "Nike" }], ["New Balance 1080", "Running", 179.99, { marca: "New Balance" }]] },
  { name: "Bar El Rincón", sector: "restauracion", city: "Madrid", pub: true, products: [["Croquetas de jamón (6 uds)", "Entrantes", 8.5], ["Patatas bravas", "Entrantes", 5.9], ["Tortilla de patatas", "Entrantes", 3.2], ["Caña", "Bebidas", 2.2]] },
  { name: "Mesón Castilla", sector: "restauracion", city: "Madrid", pub: false, products: [["Patatas bravas", "Entrantes", 7], ["Tarta de queso", "Postres", 6.5], ["Caña", "Bebidas", 2.8], ["Huevos rotos con jamón", "Principales", 12.5]] },
  { name: "Lola Boutique", sector: "moda", city: "Sevilla", pub: true, products: [["Camiseta básica oversize", "Camisetas", 19.95], ["Vaquero recto", "Pantalones", 54.9], ["Vestido de lino", "Vestidos", 45]] },
  { name: "Moda Norte", sector: "moda", city: "Bilbao", pub: false, products: [["Camiseta básica oversize blanca", "Camisetas", 22], ["Abrigo de paño camel", "Abrigos", 129], ["Jersey de punto", "Abrigos", 39.9]] },
  { name: "Autos del Este", sector: "motor", city: "Valencia", pub: true, products: [["Volkswagen Golf 1.5 TSI Life", "Turismos", 22900, { marca: "Volkswagen" }], ["Seat León 1.5 TSI", "Turismos", 19500, { marca: "Seat" }]] },
];

async function seedPoolOrgs() {
  for (const o of POOL_ORGS) {
    const slug = o.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    await db.organization.deleteMany({ where: { slug } });
    const org = await db.organization.create({ data: { name: o.name, slug, sector: o.sector, address: `Calle Mayor 10, ${o.city}`, poolPublic: o.pub } });
    for (const [name, category, price, attributes] of o.products) {
      const cat = await db.category.upsert({ where: { orgId_name: { orgId: org.id, name: category } }, create: { orgId: org.id, name: category }, update: {} });
      await db.product.create({ data: { orgId: org.id, name, categoryId: cat.id, priceCents: Math.round(price * 100), stock: 5, attributes: (attributes ?? {}) as object } });
    }
  }
  console.log(`✔ Bolsa: ${POOL_ORGS.length} negocios de ejemplo`);
}

async function main() {
  await seedPoolOrgs();
  for (const sector of SECTOR_LIST) {
    const email = `demo+${sector.id}@nexo.app`;
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      await db.organization.deleteMany({ where: { memberships: { some: { userId: existing.id } } } });
      await db.user.delete({ where: { id: existing.id } });
    }
    const { user, org } = await createAccount({
      name: "Usuario Demo",
      email,
      password: "demo1234",
      businessName: BUSINESS[sector.id] ?? sector.name,
      sector: sector.id,
      withDemo: true,
    });
    await db.organization.update({
      where: { id: org.id },
      data: { plan: "pro", taxId: "B12345678", address: "Calle Mayor 1, Madrid", phone: "600123456", email: "hola@ejemplo.com" },
    });
    // Stock de sobra para poder simular ventas
    await db.product.updateMany({ where: { orgId: org.id, trackStock: true }, data: { stock: { increment: sector.id === "motor" ? 0 : 40 } } });

    const customers = await Promise.all(
      NAMES.slice(0, 6).map((name) => db.customer.create({ data: { orgId: org.id, name, phone: `6${rand(1e8)}`, attributes: {} } })),
    );
    const products = await db.product.findMany({ where: { orgId: org.id } });
    const salesCount = sector.id === "motor" ? 1 : sector.id === "restauracion" ? 120 : 45;

    for (let i = 0; i < salesCount; i++) {
      const lines = Array.from({ length: 1 + rand(sector.id === "restauracion" ? 4 : 2) }, () => products[rand(products.length)]);
      const items = [...new Map(lines.map((p) => [p.id, { productId: p.id, quantity: 1 + rand(2) }])).values()];
      try {
        const sale = await createSale(org.id, user.id, {
          customerId: Math.random() < 0.5 ? customers[rand(customers.length)].id : null,
          paymentMethod: ["card", "card", "cash", "bizum"][rand(4)],
          status: Math.random() < 0.08 ? "pending" : "paid",
          items,
        });
        // Repartir las ventas en los últimos 60 días, en horario comercial
        const d = new Date(Date.now() - rand(60) * 86_400_000);
        d.setHours(10 + rand(11), rand(60));
        await db.sale.update({ where: { id: sale.id }, data: { createdAt: d } });
        await db.cashMovement.updateMany({ where: { saleId: sale.id }, data: { createdAt: d } });
        await db.stockMovement.updateMany({ where: { saleId: sale.id }, data: { createdAt: d } });
      } catch {
        // sin stock: se ignora
      }
    }
    await seedMarket(org.id, sector.id);
    console.log(`✔ ${sector.name}: ${email} / demo1234`);
  }
}

/** Datos de ejemplo de competencia y proveedores (en real los trae la búsqueda automática) */
const COMPETITORS: Record<string, Array<[string, string]>> = {
  general: [["Bazar Plaza", "fisica"], ["Amazon", "marketplace"], ["TodoCasa Online", "online"]],
  zapatillas: [["Foot Locker", "fisica"], ["JD Sports", "online"], ["Zalando", "online"], ["StockX", "marketplace"]],
  moda: [["Zara", "fisica"], ["Mango", "online"], ["El Corte Inglés", "online"], ["Vinted", "marketplace"]],
  restauracion: [["Bar La Esquina", "fisica"], ["Taberna El Puerto", "fisica"], ["Casa Pepe", "fisica"]],
  motor: [["Coches.net", "marketplace"], ["Flexicar", "online"], ["Autos Jiménez", "fisica"]],
};
const SUPPLIES: Record<string, Array<[string, string, number]>> = {
  restauracion: [["Harina de trigo", "kg", 0.85], ["Aceite de oliva virgen extra", "litro", 7.4], ["Patatas", "kg", 0.9], ["Jamón serrano", "kg", 14.5], ["Queso crema", "kg", 6.2]],
};
const SUPPLIERS: Record<string, string[]> = {
  general: ["Mayorista Central", "Distribuciones Levante", "Cash & Carry Norte"],
  zapatillas: ["Sneaker Wholesale EU", "Distribuciones Deportivas", "Outlet Mayorista"],
  moda: ["Textil Mayorista Madrid", "Moda B2B Europa", "Confecciones del Sur"],
  restauracion: ["Makro", "Distribuciones Hostelería Sur", "Mercamadrid Frutas Paco", "Cash & Carry GM"],
  motor: ["Subastas BCA", "Ganvam Profesional", "Autorola"],
};

async function seedMarket(orgId: string, sectorId: string) {
  const products = await db.product.findMany({ where: { orgId } });
  const comps = [];
  for (const [name, kind] of COMPETITORS[sectorId] ?? COMPETITORS.general) {
    comps.push(await db.competitor.create({ data: { orgId, name, kind } }));
  }
  for (const p of products) {
    for (const c of comps) {
      if (Math.random() < 0.2) continue;
      const factor = 0.82 + Math.random() * 0.4;
      await db.competitorPrice.create({
        data: { orgId, competitorId: c.id, productId: p.id, priceCents: Math.round((p.priceCents * factor) / 5) * 5, note: p.name },
      });
    }
  }
  const sups = [];
  for (const name of SUPPLIERS[sectorId] ?? SUPPLIERS.general) {
    sups.push(await db.supplier.create({ data: { orgId, name, phone: `91${String(rand(1e7)).padStart(7, "0")}` } }));
  }
  const items = SUPPLIES[sectorId]
    ? SUPPLIES[sectorId].map(([name, unit, base]) => ({ name, unit, base, productId: null as string | null }))
    : products.map((p) => ({ name: p.name, unit: "unidad", base: (p.costCents || p.priceCents * 0.5) / 100, productId: p.id }));
  for (const it of items) {
    const item = await db.supplyItem.create({ data: { orgId, name: it.name, unit: it.unit, productId: it.productId } });
    let first: string | null = null;
    for (const s of sups) {
      if (Math.random() < 0.15) continue;
      await db.supplierPrice.create({
        data: { orgId, supplierId: s.id, supplyItemId: item.id, priceCents: Math.round(it.base * (0.85 + Math.random() * 0.35) * 100), minOrder: Math.random() < 0.4 ? "50 €" : null },
      });
      first ??= s.id;
    }
    // El proveedor "actual" no siempre es el más barato: así se ve el aviso de ahorro
    if (first) await db.supplyItem.update({ where: { id: item.id }, data: { currentSupplierId: first } });
  }
}

main().finally(() => db.$disconnect());
