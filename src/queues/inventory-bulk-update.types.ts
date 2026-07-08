/** One inventory item delta inside a bulk-update job. */
export interface InventoryBulkUpdateItemPayload {
  itemId: number;
  variant: { id: number; [key: string]: unknown };
  [key: string]: unknown;
}

/** One BullMQ job = one API bulk-update request (may contain many items). */
export interface InventoryBulkUpdateJobData {
  storeId: number;
  roleId: number;
  userId: number;
  items: InventoryBulkUpdateItemPayload[];
}

export interface InventoryBulkUpdateJobResult {
  processed: number;
  errors: { itemId: number; message: string }[];
  failed: boolean;
  shopifyProducts?: number;
}

export interface InventoryBulkUpdateDbResult {
  processed: number;
  errors: { itemId: number; message: string }[];
  pendingShopifyJobs: any[];
  storeSnapshot?: any;
  storeId: number;
  total: number;
}
