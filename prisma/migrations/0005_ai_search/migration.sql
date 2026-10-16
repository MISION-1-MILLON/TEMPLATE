-- CreateTable
CREATE TABLE "AiSearch" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT,
    "ok" BOOLEAN NOT NULL,
    "results" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiSearch_orgId_createdAt_idx" ON "AiSearch"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AiSearch_orgId_kind_targetId_idx" ON "AiSearch"("orgId", "kind", "targetId");

-- AddForeignKey
ALTER TABLE "AiSearch" ADD CONSTRAINT "AiSearch_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

