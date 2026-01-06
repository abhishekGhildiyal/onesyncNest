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
