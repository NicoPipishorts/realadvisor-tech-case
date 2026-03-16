import { Prisma, PropertyStatus, type PrismaClient, type Property } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

type PropertyState = Pick<
  Property,
  'id' | 'primaryAgentId' | 'status' | 'price' | 'activatedAt' | 'soldAt'
>;

type DashboardSummaryDelta = {
  draftCount?: number;
  activeCount?: number;
  soldCount?: number;
  archivedCount?: number;
  totalViewsAllTime?: number;
  cumulativeDaysToSell?: number;
  soldWithActivationCount?: number;
};

type DailyDelta = {
  viewCount?: number;
  soldCount?: number;
  salesRevenue?: number;
};

const STATUS_FIELDS: Record<PropertyStatus, keyof DashboardSummaryDelta> = {
  DRAFT: 'draftCount',
  ACTIVE: 'activeCount',
  SOLD: 'soldCount',
  ARCHIVED: 'archivedCount'
};

const startOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const hasSummaryDelta = (delta: DashboardSummaryDelta) =>
  Object.values(delta).some((value) => value !== undefined && value !== 0);

const hasDailyDelta = (delta: DailyDelta) =>
  Object.values(delta).some((value) => value !== undefined && value !== 0);

const buildSummaryCreate = (agentId: string, delta?: DashboardSummaryDelta) => ({
  agentId,
  draftCount: delta?.draftCount ?? 0,
  activeCount: delta?.activeCount ?? 0,
  soldCount: delta?.soldCount ?? 0,
  archivedCount: delta?.archivedCount ?? 0,
  totalViewsAllTime: delta?.totalViewsAllTime ?? 0,
  cumulativeDaysToSell: delta?.cumulativeDaysToSell ?? 0,
  soldWithActivationCount: delta?.soldWithActivationCount ?? 0
});

const buildSummaryUpdate = (delta: DashboardSummaryDelta) => ({
  ...(delta.draftCount ? { draftCount: { increment: delta.draftCount } } : {}),
  ...(delta.activeCount ? { activeCount: { increment: delta.activeCount } } : {}),
  ...(delta.soldCount ? { soldCount: { increment: delta.soldCount } } : {}),
  ...(delta.archivedCount ? { archivedCount: { increment: delta.archivedCount } } : {}),
  ...(delta.totalViewsAllTime
    ? { totalViewsAllTime: { increment: delta.totalViewsAllTime } }
    : {}),
  ...(delta.cumulativeDaysToSell
    ? { cumulativeDaysToSell: { increment: delta.cumulativeDaysToSell } }
    : {}),
  ...(delta.soldWithActivationCount
    ? { soldWithActivationCount: { increment: delta.soldWithActivationCount } }
    : {})
});

const daysToSellForProperty = (property: PropertyState | null | undefined) => {
  if (
    !property ||
    property.status !== PropertyStatus.SOLD ||
    !property.activatedAt ||
    !property.soldAt
  ) {
    return null;
  }

  const diffMs = property.soldAt.getTime() - property.activatedAt.getTime();

  if (diffMs < 0) {
    return null;
  }

  return Math.round(diffMs / 86400000);
};

const salesContributionForProperty = (property: PropertyState | null | undefined) => {
  if (!property || property.status !== PropertyStatus.SOLD || !property.soldAt) {
    return null;
  }

  return {
    date: startOfDay(property.soldAt),
    salesRevenue: Number(property.price)
  };
};

const mergeDailyDelta = (
  target: Map<string, { date: Date; delta: DailyDelta }>,
  date: Date,
  partial: DailyDelta
) => {
  const key = date.toISOString().slice(0, 10);
  const existing = target.get(key) ?? { date, delta: {} };

  existing.delta = {
    viewCount: (existing.delta.viewCount ?? 0) + (partial.viewCount ?? 0),
    soldCount: (existing.delta.soldCount ?? 0) + (partial.soldCount ?? 0),
    salesRevenue: (existing.delta.salesRevenue ?? 0) + (partial.salesRevenue ?? 0)
  };

  target.set(key, existing);
};

export const ensureAgentDashboardStatsRow = async (db: DbClient, agentId: string) => {
  await db.agentDashboardStats.upsert({
    where: { agentId },
    create: buildSummaryCreate(agentId),
    update: {}
  });
};

