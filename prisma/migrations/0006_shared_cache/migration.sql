-- AlterTable
ALTER TABLE "AiSearch" ADD COLUMN     "cached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "central" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PriceLookup" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "queryKey" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceLookup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceLookup_kind_queryKey_key" ON "PriceLookup"("kind", "queryKey");

