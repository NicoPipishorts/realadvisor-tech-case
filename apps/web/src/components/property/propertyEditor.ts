export type PropertyStatus = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED';

export type PropertyFormState = {
  title: string;
  description: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  country: string;
  price: string;
  surfaceSqm: string;
  propertyType: string;
  status: PropertyStatus;
};

export const statusOptions: Array<{
  label: string;
  value: PropertyStatus;
  description: string;
}> = [
  {
    label: 'Draft',
    value: 'DRAFT',
    description: 'Keep it private while preparing the listing.'
  },
  {
    label: 'Active',
    value: 'ACTIVE',
    description: 'Publish it as a live listing for buyers.'
  },
  {
    label: 'Sold',
    value: 'SOLD',
    description: 'Mark the transaction as completed.'
  },
  {
    label: 'Archived',
    value: 'ARCHIVED',
    description: 'Remove it from the active portfolio without deleting it.'
  }
];

export const propertyTypeOptions = ['apartment', 'house', 'loft', 'villa', 'studio'];
