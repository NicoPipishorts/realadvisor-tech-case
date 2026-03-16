import { ViewerType, type PrismaClient, type PropertyView } from '@prisma/client';

import { recordPropertyViewAnalytics } from '../lib/analytics.js';

type AppPrisma = PrismaClient;

export const getPropertyViewHistory = async (
  prisma: AppPrisma,
  propertyId: string,
  limit?: number
) => {
  const safeLimit = Math.max(1, Math.min(limit ?? 20, 100));
  const views = await prisma.propertyView.findMany({
    where: { propertyId },
    orderBy: { viewedAt: 'desc' },
    take: safeLimit
  });

  return views.map((view: PropertyView) => ({
    id: view.id,
    viewerType: view.viewerType,
    visitorId: view.visitorId,
    viewedAt: view.viewedAt.toISOString()
  }));
};

export const recordPropertyView = async (
  prisma: AppPrisma,
  input: {
    propertyId: string;
    visitorId?: string | null;
    viewerAgentId?: string | null;
  }
) => {
  const property = await prisma.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true, primaryAgentId: true }
  });

  if (!property) {
    throw new Error('Property not found.');
  }

  const viewedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.propertyView.create({
      data: {
        propertyId: property.id,
        ownerAgentId: property.primaryAgentId,
        viewerType: input.viewerAgentId ? ViewerType.AUTHENTICATED : ViewerType.ANONYMOUS,
        viewerAgentId: input.viewerAgentId,
        visitorId: input.visitorId ?? null,
        viewedAt
      }
    });

    await recordPropertyViewAnalytics(tx, {
      propertyId: property.id,
      agentId: property.primaryAgentId,
      viewedAt
    });
  });

  return true;
};
