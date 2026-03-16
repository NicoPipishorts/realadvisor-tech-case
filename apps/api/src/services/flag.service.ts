import {
  FlagReviewActionType,
  FlagStatus,
  PropertyStatus,
  type PrismaClient
} from '@prisma/client';

import { applyPropertyStateDelta } from '../lib/analytics.js';

type AppPrisma = PrismaClient;

export const getOwnedOpenFlag = async (prisma: AppPrisma, agentId: string, flagId: string) =>
  prisma.suspiciousFlag.findFirst({
    where: {
      id: flagId,
      status: FlagStatus.OPEN,
      property: {
        primaryAgentId: agentId
      }
    },
    include: {
      property: true
    }
  });

export const getOwnedConfirmedFlag = async (
  prisma: AppPrisma,
  agentId: string,
  flagId: string
) =>
  prisma.suspiciousFlag.findFirst({
    where: {
      id: flagId,
      status: FlagStatus.CONFIRMED,
      property: {
        primaryAgentId: agentId
      }
    },
    include: {
      property: true
    }
  });

export const dismissFlag = async (
  prisma: AppPrisma,
  agentId: string,
  flagId: string,
  reason: string
) => {
  const flag = await getOwnedOpenFlag(prisma, agentId, flagId);

  if (!flag) {
    throw new Error('Flag not found.');
  }

  await prisma.$transaction([
    prisma.suspiciousFlag.update({
      where: { id: flag.id },
      data: {
        status: FlagStatus.DISMISSED,
        reviewedByAgentId: agentId,
        reviewedAt: new Date(),
        reviewReason: reason
      }
    }),
    prisma.flagReviewAction.create({
      data: {
        flagId: flag.id,
        agentId,
        action: FlagReviewActionType.DISMISS,
        reason
      }
    })
  ]);

  return true;
};

export const confirmScam = async (
  prisma: AppPrisma,
  agentId: string,
  flagId: string,
  reason: string
) => {
  const flag = await getOwnedOpenFlag(prisma, agentId, flagId);

  if (!flag) {
    throw new Error('Flag not found.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.suspiciousFlag.update({
      where: { id: flag.id },
      data: {
        status: FlagStatus.CONFIRMED,
        reviewedByAgentId: agentId,
        reviewedAt: new Date(),
        reviewReason: reason
      }
    });

    await tx.flagReviewAction.create({
      data: {
        flagId: flag.id,
        agentId,
        action: FlagReviewActionType.CONFIRM,
        reason
      }
    });

    const updatedProperty = await tx.property.update({
      where: { id: flag.propertyId },
      data: {
        status: PropertyStatus.ARCHIVED,
        archivedAt: new Date()
      }
    });

    await applyPropertyStateDelta(tx, flag.property, updatedProperty);
  });

  return true;
};

export const restoreConfirmedScam = async (
  prisma: AppPrisma,
  agentId: string,
  flagId: string,
  reason: string
) => {
  const flag = await getOwnedConfirmedFlag(prisma, agentId, flagId);

  if (!flag) {
    throw new Error('Confirmed scam flag not found.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.suspiciousFlag.update({
      where: { id: flag.id },
      data: {
        status: FlagStatus.DISMISSED,
        reviewedByAgentId: agentId,
        reviewedAt: new Date(),
        reviewReason: reason
      }
    });

    await tx.flagReviewAction.create({
      data: {
        flagId: flag.id,
        agentId,
        action: FlagReviewActionType.DISMISS,
        reason
      }
    });

    const updatedProperty = await tx.property.update({
      where: { id: flag.propertyId },
      data: {
        status:
          flag.property.status === PropertyStatus.ARCHIVED
            ? PropertyStatus.ACTIVE
            : flag.property.status,
        archivedAt: null
      }
    });

    await applyPropertyStateDelta(tx, flag.property, updatedProperty);
  });

  return true;
};