export const applyPropertyStateDelta = async (
  db: DbClient,
  before: PropertyState | null,
  after: PropertyState | null
) => {
  const agentId = after?.primaryAgentId ?? before?.primaryAgentId;

  if (!agentId) {
    return;
  }

  const summaryDelta: DashboardSummaryDelta = {};

  if (before) {
    const beforeField = STATUS_FIELDS[before.status];
    summaryDelta[beforeField] = (summaryDelta[beforeField] ?? 0) - 1;
  }

  if (after) {
    const afterField = STATUS_FIELDS[after.status];
    summaryDelta[afterField] = (summaryDelta[afterField] ?? 0) + 1;
  }

  const beforeDaysToSell = daysToSellForProperty(before);
  const afterDaysToSell = daysToSellForProperty(after);

  if (beforeDaysToSell !== null) {
    summaryDelta.cumulativeDaysToSell =
      (summaryDelta.cumulativeDaysToSell ?? 0) - beforeDaysToSell;
    summaryDelta.soldWithActivationCount = (summaryDelta.soldWithActivationCount ?? 0) - 1;
  }

  if (afterDaysToSell !== null) {
    summaryDelta.cumulativeDaysToSell =
      (summaryDelta.cumulativeDaysToSell ?? 0) + afterDaysToSell;
    summaryDelta.soldWithActivationCount = (summaryDelta.soldWithActivationCount ?? 0) + 1;
  }

  if (hasSummaryDelta(summaryDelta)) {
    await db.agentDashboardStats.upsert({
      where: { agentId },
      create: buildSummaryCreate(agentId, summaryDelta),
      update: buildSummaryUpdate(summaryDelta)
    });
  } else {
    await ensureAgentDashboardStatsRow(db, agentId);
  }

  const beforeSale = salesContributionForProperty(before);
  const afterSale = salesContributionForProperty(after);
  const dailyDeltas = new Map<string, { date: Date; delta: DailyDelta }>();

  if (beforeSale) {
    mergeDailyDelta(dailyDeltas, beforeSale.date, {
      soldCount: -1,
      salesRevenue: -beforeSale.salesRevenue
    });
  }

  if (afterSale) {
    mergeDailyDelta(dailyDeltas, afterSale.date, {
      soldCount: 1,
      salesRevenue: afterSale.salesRevenue
    });
  }

  for (const { date, delta } of dailyDeltas.values()) {
    if (!hasDailyDelta(delta)) {
      continue;
    }

    await db.agentDailyStat.upsert({
      where: {
        agentId_date: {
          agentId,
          date
        }
      },
      create: {
        agentId,
        date,
        viewCount: delta.viewCount ?? 0,
        soldCount: delta.soldCount ?? 0,
        salesRevenue: new Prisma.Decimal(delta.salesRevenue ?? 0)
      },
      update: {
        ...(delta.viewCount ? { viewCount: { increment: delta.viewCount } } : {}),
        ...(delta.soldCount ? { soldCount: { increment: delta.soldCount } } : {}),
        ...(delta.salesRevenue
          ? { salesRevenue: { increment: new Prisma.Decimal(delta.salesRevenue) } }
          : {})
      }
    });
  }

  if (after) {
    await db.propertyAnalytics.upsert({
      where: { propertyId: after.id },
      create: {
        propertyId: after.id,
        agentId: after.primaryAgentId,
        lifetimeViewCount: 0
      },
      update: {
        agentId: after.primaryAgentId
      }
    });
  }
};

export const recordPropertyViewAnalytics = async (
  db: DbClient,
  input: {
    propertyId: string;
    agentId: string;
    viewedAt: Date;
  }
) => {
  const date = startOfDay(input.viewedAt);

  await Promise.all([
    db.agentDashboardStats.upsert({
      where: { agentId: input.agentId },
      create: buildSummaryCreate(input.agentId, { totalViewsAllTime: 1 }),
      update: {
        totalViewsAllTime: {
          increment: 1
        }
      }
    }),
    db.agentDailyStat.upsert({
      where: {
        agentId_date: {
          agentId: input.agentId,
          date
        }
      },
      create: {
        agentId: input.agentId,
        date,
        viewCount: 1,
        soldCount: 0,
        salesRevenue: new Prisma.Decimal(0)
      },
      update: {
        viewCount: {
          increment: 1
        }
      }
    }),
    db.propertyAnalytics.upsert({
      where: { propertyId: input.propertyId },
      create: {
        propertyId: input.propertyId,
        agentId: input.agentId,
        lifetimeViewCount: 1,
        lastViewedAt: input.viewedAt
      },
      update: {
        agentId: input.agentId,
        lifetimeViewCount: {
          increment: 1
        },
        lastViewedAt: input.viewedAt
      }
    }),
    db.propertyViewDaily.upsert({
      where: {
        agentId_propertyId_date: {
          agentId: input.agentId,
          propertyId: input.propertyId,
          date
        }
      },
      create: {
        agentId: input.agentId,
        propertyId: input.propertyId,
        date,
        viewCount: 1
      },
      update: {
        viewCount: {
          increment: 1
        }
      }
    })
  ]);
};

type AggregateViewRow = {
  propertyId: string;
  count: number;
  lastViewedAt: Date | null;
};

type AggregateDailyViewRow = {
  propertyId: string;
  date: Date;
  count: number;
};

