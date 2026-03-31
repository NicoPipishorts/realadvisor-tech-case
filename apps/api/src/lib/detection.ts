import {
  FlagSource,
  FlagStatus,
  Prisma,
  PropertyStatus,
  type PrismaClient
} from '@prisma/client';

const LOW_PRICE_RULE = 'LOW_PRICE_PER_SQM';
const DUPLICATE_RULE = 'CROSS_AGENT_DUPLICATE';
const AUTO_RULES = [LOW_PRICE_RULE, DUPLICATE_RULE];

type DetectionInput = {
  propertyId: string;
  primaryAgentId: string;
  title: string;
  description: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  price: number;
  surfaceSqm: number;
  propertyType: string;
  status: PropertyStatus;
};

type DetectionFlag = {
  confidenceScore: number;
  primaryReason: string;
  triggeredRule: string;
  detailsJson: Prisma.InputJsonValue;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Rule: LOW_PRICE_PER_SQM
// Triggers when a property's price/sqm is less than 65% of the average price/sqm
// of comparable listings (same city, same property type, surface within ±40%).
// Requires at least 3 comparable listings to establish a reliable baseline.
// Skipped entirely for DRAFT listings and properties with no surface area.
// Confidence score: 70–96, scaled up the further below the 65% threshold.
const buildLowPriceFlag = async (
  prisma: PrismaClient,
  property: DetectionInput
): Promise<DetectionFlag | null> => {
  // Only run on published listings with a valid surface
  if (property.status === PropertyStatus.DRAFT || property.surfaceSqm <= 0) {
    return null;
  }

  const pricePerSqm = property.price / property.surfaceSqm;

  // Comparable window: same city + type, surface within ±40% of this property
  const minSurface = property.surfaceSqm * 0.6;
  const maxSurface = property.surfaceSqm * 1.4;
  const comparables = await prisma.property.findMany({
    where: {
      id: { not: property.propertyId },
      status: { in: [PropertyStatus.ACTIVE, PropertyStatus.SOLD] },
      city: property.city,
      propertyType: property.propertyType,
      surfaceSqm: {
        gte: minSurface,
        lte: maxSurface
      }
    },
    select: {
      price: true,
      surfaceSqm: true
    }
  });

  const comparablePricePerSqm = comparables
    .map((comparable) => Number(comparable.price) / Number(comparable.surfaceSqm))
    .filter((value) => Number.isFinite(value) && value > 0);
  const sampleSize = comparablePricePerSqm.length;
  const baseline =
    sampleSize > 0
      ? comparablePricePerSqm.reduce((sum, value) => sum + value, 0) / sampleSize
      : null;

  // Need at least 3 comparables for a statistically meaningful baseline
  if (!baseline || sampleSize < 3) {
    return null;
  }

  const ratio = pricePerSqm / baseline;

  // Flag only if the property is priced below 65% of the market baseline
  if (ratio >= 0.65) {
    return null;
  }

  // Score scales from 70 (just below threshold) up to 96 (extreme underpricing)
  const confidenceScore = clamp(Math.round(70 + (0.65 - ratio) * 90), 70, 96);

  return {
    confidenceScore,
    primaryReason: `Price per sqm is significantly below similar ${property.city} ${property.propertyType} listings.`,
    triggeredRule: LOW_PRICE_RULE,
    detailsJson: {
      baselinePricePerSqm: Math.round(baseline),
      propertyPricePerSqm: Math.round(pricePerSqm),
      sampleSize
    }
  };
};

// Rule: CROSS_AGENT_DUPLICATE
// Triggers when a different agent has a listing that appears to be the same property.
// Two match conditions (either is sufficient to flag):
//   - Same address: normalized addressLine1 + postalCode match exactly (confidence 88)
//   - Same content: normalized title AND description both match exactly (confidence 76)
// Only compares against listings from other agents (same-agent duplicates are ignored).
// Normalization strips punctuation and collapses whitespace for fuzzy-tolerant comparison.
const buildDuplicateFlag = async (
  prisma: PrismaClient,
  property: DetectionInput
): Promise<DetectionFlag | null> => {
  const normalizedTitle = normalize(property.title);
  const normalizedDescription = normalize(property.description);
  const normalizedAddress = normalize(`${property.addressLine1} ${property.postalCode}`);

  // DB pre-filter: candidates must match on address OR title (exact, case-sensitive)
  // to narrow the result set before the normalized comparison below
  const candidates = await prisma.property.findMany({
    where: {
      id: { not: property.propertyId },
      primaryAgentId: { not: property.primaryAgentId },
      status: { in: [PropertyStatus.ACTIVE, PropertyStatus.DRAFT, PropertyStatus.SOLD] },
      OR: [
        {
          addressLine1: property.addressLine1,
          postalCode: property.postalCode
        },
        {
          title: property.title
        }
      ]
    },
    select: {
      id: true,
      title: true,
      description: true,
      addressLine1: true,
      postalCode: true
    },
    take: 10
  });

  // Apply normalized comparison to confirm a true match
  const match = candidates.find((candidate) => {
    const sameAddress =
      normalize(`${candidate.addressLine1} ${candidate.postalCode}`) === normalizedAddress;
    const sameContent =
      normalize(candidate.title) === normalizedTitle &&
      normalize(candidate.description) === normalizedDescription;

    return sameAddress || sameContent;
  });

  if (!match) {
    return null;
  }

  // Address match is stronger evidence than content match alone
  const sameAddress =
    normalize(`${match.addressLine1} ${match.postalCode}`) === normalizedAddress;
  const confidenceScore = sameAddress ? 88 : 76;

  return {
    confidenceScore,
    primaryReason: sameAddress
      ? 'Another agent has a listing at the same address.'
      : 'Another agent has a very similar title and description.',
    triggeredRule: DUPLICATE_RULE,
    detailsJson: {
      matchedPropertyId: match.id,
      matchedAddress: `${match.addressLine1} ${match.postalCode}`
    }
  };
};

export const runAutomaticDetection = async (
  prisma: PrismaClient,
  property: DetectionInput
) => {
  const [lowPriceFlag, duplicateFlag] = await Promise.all([
    buildLowPriceFlag(prisma, property),
    buildDuplicateFlag(prisma, property)
  ]);

  const nextFlags = [lowPriceFlag, duplicateFlag].filter(Boolean) as DetectionFlag[];
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Dismiss all previously open auto-flags for this property before inserting fresh ones,
    // ensuring stale flags don't persist if the property was edited and no longer triggers a rule
    await tx.suspiciousFlag.updateMany({
      where: {
        propertyId: property.propertyId,
        source: FlagSource.AUTO,
        status: FlagStatus.OPEN,
        triggeredRule: {
          in: AUTO_RULES
        }
      },
      data: {
        status: FlagStatus.DISMISSED,
        reviewedAt: now,
        reviewReason: 'Superseded by the latest automatic detection run.'
      }
    });

    for (const flag of nextFlags) {
      await tx.suspiciousFlag.create({
        data: {
          propertyId: property.propertyId,
          source: FlagSource.AUTO,
          status: FlagStatus.OPEN,
          confidenceScore: flag.confidenceScore,
          primaryReason: flag.primaryReason,
          triggeredRule: flag.triggeredRule,
          detailsJson: flag.detailsJson
        }
      });
    }
  });

  return nextFlags;
};
