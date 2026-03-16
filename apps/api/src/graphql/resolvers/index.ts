import {
  FlagReviewActionType,
  FlagSource,
  FlagStatus,
  Prisma,
  ViewerType,
  PropertyStatus as PrismaPropertyStatus,
  type Property,
  type PropertyView,
  type SuspiciousFlag
} from '@prisma/client';
import { z } from 'zod';

import type { Context } from '../../context.js';
import { requireAgentId, signAgentToken, verifyPassword } from '../../lib/auth.js';
import { runAutomaticDetection } from '../../lib/detection.js';

type LoginArgs = {
  email: string;
  password: string;
};

type PropertiesArgs = {
  status?: PrismaPropertyStatus;
  flaggedOnly?: boolean;
  fromDate?: string | null;
  toDate?: string | null;
  page?: number;
  pageSize?: number;
};

type DashboardViewsArgs = {
  rangeDays?: number;
  offsetDays?: number;
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
    Pick<
      SuspiciousFlag,
      'id' | 'status' | 'confidenceScore' | 'primaryReason' | 'triggeredRule' | 'reviewReason'
    >
  >;
};

type ViewHistoryArgs = {
  limit?: number;
};

type FlagActionArgs = {
  flagId: string;
  reason: string;
};

type RecordPropertyViewArgs = {
  propertyId: string;
  visitorId?: string | null;
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

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const parseOptionalDate = (value?: string | null, endOfDay = false) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

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
    viewCount: property._count.views,
    isFlagged: Boolean(flag),
    flag,
    latestFlag
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

const getOwnedConfirmedFlag = async (context: Context, flagId: string) => {
  const agentId = requireAgentId(context);

  return context.prisma.suspiciousFlag.findFirst({
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
      const [
        statusBreakdownRows,
        totalViewsAllTime,
        totalViewsThisMonth,
        soldAggregate,
        averageDaysRow
      ] = await Promise.all([
        context.prisma.property.groupBy({
          by: ['status'],
          where: {
            primaryAgentId: agentId
          },
          _count: {
            _all: true
          }
        }),
        context.prisma.propertyView.count({
          where: {
            property: { primaryAgentId: agentId }
          }
        }),
        context.prisma.propertyView.count({
          where: {
            viewedAt: { gte: monthStart },
            property: { primaryAgentId: agentId }
          }
        }),
        context.prisma.property.aggregate({
          where: {
            primaryAgentId: agentId,
            status: PrismaPropertyStatus.SOLD,
            soldAt: { gte: monthStart }
          },
          _count: {
            _all: true
          },
          _sum: {
            price: true
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

      const statusBreakdown = [
        PrismaPropertyStatus.DRAFT,
        PrismaPropertyStatus.ACTIVE,
        PrismaPropertyStatus.SOLD,
        PrismaPropertyStatus.ARCHIVED
      ].map((status) => ({
        status,
        count: statusBreakdownRows.find((row) => row.status === status)?._count._all ?? 0
      }));
      const totalActiveProperties =
        statusBreakdown.find((row) => row.status === PrismaPropertyStatus.ACTIVE)?.count ?? 0;
      const propertiesSoldThisMonth = soldAggregate._count._all;
      const recentSalesRevenueLast30Days = Number(soldAggregate._sum.price ?? 0);

      return {
        statusBreakdown,
        totalViewsAllTime,
        totalActiveProperties,
        totalViewsThisMonth,
        propertiesSoldThisMonth,
        recentSalesRevenueLast30Days,
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
      const offsetDays = Math.max(args.offsetDays ?? 0, 0);
      const endDate = endOfDay(daysAgo(offsetDays));
      const startDate = daysAgo(offsetDays + rangeDays - 1);
      const rows = await context.prisma.$queryRaw<Array<{ date: Date; views: number }>>(Prisma.sql`
        SELECT DATE_TRUNC('day', pv."viewedAt")::date AS "date", COUNT(*)::int AS "views"
        FROM "PropertyView" pv
        INNER JOIN "Property" p ON p."id" = pv."propertyId"
        WHERE p."primaryAgentId" = ${agentId}
          AND pv."viewedAt" >= ${startDate}
          AND pv."viewedAt" <= ${endDate}
        GROUP BY 1
        ORDER BY 1 ASC
      `);

      const countsByDate = new Map(
        rows.map((row) => [row.date.toISOString().slice(0, 10), Number(row.views)])
      );

      return Array.from({ length: rangeDays }, (_, index) => {
        const date = daysAgo(offsetDays + rangeDays - index - 1).toISOString().slice(0, 10);
        return {
          date,
          views: countsByDate.get(date) ?? 0
        };
      });
    },
    dashboardViewedPropertiesByDate: async (
      _parent: unknown,
      args: { date: string },
      context: Context
    ) => {
      const agentId = requireAgentId(context);
      const startDate = parseOptionalDate(args.date);

      if (!startDate) {
        throw new Error('Invalid date.');
      }

      const rows = await context.prisma.$queryRaw<
        Array<{
          id: string;
          title: string;
          status: PrismaPropertyStatus;
          viewCount: number;
        }>
      >(Prisma.sql`
        SELECT p."id", p."title", p."status", COUNT(pv."id")::int AS "viewCount"
        FROM "PropertyView" pv
        INNER JOIN "Property" p ON p."id" = pv."propertyId"
        WHERE p."primaryAgentId" = ${agentId}
          AND pv."viewedAt" >= ${startDate}
          AND pv."viewedAt" <= ${endOfDay(startDate)}
        GROUP BY p."id", p."title", p."status"
        ORDER BY "viewCount" DESC, p."title" ASC
      `);

      return rows;
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
    detectionStats: async (_parent: unknown, _args: unknown, context: Context) => {
      const agentId = requireAgentId(context);
      const grouped = await context.prisma.suspiciousFlag.groupBy({
        by: ['source'],
        where: {
          property: {
            primaryAgentId: agentId
          }
        },
        _count: {
          _all: true
        }
      });

      const autoDetected =
        grouped.find((row) => row.source === FlagSource.AUTO)?._count._all ?? 0;
      const manuallyReported =
        grouped.find((row) => row.source === FlagSource.MANUAL)?._count._all ?? 0;

      return {
        totalFlagged: autoDetected + manuallyReported,
        autoDetected,
        manuallyReported
      };
    },
    properties: async (_parent: unknown, args: PropertiesArgs, context: Context) => {
      const agentId = requireAgentId(context);
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

      await runAutomaticDetection(context.prisma, {
        propertyId: property.id,
        primaryAgentId: property.primaryAgentId,
        title: property.title,
        description: property.description,
        addressLine1: property.addressLine1,
        city: property.city,
        postalCode: property.postalCode,
        price: Number(property.price),
        surfaceSqm: Number(property.surfaceSqm),
        propertyType: property.propertyType,
        status: property.status
      });

      const refreshedProperty = await context.prisma.property.findUniqueOrThrow({
        where: { id: property.id },
        include: propertyInclude
      });

      return mapProperty(refreshedProperty as PropertyWithRelations);
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

      await runAutomaticDetection(context.prisma, {
        propertyId: property.id,
        primaryAgentId: property.primaryAgentId,
        title: property.title,
        description: property.description,
        addressLine1: property.addressLine1,
        city: property.city,
        postalCode: property.postalCode,
        price: Number(property.price),
        surfaceSqm: Number(property.surfaceSqm),
        propertyType: property.propertyType,
        status: property.status
      });

      const refreshedProperty = await context.prisma.property.findUniqueOrThrow({
        where: { id: property.id },
        include: propertyInclude
      });

      return mapProperty(refreshedProperty as PropertyWithRelations);
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
    recordPropertyView: async (
      _parent: unknown,
      args: RecordPropertyViewArgs,
      context: Context
    ) => {
      const property = await context.prisma.property.findUnique({
        where: { id: args.propertyId },
        select: { id: true }
      });

      if (!property) {
        throw new Error('Property not found.');
      }

      await context.prisma.propertyView.create({
        data: {
          propertyId: property.id,
          viewerType: context.agentId ? ViewerType.AUTHENTICATED : ViewerType.ANONYMOUS,
          viewerAgentId: context.agentId,
          visitorId: args.visitorId ?? null
        }
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
    },
    restoreConfirmedScam: async (_parent: unknown, args: FlagActionArgs, context: Context) => {
      const agentId = requireAgentId(context);
      const flag = await getOwnedConfirmedFlag(context, args.flagId);

      if (!flag) {
        throw new Error('Confirmed scam flag not found.');
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
        }),
        context.prisma.property.update({
          where: { id: flag.propertyId },
          data: {
            status:
              flag.property.status === PrismaPropertyStatus.ARCHIVED
                ? PrismaPropertyStatus.ACTIVE
                : flag.property.status,
            archivedAt: null
          }
        })
      ]);

      return true;
    }
  }
};
