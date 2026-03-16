-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ViewerType" AS ENUM ('ANONYMOUS', 'AUTHENTICATED');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'DISMISSED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "FlagSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "FlagReviewActionType" AS ENUM ('DISMISS', 'CONFIRM');

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "primaryAgentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "surfaceSqm" DECIMAL(10,2) NOT NULL,
    "propertyType" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyCoListing" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,

    CONSTRAINT "PropertyCoListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyView" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "viewerType" "ViewerType" NOT NULL,
    "viewerAgentId" TEXT,
    "visitorId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspiciousFlag" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" "FlagStatus" NOT NULL DEFAULT 'OPEN',
    "source" "FlagSource" NOT NULL DEFAULT 'AUTO',
    "confidenceScore" INTEGER NOT NULL,
    "primaryReason" TEXT NOT NULL,
    "detailsJson" JSONB,
    "triggeredRule" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedByAgentId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewReason" TEXT,

    CONSTRAINT "SuspiciousFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlagReviewAction" (
    "id" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "action" "FlagReviewActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlagReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE INDEX "Property_primaryAgentId_status_createdAt_idx" ON "Property"("primaryAgentId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Property_primaryAgentId_soldAt_idx" ON "Property"("primaryAgentId", "soldAt" DESC);

-- CreateIndex
CREATE INDEX "Property_status_city_propertyType_idx" ON "Property"("status", "city", "propertyType");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyCoListing_propertyId_agentId_key" ON "PropertyCoListing"("propertyId", "agentId");

-- CreateIndex
CREATE INDEX "PropertyView_propertyId_viewedAt_idx" ON "PropertyView"("propertyId", "viewedAt" DESC);

-- CreateIndex
CREATE INDEX "PropertyView_viewedAt_idx" ON "PropertyView"("viewedAt" DESC);

-- CreateIndex
CREATE INDEX "SuspiciousFlag_propertyId_status_idx" ON "SuspiciousFlag"("propertyId", "status");

-- CreateIndex
CREATE INDEX "SuspiciousFlag_status_createdAt_idx" ON "SuspiciousFlag"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_primaryAgentId_fkey" FOREIGN KEY ("primaryAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCoListing" ADD CONSTRAINT "PropertyCoListing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCoListing" ADD CONSTRAINT "PropertyCoListing_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_viewerAgentId_fkey" FOREIGN KEY ("viewerAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspiciousFlag" ADD CONSTRAINT "SuspiciousFlag_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspiciousFlag" ADD CONSTRAINT "SuspiciousFlag_reviewedByAgentId_fkey" FOREIGN KEY ("reviewedByAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlagReviewAction" ADD CONSTRAINT "FlagReviewAction_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "SuspiciousFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlagReviewAction" ADD CONSTRAINT "FlagReviewAction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
