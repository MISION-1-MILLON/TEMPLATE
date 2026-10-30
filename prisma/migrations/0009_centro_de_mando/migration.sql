-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "locationIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "modules" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "discountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "locationId" TEXT;

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "opensAt" TEXT NOT NULL DEFAULT '09:00',
    "closesAt" TEXT NOT NULL DEFAULT '21:00',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "locationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "token" TEXT NOT NULL,
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStock" (
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductStock_pkey" PRIMARY KEY ("productId","locationId")
);

-- CreateIndex
CREATE INDEX "Location_orgId_idx" ON "Location"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_orgId_email_key" ON "Invitation"("orgId", "email");

-- CreateIndex
CREATE INDEX "ProductStock_locationId_idx" ON "ProductStock"("locationId");

-- CreateIndex
CREATE INDEX "Sale_locationId_createdAt_idx" ON "Sale"("locationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Datos de negocios existentes ──────────────────────────────────────
-- Un local por negocio, con el nombre del negocio
INSERT INTO "Location" ("id", "orgId", "name", "address")
SELECT 'loc_' || o."id", o."id", o."name", o."address" FROM "Organization" o;

-- Ventas, stock y caja pasan a ese local
UPDATE "Sale" s SET "locationId" = 'loc_' || s."orgId" WHERE s."locationId" IS NULL;
UPDATE "StockMovement" m SET "locationId" = 'loc_' || m."orgId" WHERE m."locationId" IS NULL;
UPDATE "CashMovement" c SET "locationId" = 'loc_' || c."orgId" WHERE c."locationId" IS NULL;

-- Las existencias actuales quedan en ese local
INSERT INTO "ProductStock" ("productId", "locationId", "quantity")
SELECT p."id", 'loc_' || p."orgId", p."stock" FROM "Product" p;

-- El antiguo «admin» es ahora gerente
UPDATE "Membership" SET "role" = 'manager' WHERE "role" = 'admin';

-- Todas las herramientas encendidas, como hasta ahora
UPDATE "Organization" SET "modules" = ARRAY['gestion','competencia','proveedores','precio','tienda','publica','mercado','fideliza'] WHERE cardinality("modules") = 0;
