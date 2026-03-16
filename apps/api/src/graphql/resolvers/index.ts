import { PropertyStatus } from '@prisma/client';

import type { Context } from '../../context.js';
import { requireAgentId } from '../../lib/auth.js';
import { login } from '../../services/auth.service.js';
import {
  getDashboardStats,
  getDashboardViewedPropertiesByDate,
  getDashboardViewsOverTime,
  getDetectionStats,
  getFlaggedProperties,
  getTopViewedProperties
} from '../../services/dashboard.service.js';
import { confirmScam, dismissFlag, restoreConfirmedScam } from '../../services/flag.service.js';
import {
  createProperty,
  deleteProperty,
  getProperty,
  listProperties,
  updateProperty
} from '../../services/property.service.js';
import { getPropertyViewHistory, recordPropertyView } from '../../services/view.service.js';

type LoginArgs = {
  email: string;
  password: string;
};

type PropertiesArgs = {
  status?: PropertyStatus;
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
    status: PropertyStatus;
  };
};

type UpdatePropertyArgs = PropertyArgs & PropertyInputArgs;

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

export const resolvers = {
  Property: {
    viewHistory: async (
      property: { id: string },
      args: ViewHistoryArgs,
      context: Context
    ) => getPropertyViewHistory(context.prisma, property.id, args.limit)
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
    dashboardStats: async (_parent: unknown, _args: unknown, context: Context) =>
      getDashboardStats(context.prisma, requireAgentId(context)),
    dashboardViewsOverTime: async (
      _parent: unknown,
      args: DashboardViewsArgs,
      context: Context
    ) => getDashboardViewsOverTime(context.prisma, requireAgentId(context), args),
    dashboardViewedPropertiesByDate: async (
      _parent: unknown,
      args: { date: string },
      context: Context
    ) => getDashboardViewedPropertiesByDate(context.prisma, requireAgentId(context), args.date),
    topViewedProperties: async (_parent: unknown, args: ListArgs, context: Context) =>
      getTopViewedProperties(context.prisma, requireAgentId(context), args.limit),
    flaggedProperties: async (_parent: unknown, args: ListArgs, context: Context) =>
      getFlaggedProperties(context.prisma, requireAgentId(context), args.limit),
    detectionStats: async (_parent: unknown, _args: unknown, context: Context) =>
      getDetectionStats(context.prisma, requireAgentId(context)),
    properties: async (_parent: unknown, args: PropertiesArgs, context: Context) =>
      listProperties(context.prisma, requireAgentId(context), args),
    property: async (_parent: unknown, args: PropertyArgs, context: Context) =>
      getProperty(context.prisma, requireAgentId(context), args.id)
  },
  Mutation: {
    login: async (_parent: unknown, args: LoginArgs, context: Context) =>
      login(context.prisma, args.email, args.password),
    createProperty: async (_parent: unknown, args: PropertyInputArgs, context: Context) =>
      createProperty(context.prisma, requireAgentId(context), args.input),
    updateProperty: async (_parent: unknown, args: UpdatePropertyArgs, context: Context) =>
      updateProperty(context.prisma, requireAgentId(context), args.id, args.input),
    deleteProperty: async (_parent: unknown, args: PropertyArgs, context: Context) =>
      deleteProperty(context.prisma, requireAgentId(context), args.id),
    recordPropertyView: async (
      _parent: unknown,
      args: RecordPropertyViewArgs,
      context: Context
    ) =>
      recordPropertyView(context.prisma, {
        propertyId: args.propertyId,
        visitorId: args.visitorId,
        viewerAgentId: context.agentId
      }),
    dismissFlag: async (_parent: unknown, args: FlagActionArgs, context: Context) =>
      dismissFlag(context.prisma, requireAgentId(context), args.flagId, args.reason),
    confirmScam: async (_parent: unknown, args: FlagActionArgs, context: Context) =>
      confirmScam(context.prisma, requireAgentId(context), args.flagId, args.reason),
    restoreConfirmedScam: async (_parent: unknown, args: FlagActionArgs, context: Context) =>
      restoreConfirmedScam(context.prisma, requireAgentId(context), args.flagId, args.reason)
  }
};
