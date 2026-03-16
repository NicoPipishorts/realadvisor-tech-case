import { FlagStatus, PropertyStatus, type Prisma, type Property } from '@prisma/client';
import { z } from 'zod';

export const propertyInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  addressLine1: z.string().trim().min(3).max(140),
  city: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(2).max(20),
  country: z.string().trim().min(2).max(80),
  price: z.number().positive(),
  surfaceSqm: z.number().positive(),
  propertyType: z.string().trim().min(2).max(40),
  status: z.nativeEnum(PropertyStatus)
});

export type PropertyInput = z.infer<typeof propertyInputSchema>;

export const propertyInclude = {
  analytics: {
    select: {
      lifetimeViewCount: true
    }
  },
  suspiciousFlags: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      status: true,
      confidenceScore: true,
      primaryReason: true,
      triggeredRule: true,
      reviewReason: true
    }
  }
} satisfies Prisma.PropertyInclude;

export type PropertyWithRelations = Prisma.PropertyGetPayload<{
  include: typeof propertyInclude;
}>;

export const parseOptionalDate = (value?: string | null, useEndOfDay = false) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (useEndOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const buildLifecycleTimestamps = (status: PropertyStatus, existing?: Property | null) => {
  const now = new Date();

  switch (status) {
    case PropertyStatus.DRAFT:
      return {
        activatedAt: null,
        soldAt: null,
        archivedAt: null
      };
    case PropertyStatus.ACTIVE:
      return {
        activatedAt: existing?.activatedAt ?? now,
        soldAt: null,
        archivedAt: null
      };
    case PropertyStatus.SOLD:
      return {
        activatedAt: existing?.activatedAt ?? now,
        soldAt: existing?.soldAt ?? now,
        archivedAt: null
      };
    case PropertyStatus.ARCHIVED:
      return {
        activatedAt: existing?.activatedAt ?? null,
        soldAt: existing?.soldAt ?? null,
        archivedAt: existing?.archivedAt ?? now
      };
  }
};

export const mapProperty = (property: PropertyWithRelations) => {
  const latestFlag = property.suspiciousFlags[0] ?? null;
  const flag = property.suspiciousFlags.find((item) => item.status === FlagStatus.OPEN) ?? null;

  return {
    id: property.id,
    title: property.title,
    description: property.description,
    addressLine1: property.addressLine1,
    city: property.city,
    postalCode: property.postalCode,
    country: property.country,
    price: Number(property.price),
    surfaceSqm: Number(property.surfaceSqm),
    propertyType: property.propertyType,
    status: property.status,
    createdAt: property.createdAt.toISOString(),
    viewCount: property.analytics?.lifetimeViewCount ?? 0,
    isFlagged: Boolean(flag),
    flag,
    latestFlag
  };
};
