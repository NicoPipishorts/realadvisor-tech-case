import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { PrismaClient, PropertyStatus, ViewerType, FlagSource, FlagStatus } from '@prisma/client';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '../../.env') });
config();

const prisma = new PrismaClient();

const properties = [
  {
    title: 'Bright family apartment near the lake',
    description: 'Three-bedroom apartment with renovated kitchen and open living area.',
    addressLine1: '12 Rue du Lac',
    city: 'Lausanne',
    postalCode: '1007',
    country: 'Switzerland',
    price: '1350000',
    surfaceSqm: '112',
    propertyType: 'apartment',
    status: PropertyStatus.ACTIVE
  },
  {
    title: 'Townhouse with private garden',
    description: 'Spacious townhouse with garden and two covered parking spots.',
    addressLine1: '8 Chemin des Fleurs',
    city: 'Lausanne',
    postalCode: '1010',
    country: 'Switzerland',
    price: '1680000',
    surfaceSqm: '154',
    propertyType: 'house',
    status: PropertyStatus.SOLD,
    soldAtOffsetDays: 8,
    activatedAtOffsetDays: 42
  },
  {
    title: 'Modern city studio',
    description: 'Compact studio with balcony, ideal for first-time buyers.',
    addressLine1: '4 Rue Centrale',
    city: 'Geneva',
    postalCode: '1201',
    country: 'Switzerland',
    price: '620000',
    surfaceSqm: '43',
    propertyType: 'apartment',
    status: PropertyStatus.ACTIVE
  },
  {
    title: 'Luxury villa with panoramic views',
    description: 'High-end villa with pool, terrace, and unobstructed lake view.',
    addressLine1: '19 Avenue des Alpes',
    city: 'Geneva',
    postalCode: '1207',
    country: 'Switzerland',
    price: '3200000',
    surfaceSqm: '240',
    propertyType: 'house',
    status: PropertyStatus.DRAFT
  },
  {
    title: 'Underpriced penthouse opportunity',
    description: 'Premium penthouse listed well below market with urgent sale messaging.',
    addressLine1: '55 Quai du Mont',
    city: 'Geneva',
    postalCode: '1204',
    country: 'Switzerland',
    price: '450000',
    surfaceSqm: '140',
    propertyType: 'apartment',
    status: PropertyStatus.ACTIVE,
    suspicious: true
  }
] as const;

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const seed = async () => {
  await prisma.flagReviewAction.deleteMany();
  await prisma.suspiciousFlag.deleteMany();
  await prisma.propertyView.deleteMany();
  await prisma.propertyCoListing.deleteMany();
  await prisma.property.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.agency.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  const [agencyOne, agencyTwo] = await Promise.all([
    prisma.agency.create({ data: { name: 'Alpine Realty' } }),
    prisma.agency.create({ data: { name: 'Lakeside Estates' } })
  ]);

  const [agentOne, agentTwo, agentThree] = await Promise.all([
    prisma.agent.create({
      data: {
        agencyId: agencyOne.id,
        name: 'Alice Martin',
        email: 'alice@realadvisor.local',
        passwordHash
      }
    }),
    prisma.agent.create({
      data: {
        agencyId: agencyOne.id,
        name: 'Julien Morel',
        email: 'julien@realadvisor.local',
        passwordHash
      }
    }),
    prisma.agent.create({
      data: {
        agencyId: agencyTwo.id,
        name: 'Sophie Keller',
        email: 'sophie@realadvisor.local',
        passwordHash
      }
    })
  ]);

  const createdProperties = await Promise.all(
    properties.map((property, index) => {
      const primaryAgentId =
        index % 3 === 0 ? agentOne.id : index % 3 === 1 ? agentTwo.id : agentThree.id;

      return prisma.property.create({
        data: {
          primaryAgentId,
          title: property.title,
          description: property.description,
          addressLine1: property.addressLine1,
          city: property.city,
          postalCode: property.postalCode,
          country: property.country,
          price: property.price,
          surfaceSqm: property.surfaceSqm,
          propertyType: property.propertyType,
          status: property.status,
          createdAt: daysAgo(50 - index * 4),
          activatedAt:
            property.status === PropertyStatus.DRAFT ? null : daysAgo(property.activatedAtOffsetDays ?? 30 - index * 2),
          soldAt:
            property.status === PropertyStatus.SOLD ? daysAgo(property.soldAtOffsetDays ?? 5) : null
        }
      });
    })
  );

  await Promise.all(
    createdProperties.flatMap((property, index) => [
      prisma.propertyView.create({
        data: {
          propertyId: property.id,
          viewerType: ViewerType.ANONYMOUS,
          visitorId: `visitor-${index}-1`,
          viewedAt: daysAgo(2 + index)
        }
      }),
      prisma.propertyView.create({
        data: {
          propertyId: property.id,
          viewerType: ViewerType.ANONYMOUS,
          visitorId: `visitor-${index}-2`,
          viewedAt: daysAgo(12 + index)
        }
      })
    ])
  );

  const suspiciousProperty = createdProperties.find((property) =>
    property.title.includes('Underpriced penthouse opportunity')
  );

  if (suspiciousProperty) {
    await prisma.suspiciousFlag.create({
      data: {
        propertyId: suspiciousProperty.id,
        status: FlagStatus.OPEN,
        source: FlagSource.AUTO,
        confidenceScore: 88,
        primaryReason: 'Price per sqm is far below similar Geneva apartment listings.',
        triggeredRule: 'LOW_PRICE_PER_SQM',
        detailsJson: {
          baselinePricePerSqm: 15000,
          propertyPricePerSqm: 3214
        }
      }
    });
  }

  console.log('Seed complete.');
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
