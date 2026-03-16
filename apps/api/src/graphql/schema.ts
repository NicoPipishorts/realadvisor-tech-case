export const typeDefs = `#graphql
  enum PropertyStatus {
    DRAFT
    ACTIVE
    SOLD
    ARCHIVED
  }

  type Agent {
    id: ID!
    name: String!
    email: String!
  }

  type AuthPayload {
    token: String!
    agent: Agent!
  }

  type DashboardStats {
    statusBreakdown: [PropertyStatusCount!]!
    totalViewsAllTime: Int!
    totalActiveProperties: Int!
    totalViewsThisMonth: Int!
    propertiesSoldThisMonth: Int!
    recentSalesRevenueLast30Days: Float!
    averageDaysToSell: Int!
  }

  type PropertyStatusCount {
    status: PropertyStatus!
    count: Int!
  }

  type ViewsByDay {
    date: String!
    views: Int!
  }

  type DailyViewedProperty {
    id: ID!
    title: String!
    status: PropertyStatus!
    viewCount: Int!
  }

  type PropertyFlag {
    id: ID!
    status: String!
    confidenceScore: Int!
    primaryReason: String!
    triggeredRule: String!
    reviewReason: String
  }

  type PropertyViewEntry {
    id: ID!
    viewerType: String!
    visitorId: String
    viewedAt: String!
  }

  type Property {
    id: ID!
    title: String!
    description: String!
    addressLine1: String!
    city: String!
    postalCode: String!
    country: String!
    price: Float!
    surfaceSqm: Float!
    propertyType: String!
    status: PropertyStatus!
    createdAt: String!
    viewCount: Int!
    isFlagged: Boolean!
    flag: PropertyFlag
    latestFlag: PropertyFlag
    viewHistory(limit: Int = 20): [PropertyViewEntry!]!
  }

  type TopViewedProperty {
    id: ID!
    title: String!
    status: PropertyStatus!
    viewCount: Int!
  }

  type DetectionStats {
    totalFlagged: Int!
    autoDetected: Int!
    manuallyReported: Int!
  }

  type FlaggedProperty {
    id: ID!
    confidenceScore: Int!
    primaryReason: String!
    triggeredRule: String!
    property: Property!
  }

  type PropertyConnection {
    nodes: [Property!]!
    totalCount: Int!
  }

  input PropertyInput {
    title: String!
    description: String!
    addressLine1: String!
    city: String!
    postalCode: String!
    country: String!
    price: Float!
    surfaceSqm: Float!
    propertyType: String!
    status: PropertyStatus!
  }

  type Query {
    health: String!
    me: Agent
    dashboardStats: DashboardStats!
    dashboardViewsOverTime(rangeDays: Int = 14, offsetDays: Int = 0): [ViewsByDay!]!
    dashboardViewedPropertiesByDate(date: String!): [DailyViewedProperty!]!
    topViewedProperties(limit: Int = 5): [TopViewedProperty!]!
    flaggedProperties(limit: Int = 5): [FlaggedProperty!]!
    detectionStats: DetectionStats!
    properties(
      status: PropertyStatus
      flaggedOnly: Boolean
      fromDate: String
      toDate: String
      page: Int = 1
      pageSize: Int = 20
    ): PropertyConnection!
    property(id: ID!): Property
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    createProperty(input: PropertyInput!): Property!
    updateProperty(id: ID!, input: PropertyInput!): Property!
    deleteProperty(id: ID!): Boolean!
    recordPropertyView(propertyId: ID!, visitorId: String): Boolean!
    dismissFlag(flagId: ID!, reason: String!): Boolean!
    confirmScam(flagId: ID!, reason: String!): Boolean!
    restoreConfirmedScam(flagId: ID!, reason: String!): Boolean!
  }
`;
