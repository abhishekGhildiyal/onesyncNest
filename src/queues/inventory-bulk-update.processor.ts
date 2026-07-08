import { InventoryUpdateCoreHelper } from 'src/common/helpers/update-inventory/inventory-update-core.helper';
import type {
  InventoryBulkUpdateDbResult,
  InventoryBulkUpdateItemPayload,
  InventoryBulkUpdateJobData,
  InventoryBulkUpdateJobResult,
} from './inventory-bulk-update.types';

/** Parallel DB writes within a single bulk request. */
const ITEM_CONCURRENCY = Number(process.env.INVENTORY_BULK_UPDATE_ITEM_CONCURRENCY ?? 5);

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (!items.length) return;

  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        await fn(items[index], index);
      }
    }),
  );
}

/** Phase 1 only: all DB updates (Shopify deferred). */
export async function processBulkUpdateDb(
  updateCore: InventoryUpdateCoreHelper,
  { storeId, roleId, userId, items }: InventoryBulkUpdateJobData,
): Promise<InventoryBulkUpdateDbResult> {
  const ctx = { storeId, roleId, userId, deltaMode: true as const, deferShopify: true };

  const allErrors: { itemId: number; message: string }[] = [];
  const pendingShopifyJobs: any[] = [];
  let storeSnapshot: any;
  let processed = 0;

  await runWithConcurrency(items, ITEM_CONCURRENCY, async (item: InventoryBulkUpdateItemPayload) => {
    try {
      const result = await updateCore.runInventoryUpdates([item], ctx);

      processed += 1;

      if (result.shopifyJobs?.length) pendingShopifyJobs.push(...result.shopifyJobs);
      if (result.store) storeSnapshot = result.store;

      if (result.errors?.length) allErrors.push(...result.errors);
      if (result.failed && !result.errors?.length) {
        allErrors.push({ itemId: item.itemId, message: 'Bulk update failed' });
      }
    } catch (err: any) {
      allErrors.push({
        itemId: item.itemId,
        message: err?.message || 'Bulk update failed',
      });
    }
  });

  const failed = allErrors.length > 0 && allErrors.length >= items.length;
  if (failed) {
    const detail = allErrors.map((e) => `item ${e.itemId}: ${e.message}`).join('; ');
    throw new Error(detail);
  }

  if (allErrors.length) {
    console.warn(
      `Bulk update partial DB failures (${allErrors.length}/${items.length}):`,
      JSON.stringify(allErrors),
    );
  }

  return {
    processed,
    errors: allErrors,
    pendingShopifyJobs,
    storeSnapshot,
    storeId,
    total: items.length,
  };
}

/** Full job: DB saves, then awaited Shopify sync (used by BullMQ worker). */
export async function processBulkUpdateJob(
  updateCore: InventoryUpdateCoreHelper,
  data: InventoryBulkUpdateJobData,
): Promise<InventoryBulkUpdateJobResult> {
  const dbResult = await processBulkUpdateDb(updateCore, data);

  let shopifyProducts = 0;
  if (dbResult.pendingShopifyJobs.length) {
    shopifyProducts = new Set(dbResult.pendingShopifyJobs.map((j) => j.productId)).size;
    await updateCore.flushShopifyJobs(
      dbResult.pendingShopifyJobs,
      data.storeId,
      dbResult.storeSnapshot,
    );
  }

  return {
    processed: dbResult.processed,
    errors: dbResult.errors,
    failed: false,
    shopifyProducts,
  };
}
