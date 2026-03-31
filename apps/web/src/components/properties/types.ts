export const propertyStatuses = [
  { label: 'All', value: null },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Sold', value: 'SOLD' },
  { label: 'Archived', value: 'ARCHIVED' },
  { label: 'Draft', value: 'DRAFT' }
] as const;

export const flaggedPropertyFilter = { label: 'Flagged', value: 'FLAGGED' } as const;

export type PropertyStatusFilterValue =
  | (typeof propertyStatuses)[number]['value']
  | typeof flaggedPropertyFilter.value;

export type PropertyListItem = {
  id: string;
  title: string;
  price: number;
  status: string;
  viewCount: number;
  createdAt: string;
  isCoListed: boolean;
  coListingCount: number;
  isFlagged: boolean;
  flag: null | {
    confidenceScore: number;
    primaryReason: string;
  };
};
