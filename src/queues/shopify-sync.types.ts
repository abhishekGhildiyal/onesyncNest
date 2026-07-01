export interface ShopifySyncJobData {
  productId: number;
  storeId: number;
  bulkSync?: boolean;
  useGraphql?: boolean;
  forceResync?: boolean;
  inventoryIds?: number[];
}
