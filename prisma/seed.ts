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

async function main() {
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
    console.log(`✔ ${sector.name}: ${email} / demo1234`);
  }
}

main().finally(() => db.$disconnect());
