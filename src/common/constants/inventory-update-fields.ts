/**
 * Inventory update field registry (config only).
 *
 * Merge rule is enforced in inventory update core:
 *   undefined → skip   |   null → clear   |   value → set
 */

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

export const SHOPIFY_ACTION = {
  NONE: 'NONE',
  RESYNC: 'RESYNC',
  DELETE: 'DELETE',
} as const;

/** Frontend / legacy payload keys → canonical field name */
export const ALIASES: Record<string, string> = {
  salesChannelList: 'channelDisplayName',
  consignerUser: 'consignerUserId',
  channelObj: 'channelDisplayName',
  storeLocationMapping: 'storeLocationMappingId',
  user_id: 'consignerUserId',
  userId: 'consignerUserId',
  purchase_order_no: 'vendorOrderNo',
  vendor_order_no: 'vendorOrderNo',
  vendorPO: 'vendorOrderNo',
  payment_form: 'paymentForm',
  purchase_date: 'purchaseDate',
  local_order_no: 'localOrderNo',
  purchase_from_vendor: 'purchaseFromVendor',
  item_tags: 'itemTags',
  variant_image: 'variantImage',
};

/** Patch keys on the inventory table */
export const INVENTORY_FIELDS = new Set([
  'soldOn',
  'auctionEnabled',
  'isVisible',
  'linkedImage',
  'consignerUserId',
  'accountType',
]);

/** Patch keys on the variant table */
export const VARIANT_FIELDS = new Set([
  'status',
  'price',
  'compare_at_price',
  'weight',
  'cost',
  'fee',
  'payout',
  'option1Value',
  'option2Value',
  'option3Value',
  'linkedImage',
  'variantImage',
  'itemTags',
  'location',
  'quantity',
  'barcode',
  'web_barcode',
  'note',
  'paymentForm',
  'purchaseDate',
  'vendorOrderNo',
  'localOrderNo',
  'purchaseFromVendor',
  'storeLocationMappingId',
  'channelId',
  'channelDisplayName',
  'orderId',
  'discount',
  'payoutManual',
  'customFields',
]);

/** If any of these change → queue Shopify GraphQL resync */
export const SHOPIFY_SYNC_FIELDS = new Set([
  'linkedImage',
  'consignerUserId',
  'accountType',
  'price',
  'compare_at_price',
  'weight',
  'option1Value',
  'option2Value',
  'option3Value',
  'variantImage',
  'itemTags',
  'location',
  'quantity',
  'barcode',
  'web_barcode',
  'customFields',
]);

/** Delta PATCH keys that should trigger Shopify (includes status / visibility) */
export const SHOPIFY_PATCH_FIELDS = new Set(['status', 'isVisible', ...SHOPIFY_SYNC_FIELDS]);

/** Statuses that should not stay listed on Shopify */
export const UNLIST_STATUSES = new Set([
  VARIANT_STATUS.INACTIVE,
  VARIANT_STATUS.SOLD,
  VARIANT_STATUS.PAID,
  VARIANT_STATUS.NEEDS_APPROVAL,
  VARIANT_STATUS.WITHDRAWAL_REQUESTED,
  VARIANT_STATUS.WITHDRAWN,
  VARIANT_STATUS.REJECTED,
  VARIANT_STATUS.DELETED,
  VARIANT_STATUS.IN_TRANSFER,
]);
