export type DashboardStatItem = {
  label: string;
  value: number;
};

export type TrendPoint = {
  date: string;
  views: number;
};

export type FlaggedListing = {
  id: string;
  confidenceScore: number;
  primaryReason: string;
  triggeredRule: string;
  property: {
    id: string;
    title: string;
    viewCount: number;
  };
};

export type TopViewedProperty = {
  id: string;
  title: string;
  status: string;
  viewCount: number;
};

export type DailyViewedProperty = {
  id: string;
  title: string;
  status: string;
  viewCount: number;
};
