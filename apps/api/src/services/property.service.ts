import { FlagStatus, Prisma, type PrismaClient } from '@prisma/client';

import { applyPropertyStateDelta } from '../lib/analytics.js';
import { runAutomaticDetection } from '../lib/detection.js';
import {
  buildLifecycleTimestamps,
  mapProperty,
  parseOptionalDate,
  propertyInclude,
  propertyInputSchema,
  type PropertyInput,
  type PropertyWithRelations
} from '../graphql/property.js';

type AppPrisma = PrismaClient;

export const getOwnedProperty = async (prisma: AppPrisma, agentId: string, id: string) =>
  prisma.property.findFirst({
    where: {
      id,
      primaryAgentId: agentId
    }
  });

export const listProperties = async (
  prisma: AppPrisma,
  agentId: string,
  args: {
    status?: PropertyInput['status'];
    flaggedOnly?: boolean;
    fromDate?: string | null;
    toDate?: string | null;
    page?: number;
    pageSize?: number;
  }
) => {
  const page = Math.max(args.page ?? 1, 1);
  const pageSize = Math.max(1, Math.min(args.pageSize ?? 20, 50));
  const fromDate = parseOptionalDate(args.fromDate);
  const toDate = parseOptionalDate(args.toDate, true);
  const createdAtFilter =
    fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {})
          }
        }
      : {};

  const where: Prisma.PropertyWhereInput = {
    primaryAgentId: agentId,
    ...(args.status ? { status: args.status } : {}),
    ...(args.flaggedOnly
      ? {
          suspiciousFlags: {
            some: {
              status: FlagStatus.OPEN
            }
          }
        }
      : {}),
    ...createdAtFilter
  };

  const [totalCount, nodes] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: propertyInclude
    })
  ]);

  return {
    totalCount,
    nodes: nodes.map((property) => mapProperty(property as PropertyWithRelations))
  };
};

export const getProperty = async (prisma: AppPrisma, agentId: string, id: string) => {
  const property = await prisma.property.findFirst({
    where: {
      id,
      primaryAgentId: agentId
    },
    include: propertyInclude
  });

  return property ? mapProperty(property as PropertyWithRelations) : null;
};

const buildDetectionInput = (property: {
  id: string;
  primaryAgentId: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  addressLine1: string;
  city: string;
  postalCode: string;
  price: Prisma.Decimal;
  surfaceSqm: Prisma.Decimal;
  propertyType: string;
  status: PropertyInput['status'];
}) => ({
  propertyId: property.id,
  primaryAgentId: property.primaryAgentId,
  title: property.title,
  description: property.description,
  imageUrl: property.imageUrl,
  addressLine1: property.addressLine1,
  city: property.city,
  postalCode: property.postalCode,
  price: Number(property.price),
  surfaceSqm: Number(property.surfaceSqm),
  propertyType: property.propertyType,
  status: property.status
});

export const createProperty = async (
  prisma: AppPrisma,
  agentId: string,
  rawInput: PropertyInput
) => {
  const input = propertyInputSchema.parse(rawInput);
  const property = await prisma.$transaction(async (tx) => {
    const createdProperty = await tx.property.create({
      data: {
        primaryAgentId: agentId,
        ...input,
        ...buildLifecycleTimestamps(input.status)
      },
      include: propertyInclude
    });

    await applyPropertyStateDelta(tx, null, createdProperty);

    return createdProperty;
  });

  await runAutomaticDetection(prisma, buildDetectionInput(property));

  const refreshedProperty = await prisma.property.findUniqueOrThrow({
    where: { id: property.id },
    include: propertyInclude
  });

  return mapProperty(refreshedProperty as PropertyWithRelations);
};

export const updateProperty = async (
  prisma: AppPrisma,
  agentId: string,
  id: string,
  rawInput: PropertyInput
) => {
  const existingProperty = await getOwnedProperty(prisma, agentId, id);

  if (!existingProperty) {
    throw new Error('Property not found.');
  }

  const input = propertyInputSchema.parse(rawInput);
  const property = await prisma.$transaction(async (tx) => {
    const updatedProperty = await tx.property.update({
      where: { id: existingProperty.id },
      data: {
        ...input,
        ...buildLifecycleTimestamps(input.status, existingProperty)
      },
      include: propertyInclude
    });

    await applyPropertyStateDelta(tx, existingProperty, updatedProperty);

    return updatedProperty;
  });

  await runAutomaticDetection(prisma, buildDetectionInput(property));

  const refreshedProperty = await prisma.property.findUniqueOrThrow({
    where: { id: property.id },
    include: propertyInclude
  });

  return mapProperty(refreshedProperty as PropertyWithRelations);
};

export const deleteProperty = async (prisma: AppPrisma, agentId: string, id: string) => {
  const existingProperty = await getOwnedProperty(prisma, agentId, id);

  if (!existingProperty) {
    throw new Error('Property not found.');
  }

  await prisma.$transaction(async (tx) => {
    await applyPropertyStateDelta(tx, existingProperty, null);
    await tx.property.delete({
      where: { id: existingProperty.id }
    });
  });

  return true;
};
