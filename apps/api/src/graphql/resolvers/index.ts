import {
  FlagReviewActionType,
  FlagStatus,
  Prisma,
  PropertyStatus as PrismaPropertyStatus,
  type Property,
  type PropertyView,
  type SuspiciousFlag
} from '@prisma/client';
import { z } from 'zod';

import type { Context } from '../../context.js';
import { requireAgentId, signAgentToken, verifyPassword } from '../../lib/auth.js';

type LoginArgs = {
  email: string;
  password: string;
};

type PropertiesArgs = {
  status?: PrismaPropertyStatus;
  fromDate?: string | null;
  toDate?: string | null;
  page?: number;
  pageSize?: number;
};

type DashboardViewsArgs = {
  rangeDays?: number;
};

type ListArgs = {
  limit?: number;
};

type PropertyArgs = {
  id: string;
};

type PropertyInputArgs = {
  input: {
    title: string;
    description: string;
    addressLine1: string;
    city: string;
    postalCode: string;
    country: string;
    price: number;
    surfaceSqm: number;
    propertyType: string;
    status: PrismaPropertyStatus;
  };
};

type UpdatePropertyArgs = PropertyArgs & PropertyInputArgs;

type PropertyWithRelations = Property & {
  _count: {
    views: number;
  };
  suspiciousFlags: Array<
    Pick<SuspiciousFlag, 'id' | 'confidenceScore' | 'primaryReason' | 'triggeredRule'>
  >;
};

type ViewHistoryArgs = {
  limit?: number;
};

type FlagActionArgs = {
  flagId: string;
  reason: string;
};

const propertyInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  addressLine1: z.string().trim().min(3).max(140),
  city: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(2).max(20),
  country: z.string().trim().min(2).max(80),
  price: z.number().positive(),
  surfaceSqm: z.number().positive(),
  propertyType: z.string().trim().min(2).max(40),
  status: z.nativeEnum(PrismaPropertyStatus)
});

const propertyInclude = {
  _count: {
    select: {
      views: true
    }
  },
  suspiciousFlags: {
    where: { status: FlagStatus.OPEN },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      id: true,
      confidenceScore: true,
      primaryReason: true,
      triggeredRule: true
    }
  }
};

const startOfCurrentMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
};

const parseOptionalDate = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const buildLifecycleTimestamps = (status: PrismaPropertyStatus, existing?: Property | null) => {
  const now = new Date();

  switch (status) {
    case PrismaPropertyStatus.DRAFT:
      return {
        activatedAt: null,
        soldAt: null,
        archivedAt: null
      };
    case PrismaPropertyStatus.ACTIVE:
      return {
        activatedAt: existing?.activatedAt ?? now,
        soldAt: null,
        archivedAt: null
      };
    case PrismaPropertyStatus.SOLD:
      return {
        activatedAt: existing?.activatedAt ?? now,
        soldAt: existing?.soldAt ?? now,
        archivedAt: null
      };
    case PrismaPropertyStatus.ARCHIVED:
      return {
        activatedAt: existing?.activatedAt ?? null,
        soldAt: existing?.soldAt ?? null,
        archivedAt: existing?.archivedAt ?? now
      };
  }
};

const mapProperty = (property: PropertyWithRelations) => {
  const [flag] = property.suspiciousFlags;

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
    viewCount: property._count.views,
    isFlagged: Boolean(flag),
    flag: flag ?? null
  };
};

const getOwnedProperty = async (context: Context, id: string) => {
  const agentId = requireAgentId(context);

  return context.prisma.property.findFirst({
    where: {
      id,
      primaryAgentId: agentId
    }
  });
};

