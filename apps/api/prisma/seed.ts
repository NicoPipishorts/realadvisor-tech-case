import {
  FlagSource,
  FlagStatus,
  PrismaClient,
  PropertyStatus,
  ViewerType
} from '@prisma/client';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { resolve } from 'node:path';

import { rebuildAgentAnalytics } from '../src/lib/analytics.js';

config({ path: resolve(process.cwd(), '../../.env') });
config();

const prisma = new PrismaClient();

type SeedAgent = {
  name: string;
  email: string;
  city: string;
  agencyKey: 'alpine' | 'lakeside';
};

const agents: SeedAgent[] = [
  {
    name: 'Alice Martin',
    email: 'alice@realadvisor.local',
    city: 'Lausanne',
    agencyKey: 'alpine'
  },
  {
    name: 'Julien Morel',
    email: 'julien@realadvisor.local',
    city: 'Geneva',
    agencyKey: 'alpine'
  },
  {
    name: 'Sophie Keller',
    email: 'sophie@realadvisor.local',
    city: 'Montreux',
    agencyKey: 'lakeside'
  }
];

const propertyTypes = ['apartment', 'house', 'villa', 'loft', 'studio'] as const;
const descriptors = [
  'Bright',
  'Refined',
  'Panoramic',
  'Elegant',
  'Modern',
  'Quiet',
  'Renovated',
  'Sunlit',
  'Premium',
  'Charming'
] as const;
const amenities = [
  'terrace',
  'lake view',
  'garden',
  'parking',
  'home office',
  'renovated kitchen',
  'balcony',
  'double living room',
  'private cellar',
  'south-facing windows'
] as const;
const streetNames = [
  'Rue du Lac',
  'Avenue des Alpes',
  'Chemin des Fleurs',
  'Rue du Centre',
  'Quai des Roses',
  'Chemin du Midi',
  'Avenue de la Gare',
  'Route des Vignes',
  'Rue des Jardins',
  'Avenue du Parc'
] as const;
const portfolioSize = 24;
const imageKeywordsByType = {
  apartment: 'apartment,interior',
  house: 'house,home',
  villa: 'villa,house',
  loft: 'loft,interior',
  studio: 'studio,interior'
} as const;

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const buildStatus = (index: number) => {
  if (index % 10 === 0) {
    return PropertyStatus.SOLD;
  }

  if (index % 7 === 0) {
    return PropertyStatus.ARCHIVED;
  }

  if (index % 5 === 0) {
    return PropertyStatus.DRAFT;
  }

  return PropertyStatus.ACTIVE;
};

const buildPrice = (propertyType: (typeof propertyTypes)[number], index: number) => {
  const baseByType = {
    apartment: 780000,
    house: 1450000,
    villa: 2650000,
    loft: 1180000,
    studio: 520000
  };

  return String(baseByType[propertyType] + index * 18500);
};

const buildSurface = (propertyType: (typeof propertyTypes)[number], index: number) => {
  const baseByType = {
    apartment: 82,
    house: 148,
    villa: 228,
    loft: 116,
    studio: 39
  };

  return String(baseByType[propertyType] + (index % 4) * 9);
};

const buildPublicImageUrl = (
  propertyType: (typeof propertyTypes)[number],
  agentIndex: number,
  index: number
) =>
  `https://loremflickr.com/1600/900/${imageKeywordsByType[propertyType]}?lock=${
    agentIndex * portfolioSize + index + 1
  }`;

const buildPropertySet = (agent: SeedAgent, agentIndex: number) =>
  Array.from({ length: portfolioSize }, (_, index) => {
    const propertyType = propertyTypes[index % propertyTypes.length];
    const descriptor = descriptors[(index + agentIndex) % descriptors.length];
    const amenity = amenities[(index * 2 + agentIndex) % amenities.length];
    const streetName = streetNames[(index + agentIndex * 3) % streetNames.length];
    const status = buildStatus(index);
    const createdDaysAgo = 92 - index * 3 - agentIndex * 2;
    const activatedDaysAgo =
      status === PropertyStatus.DRAFT ? null : Math.max(createdDaysAgo - 5, 1);
    const soldDaysAgo =
      status === PropertyStatus.SOLD ? Math.max((activatedDaysAgo ?? 25) - 18, 1) : null;

    return {
      title: `${descriptor} ${propertyType} in ${agent.city}`,
      description: `${descriptor} ${propertyType} with ${amenity} in ${agent.city}. Well suited for buyers looking for a balanced mix of location, comfort, and long-term value.`,
      imageUrl: buildPublicImageUrl(propertyType, agentIndex, index),
      addressLine1: `${12 + index} ${streetName}`,
      city: agent.city,
      postalCode: `${1000 + agentIndex * 100 + index}`,
      country: 'Switzerland',
      price: buildPrice(propertyType, index),
      surfaceSqm: buildSurface(propertyType, index),
      propertyType,
      status,
      createdAt: daysAgo(createdDaysAgo),
      activatedAt: activatedDaysAgo ? daysAgo(activatedDaysAgo) : null,
      soldAt: soldDaysAgo ? daysAgo(soldDaysAgo) : null,
      archivedAt: status === PropertyStatus.ARCHIVED ? daysAgo(Math.max(createdDaysAgo - 12, 1)) : null
    };
  });

