import {
  FlagStatus,
  Prisma,
  PropertyStatus as PrismaPropertyStatus,
  type SuspiciousFlag,
  type Property
} from '@prisma/client';

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

type PropertyWithRelations = Property & {
  _count: {
    views: number;
  };
  suspiciousFlags: Array<Pick<SuspiciousFlag, 'id' | 'confidenceScore' | 'primaryReason' | 'triggeredRule'>>;
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

const mapProperty = (property: PropertyWithRelations) => {
  const [flag] = property.suspiciousFlags;

  return {
    id: property.id,
    title: property.title,
    price: Number(property.price),
    status: property.status,
    createdAt: property.createdAt.toISOString(),
    viewCount: property._count.views,
    isFlagged: Boolean(flag),
    flag: flag ?? null
  };
};

export const resolvers = {
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
            include: {
              _count: {
                select: {
                  views: true
                }
              },
              suspiciousFlags: {
                where: { status: FlagStatus.OPEN },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  id: true,
                  confidenceScore: true,
                  primaryReason: true,
                  triggeredRule: true
                }
              }
            }
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
          include: {
            _count: {
              select: {
                views: true
              }
            },
            suspiciousFlags: {
              where: { status: FlagStatus.OPEN },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                confidenceScore: true,
                primaryReason: true,
                triggeredRule: true
              }
            }
          }
        })
      ]);

      return {
        totalCount,
        nodes: nodes.map((property) => mapProperty(property as PropertyWithRelations))
      };
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
    }
  }
};
