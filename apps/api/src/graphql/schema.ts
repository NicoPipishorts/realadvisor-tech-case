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
    totalActiveProperties: Int!
    totalViewsThisMonth: Int!
    propertiesSoldThisMonth: Int!
    averageDaysToSell: Int!
  }

  type ViewsByDay {
    date: String!
    views: Int!
  }

  type PropertyFlag {
    id: ID!
    confidenceScore: Int!
    primaryReason: String!
    triggeredRule: String!
  }

  type Property {
    id: ID!
    title: String!
    price: Float!
    status: PropertyStatus!
    createdAt: String!
    viewCount: Int!
    isFlagged: Boolean!
    flag: PropertyFlag
  }

  type TopViewedProperty {
    id: ID!
    title: String!
    status: PropertyStatus!
    viewCount: Int!
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

  type Query {
    health: String!
    me: Agent
    dashboardStats: DashboardStats!
    dashboardViewsOverTime(rangeDays: Int = 30): [ViewsByDay!]!
    topViewedProperties(limit: Int = 5): [TopViewedProperty!]!
    flaggedProperties(limit: Int = 5): [FlaggedProperty!]!
    properties(
      status: PropertyStatus
      fromDate: String
      toDate: String
      page: Int = 1
      pageSize: Int = 20
    ): PropertyConnection!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
  }
`;