const getOwnedOpenFlag = async (context: Context, flagId: string) => {
  const agentId = requireAgentId(context);

  return context.prisma.suspiciousFlag.findFirst({
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
};

export const resolvers = {
  Property: {
    viewHistory: async (
      property: { id: string },
      args: ViewHistoryArgs,
      context: Context
    ) => {
      const limit = Math.max(1, Math.min(args.limit ?? 20, 100));
      const views = await context.prisma.propertyView.findMany({
        where: { propertyId: property.id },
        orderBy: { viewedAt: 'desc' },
        take: limit
      });

      return views.map((view: PropertyView) => ({
        id: view.id,
        viewerType: view.viewerType,
        visitorId: view.visitorId,
        viewedAt: view.viewedAt.toISOString()
      }));
    }
  },
  Query: {
    health: () => 'ok',
    me: async (_parent: unknown, _args: unknown, context: Context) => {
      if (!context.agentId) {
        return null;
      }

      return context.prisma.agent.findUnique({
        where: { id: context.agentId }
      });
    },
    dashboardStats: async (_parent: unknown, _args: unknown, context: Context) => {
      const agentId = requireAgentId(context);
      const monthStart = startOfCurrentMonth();

      const [totalActiveProperties, totalViewsThisMonth, propertiesSoldThisMonth, averageDaysRow] =
        await Promise.all([
          context.prisma.property.count({
            where: {
              primaryAgentId: agentId,
              status: PrismaPropertyStatus.ACTIVE
            }
          }),
          context.prisma.propertyView.count({
            where: {
              viewedAt: { gte: monthStart },
              property: { primaryAgentId: agentId }
            }
          }),
          context.prisma.property.count({
            where: {
              primaryAgentId: agentId,
              status: PrismaPropertyStatus.SOLD,
              soldAt: { gte: monthStart }
            }
          }),
          context.prisma.$queryRaw<Array<{ averageDaysToSell: number | null }>>(Prisma.sql`
            SELECT COALESCE(
              AVG(EXTRACT(EPOCH FROM ("soldAt" - "activatedAt")) / 86400),
              0
            )::float AS "averageDaysToSell"
            FROM "Property"
            WHERE "primaryAgentId" = ${agentId}
              AND "status" = ${PrismaPropertyStatus.SOLD}::"PropertyStatus"
              AND "soldAt" IS NOT NULL
              AND "activatedAt" IS NOT NULL
          `)
        ]);

      return {
        totalActiveProperties,
        totalViewsThisMonth,
        propertiesSoldThisMonth,
        averageDaysToSell: Math.round(averageDaysRow[0]?.averageDaysToSell ?? 0)
      };
    },
    dashboardViewsOverTime: async (
      _parent: unknown,
      args: DashboardViewsArgs,
      context: Context
    ) => {
      const agentId = requireAgentId(context);
      const rangeDays = Math.max(1, Math.min(args.rangeDays ?? 30, 90));
      const startDate = daysAgo(rangeDays - 1);
      const rows = await context.prisma.$queryRaw<Array<{ date: Date; views: number }>>(Prisma.sql`
        SELECT DATE_TRUNC('day', pv."viewedAt")::date AS "date", COUNT(*)::int AS "views"
        FROM "PropertyView" pv
        INNER JOIN "Property" p ON p."id" = pv."propertyId"
        WHERE p."primaryAgentId" = ${agentId}
          AND pv."viewedAt" >= ${startDate}
        GROUP BY 1
        ORDER BY 1 ASC
      `);

      const countsByDate = new Map(
        rows.map((row) => [row.date.toISOString().slice(0, 10), Number(row.views)])
      );

      return Array.from({ length: rangeDays }, (_, index) => {
        const date = daysAgo(rangeDays - index - 1).toISOString().slice(0, 10);
        return {
          date,
          views: countsByDate.get(date) ?? 0
        };
      });
    },
    topViewedProperties: async (_parent: unknown, args: ListArgs, context: Context) => {
      const agentId = requireAgentId(context);
      const limit = Math.max(1, Math.min(args.limit ?? 5, 10));

      return context.prisma.$queryRaw<
        Array<{ id: string; title: string; status: PrismaPropertyStatus; viewCount: number }>
      >(Prisma.sql`
        SELECT p."id", p."title", p."status", COUNT(pv."id")::int AS "viewCount"
        FROM "Property" p
        LEFT JOIN "PropertyView" pv ON pv."propertyId" = p."id"
        WHERE p."primaryAgentId" = ${agentId}
        GROUP BY p."id", p."title", p."status", p."createdAt"
        ORDER BY "viewCount" DESC, p."createdAt" DESC
        LIMIT ${limit}
      `);
    },
    flaggedProperties: async (_parent: unknown, args: ListArgs, context: Context) => {
      const agentId = requireAgentId(context);
      const limit = Math.max(1, Math.min(args.limit ?? 5, 10));
      const flags = await context.prisma.suspiciousFlag.findMany({
        where: {
          status: FlagStatus.OPEN,
          property: {
            primaryAgentId: agentId
          }
        },
        orderBy: [{ confidenceScore: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        include: {
          property: {
            include: propertyInclude
          }
        }
      });

      return flags.map((flag) => ({
        id: flag.id,
        confidenceScore: flag.confidenceScore,
        primaryReason: flag.primaryReason,
        triggeredRule: flag.triggeredRule,
        property: mapProperty(flag.property as PropertyWithRelations)
      }));
    },
    properties: async (_parent: unknown, args: PropertiesArgs, context: Context) => {
      const agentId = requireAgentId(context);
      const page = Math.max(args.page ?? 1, 1);
      const pageSize = Math.max(1, Math.min(args.pageSize ?? 20, 50));
      const fromDate = parseOptionalDate(args.fromDate);
      const toDate = parseOptionalDate(args.toDate);
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
        ...createdAtFilter
      };

      const [totalCount, nodes] = await Promise.all([
        context.prisma.property.count({ where }),
        context.prisma.property.findMany({
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
    },
    property: async (_parent: unknown, args: PropertyArgs, context: Context) => {
      const agentId = requireAgentId(context);
      const property = await context.prisma.property.findFirst({
        where: {
          id: args.id,
          primaryAgentId: agentId
        },
        include: propertyInclude
      });

      return property ? mapProperty(property as PropertyWithRelations) : null;
    }
  },
  Mutation: {
    login: async (_parent: unknown, args: LoginArgs, context: Context) => {
      const agent = await context.prisma.agent.findUnique({
        where: { email: args.email.toLowerCase() }
      });

      if (!agent) {
        throw new Error('Invalid email or password.');
      }

      const isValid = await verifyPassword(args.password, agent.passwordHash);

      if (!isValid) {
        throw new Error('Invalid email or password.');
      }

      return {
        token: signAgentToken(agent.id),
        agent
      };
    },
    createProperty: async (_parent: unknown, args: PropertyInputArgs, context: Context) => {
      const agentId = requireAgentId(context);
      const input = propertyInputSchema.parse(args.input);
      const property = await context.prisma.property.create({
        data: {
          primaryAgentId: agentId,
          ...input,
          ...buildLifecycleTimestamps(input.status)
        },
        include: propertyInclude
      });

      return mapProperty(property as PropertyWithRelations);
    },
    updateProperty: async (_parent: unknown, args: UpdatePropertyArgs, context: Context) => {
      const existingProperty = await getOwnedProperty(context, args.id);

      if (!existingProperty) {
        throw new Error('Property not found.');
      }

      const input = propertyInputSchema.parse(args.input);
      const property = await context.prisma.property.update({
        where: { id: existingProperty.id },
        data: {
          ...input,
          ...buildLifecycleTimestamps(input.status, existingProperty)
        },
        include: propertyInclude
      });

      return mapProperty(property as PropertyWithRelations);
    },
    deleteProperty: async (_parent: unknown, args: PropertyArgs, context: Context) => {
      const existingProperty = await getOwnedProperty(context, args.id);

      if (!existingProperty) {
        throw new Error('Property not found.');
      }

      await context.prisma.property.delete({
        where: { id: existingProperty.id }
      });

      return true;
    },
    dismissFlag: async (_parent: unknown, args: FlagActionArgs, context: Context) => {
      const agentId = requireAgentId(context);
      const flag = await getOwnedOpenFlag(context, args.flagId);

      if (!flag) {
        throw new Error('Flag not found.');
      }

      await context.prisma.$transaction([
        context.prisma.suspiciousFlag.update({
          where: { id: flag.id },
          data: {
            status: FlagStatus.DISMISSED,
            reviewedByAgentId: agentId,
            reviewedAt: new Date(),
            reviewReason: args.reason
          }
        }),
        context.prisma.flagReviewAction.create({
          data: {
            flagId: flag.id,
            agentId,
            action: FlagReviewActionType.DISMISS,
            reason: args.reason
          }
        })
      ]);

      return true;
    },
    confirmScam: async (_parent: unknown, args: FlagActionArgs, context: Context) => {
      const agentId = requireAgentId(context);
      const flag = await getOwnedOpenFlag(context, args.flagId);

      if (!flag) {
        throw new Error('Flag not found.');
      }

      await context.prisma.$transaction([
        context.prisma.suspiciousFlag.update({
          where: { id: flag.id },
          data: {
            status: FlagStatus.CONFIRMED,
            reviewedByAgentId: agentId,
            reviewedAt: new Date(),
            reviewReason: args.reason
          }
        }),
        context.prisma.flagReviewAction.create({
          data: {
            flagId: flag.id,
            agentId,
            action: FlagReviewActionType.CONFIRM,
            reason: args.reason
          }
        }),
        context.prisma.property.update({
          where: { id: flag.propertyId },
          data: {
            status: PrismaPropertyStatus.ARCHIVED,
            archivedAt: new Date()
          }
        })
      ]);

      return true;
    }
  }
};
