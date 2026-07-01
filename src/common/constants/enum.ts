export enum BRAND_TYPE {
  PUBLIC = 'Public',
  PRIVATE = 'Private',
}

export enum BRAND_STATUS {
  ACTIVE = 'Active',
  INACTIVE = 'InActive',
}

export enum PACKAGE_STATUS {
  ACCESS = 'Access',
  DRAFT = 'Draft',
  CREATED = 'Created',
  SUBMITTED = 'Submitted', //open request for seller
  INITIATED = 'Initiated',
  IN_REVIEW = 'Review',
  CONFIRM = 'Confirm',
  STORE_CONFIRM = 'Store Confirm',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CLOSE = 'Closed',
  CANCELLED = 'Cancelled',
}

export enum PAYMENT_STATUS {
  IN_PROCESS = 'In Process',
  CONFIRMED = 'Confirmed',
  PENDING = 'Pending',
}

export enum ORDER_ITEMS {
  ITM_RECEIVED = 'Item Received',
  NOT_RECEIVED = 'Not Received',
}

export const VARIANT_STATUS = {
  INACTIVE: 0,
  ACTIVE: 1,
  SOLD: 2,
  PAID: 3,
  NEEDS_APPROVAL: 4,
  WITHDRAWAL_REQUESTED: 5,
  WITHDRAWN: 6,
  REJECTED: 7,
  DELETED: 8,
  IN_TRANSFER: 9,
} as const;

export const LABEL_TYPES = {
  INVENTORY: 'inventory',
  PRODUCT: 'product',
  LOCATION: 'location',
} as const;
