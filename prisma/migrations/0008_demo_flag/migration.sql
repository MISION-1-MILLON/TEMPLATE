-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;


-- Marca como "de ejemplo" los productos cargados al registrarse antes de existir este campo
-- (mismo nombre que un producto de ejemplo y creados en el primer minuto del negocio)
UPDATE "Product" p SET "isDemo" = true
FROM "Organization" o
WHERE p."orgId" = o.id
  AND p.name IN ('Producto de ejemplo A', 'Producto de ejemplo B', 'Air Max 90', 'Samba OG', 'Jordan 1 High ''Chicago''', 'Gel-Kayano 14', 'Camiseta básica oversize', 'Vaquero recto', 'Abrigo de paño', 'Croquetas de jamón (6 uds)', 'Patatas bravas', 'Arroz meloso de setas', 'Tarta de queso', 'Caña', 'Golf 1.5 TSI Life', 'Tucson 1.6 HEV')
  AND p."createdAt" < o."createdAt" + interval '1 minute';
