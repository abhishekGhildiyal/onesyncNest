/**
 * Item-level store sync (is_unique_product_store, not web/used-only).
 *
 * Spec: every global row → 1 Web + 1 POS on Shopify — no catalog grouping.
 */
import { buildShopifyPayload, resolveShopifyHandle } from 'src/modules/shopify/shopify.helper';
import { isRetryableShopifySyncError } from '../shopify-sync-errors';
import { activeVariants } from './db-entry-selection';
import { executeListingSync, unlistFromShopify, StoreSyncContext, DbEntrySelectionContext } from './sync-executor.helper';

/** L1 — all global rows; catalog web row is never synced on item-level stores. */
export function resolveDbEntries(ctx: DbEntrySelectionContext) {
  const idFilter = ctx.inventoryIdFilter?.size ? ctx.inventoryIdFilter : null;
  const entries: any[] = [];

  for (const inv of ctx.activeInventories) {
    if (inv.publishedScope !== 'global') continue;
    if (idFilter && !idFilter.has(Number(inv.id))) continue;
    const hasActive = activeVariants(inv?.variants || []).length > 0;
    if (!inv.shopifyId && !hasActive) continue;
    entries.push(inv);
  }
  return entries;
}

function resolveListings() {
  return [
    { isWeb: false, label: 'pos' },
    { isWeb: true, label: 'web' },
  ];
}

export async function syncItemLevelStore(ctx: StoreSyncContext) {
  const { getVariantsForSync, productActiveVariants, productId } = ctx;
  let syncedCount = 0;
  const failedInventoryIds: number[] = [];
  const retryableInventoryIds: number[] = [];

  for (const inventory of resolveDbEntries(ctx)) {
    try {
      const variants = getVariantsForSync(inventory, ctx.store, {
        productVariants: productActiveVariants,
        allInventories: ctx.activeInventories,
      });

      if (!variants.length) {
        const ids: string[] = inventory.shopifyId ? [String(inventory.shopifyId)] : [];
        const webHandle = resolveShopifyHandle(inventory, ctx.store, {
          allInventories: ctx.activeInventories,
          isWeb: true,
        });
        if (webHandle) {
          const webProduct = await ctx.shopifyService.findProductByHandle(webHandle);
          if (webProduct?.id) ids.push(String(webProduct.id));
        }
        await unlistFromShopify({ inventory, idsToDelete: ids, productId, ctx });
        continue;
      }

      const template = await ctx.loadTemplate(inventory.category);

      for (const listing of resolveListings()) {
        if (listing.isWeb && inventory.productList?.type && inventory.type !== inventory.productList.type) {
          await inventory.update({ type: inventory.productList.type });
          inventory.type = inventory.productList.type;
        }

        const payload = buildShopifyPayload(inventory, variants, ctx.store, template, {
          allInventories: ctx.activeInventories,
          isWeb: listing.isWeb,
        });
        const result = await executeListingSync({
          inventory,
          listing,
          payload,
          activeVariants: variants,
          template,
          ctx,
        });
        if (result.synced) syncedCount++;
      }
    } catch (err: any) {
      failedInventoryIds.push(inventory.id);
      if (isRetryableShopifySyncError(err)) retryableInventoryIds.push(inventory.id);
      console.error(`[item-level] product ${productId}: failed inventory ${inventory.id} — ${err.message}`);
    }
  }

  return { syncedCount, failedInventoryIds, retryableInventoryIds };
}
