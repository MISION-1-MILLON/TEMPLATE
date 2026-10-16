-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "poolPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "poolShare" BOOLEAN NOT NULL DEFAULT true;