export const rebuildAgentAnalytics = async (prisma: PrismaClient, agentId: string) => {
  const agentExists = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true }
  });

  if (!agentExists) {
    throw new Error('Authenticated agent no longer exists. Please sign in again.');
  }

  await prisma.$executeRaw`
    UPDATE "PropertyView" pv
    SET "ownerAgentId" = p."primaryAgentId"
    FROM "Property" p
    WHERE pv."propertyId" = p."id"
      AND p."primaryAgentId" = ${agentId}
      AND (pv."ownerAgentId" IS NULL OR pv."ownerAgentId" <> p."primaryAgentId")
  `;

  const properties = await prisma.property.findMany({
    where: { primaryAgentId: agentId },
    select: {
      id: true,
      primaryAgentId: true,
      status: true,
      price: true,
      activatedAt: true,
      soldAt: true
    }
  });

  const summary = buildSummaryCreate(agentId);
  const dailyStatsMap = new Map<string, { date: Date; viewCount: number; soldCount: number; salesRevenue: number }>();

  for (const property of properties) {
    const field = STATUS_FIELDS[property.status];
    summary[field] += 1;

    const daysToSell = daysToSellForProperty(property);

    if (daysToSell !== null) {
      summary.cumulativeDaysToSell += daysToSell;
      summary.soldWithActivationCount += 1;
    }

    const sale = salesContributionForProperty(property);

    if (sale) {
      const key = sale.date.toISOString().slice(0, 10);
      const existing =
        dailyStatsMap.get(key) ?? {
          date: sale.date,
          viewCount: 0,
          soldCount: 0,
          salesRevenue: 0
        };

      existing.soldCount += 1;
      existing.salesRevenue += sale.salesRevenue;
      dailyStatsMap.set(key, existing);
    }
  }

  const propertyViewAggregates = await prisma.$queryRaw<Array<AggregateViewRow>>(Prisma.sql`
    SELECT
      pv."propertyId" AS "propertyId",
      COUNT(*)::int AS "count",
      MAX(pv."viewedAt") AS "lastViewedAt"
    FROM "PropertyView" pv
    WHERE pv."ownerAgentId" = ${agentId}
    GROUP BY pv."propertyId"
  `);

  const dailyViewAggregates = await prisma.$queryRaw<Array<AggregateDailyViewRow>>(Prisma.sql`
    SELECT
      pv."propertyId" AS "propertyId",
      DATE_TRUNC('day', pv."viewedAt")::date AS "date",
      COUNT(*)::int AS "count"
    FROM "PropertyView" pv
    WHERE pv."ownerAgentId" = ${agentId}
    GROUP BY pv."propertyId", 2
  `);

  summary.totalViewsAllTime = propertyViewAggregates.reduce(
    (sum, row) => sum + Number(row.count),
    0
  );

  for (const row of dailyViewAggregates) {
    const key = row.date.toISOString().slice(0, 10);
    const existing =
      dailyStatsMap.get(key) ?? {
        date: row.date,
        viewCount: 0,
        soldCount: 0,
        salesRevenue: 0
      };

    existing.viewCount += Number(row.count);
    dailyStatsMap.set(key, existing);
  }

  const propertyIds = new Set(properties.map((property) => property.id));
  const propertyAnalyticsRows = properties.map((property) => {
    const aggregate = propertyViewAggregates.find((row) => row.propertyId === property.id);

    return {
      propertyId: property.id,
      agentId,
      lifetimeViewCount: aggregate?.count ?? 0,
      lastViewedAt: aggregate?.lastViewedAt ?? null
    };
  });

  const propertyViewDailyRows = dailyViewAggregates.filter((row) => propertyIds.has(row.propertyId));
  const agentDailyRows = Array.from(dailyStatsMap.values());

  await prisma.$transaction(async (tx) => {
    await tx.agentDashboardStats.upsert({
      where: { agentId },
      create: summary,
      update: {
        draftCount: summary.draftCount,
        activeCount: summary.activeCount,
        soldCount: summary.soldCount,
        archivedCount: summary.archivedCount,
        totalViewsAllTime: summary.totalViewsAllTime,
        cumulativeDaysToSell: summary.cumulativeDaysToSell,
        soldWithActivationCount: summary.soldWithActivationCount
      }
    });

    await tx.agentDailyStat.deleteMany({
      where: { agentId }
    });

    await tx.propertyAnalytics.deleteMany({
      where: { agentId }
    });

    await tx.propertyViewDaily.deleteMany({
      where: { agentId }
    });

    if (agentDailyRows.length > 0) {
      await tx.agentDailyStat.createMany({
        data: agentDailyRows.map((row) => ({
          agentId,
          date: row.date,
          viewCount: row.viewCount,
          soldCount: row.soldCount,
          salesRevenue: new Prisma.Decimal(row.salesRevenue)
        }))
      });
    }

    if (propertyAnalyticsRows.length > 0) {
      await tx.propertyAnalytics.createMany({
        data: propertyAnalyticsRows
      });
    }

    if (propertyViewDailyRows.length > 0) {
      await tx.propertyViewDaily.createMany({
        data: propertyViewDailyRows.map((row) => ({
          agentId,
          propertyId: row.propertyId,
          date: row.date,
          viewCount: row.count
        }))
      });
    }
  });
};

export const ensureAgentAnalyticsBackfilled = async (prisma: PrismaClient, agentId: string) => {
  const agentExists = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true }
  });

  if (!agentExists) {
    throw new Error('Authenticated agent no longer exists. Please sign in again.');
  }

  const summary = await prisma.agentDashboardStats.findUnique({
    where: { agentId },
    select: { agentId: true }
  });

  if (summary) {
    return;
  }

  await rebuildAgentAnalytics(prisma, agentId);
};