const seed = async () => {
  await prisma.flagReviewAction.deleteMany();
  await prisma.suspiciousFlag.deleteMany();
  await prisma.propertyView.deleteMany();
  await prisma.propertyCoListing.deleteMany();
  await prisma.property.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.agency.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  const agencyMap = {
    alpine: await prisma.agency.create({ data: { name: 'Alpine Realty' } }),
    lakeside: await prisma.agency.create({ data: { name: 'Lakeside Estates' } })
  };

  const createdAgents = await Promise.all(
    agents.map((agent) =>
      prisma.agent.create({
        data: {
          agencyId: agencyMap[agent.agencyKey].id,
          name: agent.name,
          email: agent.email,
          passwordHash
        }
      })
    )
  );

  const propertiesByAgent = await Promise.all(
    createdAgents.map(async (agent, agentIndex) => {
      const portfolio = buildPropertySet(agents[agentIndex], agentIndex);
      const createdProperties = [];

      for (const property of portfolio) {
        const createdProperty = await prisma.property.create({
          data: {
            primaryAgentId: agent.id,
            ...property
          }
        });

        createdProperties.push(createdProperty);
      }

      return createdProperties;
    })
  );

  await prisma.property.update({
    where: { id: propertiesByAgent[0][2].id },
    data: {
      title: 'Underpriced penthouse opportunity',
      description:
        'Premium penthouse listed below market with urgent sale language and unusually low price per sqm.',
      addressLine1: '55 Quai du Mont',
      city: 'Lausanne',
      postalCode: '1006',
      price: '450000',
      surfaceSqm: '140',
      propertyType: 'apartment',
      status: PropertyStatus.ACTIVE
    }
  });

  await prisma.property.update({
    where: { id: propertiesByAgent[1][4].id },
    data: {
      title: 'Lakefront apartment investment deal',
      description:
        'Bright apartment with lakefront positioning, private cellar, and immediate investor upside.',
      addressLine1: '18 Rue du Lac',
      city: 'Geneva',
      postalCode: '1204',
      status: PropertyStatus.ACTIVE
    }
  });

  await prisma.property.update({
    where: { id: propertiesByAgent[2][5].id },
    data: {
      title: 'Lakefront apartment investment deal',
      description:
        'Bright apartment with lakefront positioning, private cellar, and immediate investor upside.',
      addressLine1: '18 Rue du Lac',
      city: 'Montreux',
      postalCode: '1820',
      status: PropertyStatus.ACTIVE
    }
  });

  await Promise.all([
    prisma.propertyCoListing.create({
      data: {
        propertyId: propertiesByAgent[0][1].id,
        agentId: createdAgents[1].id
      }
    }),
    prisma.propertyCoListing.create({
      data: {
        propertyId: propertiesByAgent[0][1].id,
        agentId: createdAgents[2].id
      }
    }),
    prisma.propertyCoListing.create({
      data: {
        propertyId: propertiesByAgent[0][9].id,
        agentId: createdAgents[2].id
      }
    }),
    prisma.propertyCoListing.create({
      data: {
        propertyId: propertiesByAgent[1][6].id,
        agentId: createdAgents[0].id
      }
    }),
    prisma.propertyCoListing.create({
      data: {
        propertyId: propertiesByAgent[1][12].id,
        agentId: createdAgents[2].id
      }
    }),
    prisma.propertyCoListing.create({
      data: {
        propertyId: propertiesByAgent[2][3].id,
        agentId: createdAgents[0].id
      }
    }),
    prisma.propertyCoListing.create({
      data: {
        propertyId: propertiesByAgent[2][3].id,
        agentId: createdAgents[1].id
      }
    }),
    prisma.propertyCoListing.create({
      data: {
        propertyId: propertiesByAgent[2][14].id,
        agentId: createdAgents[1].id
      }
    })
  ]);

  const allProperties = propertiesByAgent.flat();
  const viewOperations = allProperties.flatMap((property, propertyIndex) => {
    const totalViews = 4 + (propertyIndex % 6);

    return Array.from({ length: totalViews }, (_, viewIndex) =>
      prisma.propertyView.create({
        data: {
          propertyId: property.id,
          ownerAgentId: property.primaryAgentId,
          viewerType: ViewerType.ANONYMOUS,
          visitorId: `visitor-${propertyIndex}-${viewIndex}`,
          viewedAt: daysAgo((propertyIndex * 3 + viewIndex * 7) % 88 + 1)
        }
      })
    );
  });

  await Promise.all(viewOperations);
  await Promise.all(createdAgents.map((agent) => rebuildAgentAnalytics(prisma, agent.id)));

  const suspiciousSeeds = [
    {
      propertyId: propertiesByAgent[0][2].id,
      confidenceScore: 91,
      primaryReason: 'Price per sqm is far below similar Lausanne apartment listings.',
      triggeredRule: 'LOW_PRICE_PER_SQM',
      detailsJson: {
        baselinePricePerSqm: 13200,
        propertyPricePerSqm: 3214
      }
    },
    {
      propertyId: propertiesByAgent[1][4].id,
      confidenceScore: 78,
      primaryReason: 'Very similar title and description appear under a different agent.',
      triggeredRule: 'CROSS_AGENT_DUPLICATE',
      detailsJson: {
        matchedPropertyId: propertiesByAgent[2][5].id
      }
    },
    {
      propertyId: propertiesByAgent[2][5].id,
      confidenceScore: 74,
      primaryReason: 'Listing content overlaps with another active listing from a different agent.',
      triggeredRule: 'CROSS_AGENT_DUPLICATE',
      detailsJson: {
        matchedPropertyId: propertiesByAgent[1][4].id
      }
    },
    {
      propertyId: propertiesByAgent[2][8].id,
      confidenceScore: 66,
      primaryReason: 'High-value listing posted unusually quickly within a new portfolio.',
      triggeredRule: 'NEW_AGENT_HIGH_VALUE_PATTERN',
      detailsJson: {
        recentHighValueListings: 4
      }
    },
    {
      propertyId: propertiesByAgent[0][11].id,
      confidenceScore: 83,
      primaryReason: 'Description uses urgent-payment language and requests off-platform contact.',
      triggeredRule: 'OFF_PLATFORM_CONTACT_PATTERN',
      detailsJson: {
        matchedTerms: ['urgent transfer', 'contact directly', 'reserve today']
      }
    },
    {
      propertyId: propertiesByAgent[1][15].id,
      confidenceScore: 71,
      primaryReason: 'Photos and marketing copy appear reused across unrelated luxury listings.',
      triggeredRule: 'REUSED_MARKETING_ASSETS',
      detailsJson: {
        matchedListingCount: 3
      }
    },
    {
      propertyId: propertiesByAgent[2][17].id,
      confidenceScore: 58,
      primaryReason: 'Flagged manually by agency operations after an identity verification mismatch.',
      triggeredRule: 'MANUAL_REVIEW_MISMATCH',
      detailsJson: {
        sourceNote: 'Agency ops manual report'
      },
      source: FlagSource.MANUAL
    }
  ];

  await Promise.all(
    suspiciousSeeds.map((flag) =>
      prisma.suspiciousFlag.create({
        data: {
          propertyId: flag.propertyId,
          status: FlagStatus.OPEN,
          source: flag.source ?? FlagSource.AUTO,
          confidenceScore: flag.confidenceScore,
          primaryReason: flag.primaryReason,
          triggeredRule: flag.triggeredRule,
          detailsJson: flag.detailsJson
        }
      })
    )
  );

  console.log('Seed complete.');
  console.log('Seeded 3 agents with 24 properties each, 8 co-listing links, and 7 suspicious flags.');
  console.log('Login users:');
  console.log('- alice@realadvisor.local / password123');
  console.log('- julien@realadvisor.local / password123');
  console.log('- sophie@realadvisor.local / password123');
};

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
