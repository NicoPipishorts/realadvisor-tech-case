-- AlterTable
ALTER TABLE "PropertyView" ADD COLUMN "ownerAgentId" TEXT;

-- Backfill denormalized owner agent on existing view events
UPDATE "PropertyView" pv
SET "ownerAgentId" = p."primaryAgentId"
FROM "Property" p
WHERE pv."propertyId" = p."id"
  AND pv."ownerAgentId" IS NULL;

-- AlterTable
ALTER TABLE "PropertyView" ALTER COLUMN "ownerAgentId" SET NOT NULL;

-- CreateTable
CREATE TABLE "AgentDashboardStats" (
    "agentId" TEXT NOT NULL,
    "draftCount" INTEGER NOT NULL DEFAULT 0,
    "activeCount" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "archivedCount" INTEGER NOT NULL DEFAULT 0,
    "totalViewsAllTime" INTEGER NOT NULL DEFAULT 0,
    "cumulativeDaysToSell" INTEGER NOT NULL DEFAULT 0,
    "soldWithActivationCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentDashboardStats_pkey" PRIMARY KEY ("agentId")
);

-- CreateTable
CREATE TABLE "AgentDailyStat" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "salesRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "AgentDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAnalytics" (
    "propertyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "lifetimeViewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),

    CONSTRAINT "PropertyAnalytics_pkey" PRIMARY KEY ("propertyId")
);

-- CreateTable
CREATE TABLE "PropertyViewDaily" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyViewDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyView_ownerAgentId_viewedAt_idx" ON "PropertyView"("ownerAgentId", "viewedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AgentDailyStat_agentId_date_key" ON "AgentDailyStat"("agentId", "date");

-- CreateIndex
CREATE INDEX "AgentDailyStat_agentId_date_idx" ON "AgentDailyStat"("agentId", "date" DESC);

-- CreateIndex
CREATE INDEX "PropertyAnalytics_agentId_lifetimeViewCount_lastViewedAt_idx" ON "PropertyAnalytics"("agentId", "lifetimeViewCount" DESC, "lastViewedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyViewDaily_agentId_propertyId_date_key" ON "PropertyViewDaily"("agentId", "propertyId", "date");

-- CreateIndex
CREATE INDEX "PropertyViewDaily_agentId_date_idx" ON "PropertyViewDaily"("agentId", "date" DESC);

-- CreateIndex
CREATE INDEX "PropertyViewDaily_propertyId_date_idx" ON "PropertyViewDaily"("propertyId", "date" DESC);

-- AddForeignKey
ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_ownerAgentId_fkey" FOREIGN KEY ("ownerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDashboardStats" ADD CONSTRAINT "AgentDashboardStats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDailyStat" ADD CONSTRAINT "AgentDailyStat_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAnalytics" ADD CONSTRAINT "PropertyAnalytics_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAnalytics" ADD CONSTRAINT "PropertyAnalytics_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyViewDaily" ADD CONSTRAINT "PropertyViewDaily_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyViewDaily" ADD CONSTRAINT "PropertyViewDaily_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
