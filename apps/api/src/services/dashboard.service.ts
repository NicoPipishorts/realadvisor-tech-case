import { FlagSource, FlagStatus, PropertyStatus, type PrismaClient } from '@prisma/client';

import { ensureAgentAnalyticsBackfilled } from '../lib/analytics.js';
import { mapProperty, propertyInclude, parseOptionalDate, type PropertyWithRelations } from '../graphql/property.js';

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

type AppPrisma = PrismaClient;

export const getDashboardStats = async (prisma: AppPrisma, agentId: string) => {
  const monthStart = startOfCurrentMonth();

  await ensureAgentAnalyticsBackfilled(prisma, agentId);

  const [summary, monthTotals] = await Promise.all([
    prisma.agentDashboardStats.findUniqueOrThrow({
      where: { agentId }
    }),
    prisma.agentDailyStat.aggregate({
      where: {
        agentId,
        date: { gte: monthStart }
      },
      _sum: {
        viewCount: true,
        soldCount: true,
        salesRevenue: true
      }
    })
  ]);

  return {
    statusBreakdown: [
      { status: PropertyStatus.DRAFT, count: summary.draftCount },
      { status: PropertyStatus.ACTIVE, count: summary.activeCount },
      { status: PropertyStatus.SOLD, count: summary.soldCount },
      { status: PropertyStatus.ARCHIVED, count: summary.archivedCount }
    ],
    totalViewsAllTime: summary.totalViewsAllTime,
    totalActiveProperties: summary.activeCount,
    totalViewsThisMonth: monthTotals._sum.viewCount ?? 0,
    propertiesSoldThisMonth: monthTotals._sum.soldCount ?? 0,
    recentSalesRevenueLast30Days: Number(monthTotals._sum.salesRevenue ?? 0),
    averageDaysToSell:
      summary.soldWithActivationCount > 0
        ? Math.round(summary.cumulativeDaysToSell / summary.soldWithActivationCount)
        : 0
  };
};

export const getDashboardViewsOverTime = async (
  prisma: AppPrisma,
  agentId: string,
  args: {
    rangeDays?: number;
    offsetDays?: number;
  }
) => {
  const rangeDays = Math.max(1, Math.min(args.rangeDays ?? 30, 90));
  const offsetDays = Math.max(args.offsetDays ?? 0, 0);
  const endDate = endOfDay(daysAgo(offsetDays));
  const startDate = daysAgo(offsetDays + rangeDays - 1);

  await ensureAgentAnalyticsBackfilled(prisma, agentId);

  const rows = await prisma.agentDailyStat.findMany({
    where: {
      agentId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      date: true,
      viewCount: true
    },
    orderBy: {
      date: 'asc'
    }
  });

  const countsByDate = new Map(
    rows.map((row) => [row.date.toISOString().slice(0, 10), Number(row.viewCount)])
  );

  return Array.from({ length: rangeDays }, (_, index) => {
    const date = daysAgo(offsetDays + rangeDays - index - 1).toISOString().slice(0, 10);

    return {
      date,
      views: countsByDate.get(date) ?? 0
    };
  });
};

export const getDashboardViewedPropertiesByDate = async (
  prisma: AppPrisma,
  agentId: string,
  date: string
) => {
  const startDate = parseOptionalDate(date);

  if (!startDate) {
    throw new Error('Invalid date.');
  }

  await ensureAgentAnalyticsBackfilled(prisma, agentId);

  const rows = await prisma.propertyViewDaily.findMany({
    where: {
      agentId,
      date: startDate
    },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          status: true
        }
      }
    },
    orderBy: [{ viewCount: 'desc' }, { property: { title: 'asc' } }]
  });

  return rows.map((row) => ({
    id: row.property.id,
    title: row.property.title,
    status: row.property.status,
    viewCount: row.viewCount
  }));
};

export const getTopViewedProperties = async (
  prisma: AppPrisma,
  agentId: string,
  limit?: number
) => {
  const safeLimit = Math.max(1, Math.min(limit ?? 5, 10));

  await ensureAgentAnalyticsBackfilled(prisma, agentId);

  const rows = await prisma.propertyAnalytics.findMany({
    where: { agentId },
    take: safeLimit,
    orderBy: [{ lifetimeViewCount: 'desc' }, { lastViewedAt: 'desc' }],
    include: {
      property: {
        select: {
          id: true,
          title: true,
          status: true
        }
      }
    }
  });

  return rows.map((row) => ({
    id: row.property.id,
    title: row.property.title,
    status: row.property.status,
    viewCount: row.lifetimeViewCount
  }));
};

export const getFlaggedProperties = async (
  prisma: AppPrisma,
  agentId: string,
  limit?: number
) => {
  const safeLimit = Math.max(1, Math.min(limit ?? 5, 10));
  const flags = await prisma.suspiciousFlag.findMany({
    where: {
      status: FlagStatus.OPEN,
      property: {
        primaryAgentId: agentId
      }
    },
    orderBy: [{ confidenceScore: 'desc' }, { createdAt: 'desc' }],
    take: safeLimit,
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
};

export const getDetectionStats = async (prisma: AppPrisma, agentId: string) => {
  const grouped = await prisma.suspiciousFlag.groupBy({
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

  const autoDetected = grouped.find((row) => row.source === FlagSource.AUTO)?._count._all ?? 0;
  const manuallyReported =
    grouped.find((row) => row.source === FlagSource.MANUAL)?._count._all ?? 0;

  return {
    totalFlagged: autoDetected + manuallyReported,
    autoDetected,
    manuallyReported
  };
};
