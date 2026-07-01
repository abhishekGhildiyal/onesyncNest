/**
 * Web-only store sync (is_web_store=true).
 *
 * Spec:
 *   Linked — multiple web products grouped by price + size (qty = count in group).
 *   Unique — one web product per global row.
 */
import { buildShopifyPayload } from 'src/modules/shopify/shopify.helper';
import { isRetryableShopifySyncError } from '../shopify-sync-errors';
import { executeListingSync, unlistFromShopify, StoreSyncContext, DbEntrySelectionContext } from './sync-executor.helper';
import { buildWebOnlySyncTargets } from './web-only-sync-targets';
import { activeVariants } from './db-entry-selection';

/** L1 — one representative row per sync target (for pre-sync counts). */
export function resolveDbEntries(ctx: DbEntrySelectionContext) {
  return buildWebOnlySyncTargets(ctx.activeInventories, ctx.inventoryIdFilter).map((t) => t.inventory);
}

export async function syncWebOnlyStore(ctx: StoreSyncContext) {
  const { getVariantsForSync, productActiveVariants, productId } = ctx;
  let syncedCount = 0;
  const failedInventoryIds: number[] = [];
  const retryableInventoryIds: number[] = [];

  for (const target of buildWebOnlySyncTargets(ctx.activeInventories, ctx.inventoryIdFilter)) {
    const { inventory, type, groupQty, webOnlyGroupKey } = target;

    try {
      if (inventory.productList?.isStoreOnly) continue;

      let variants = getVariantsForSync(inventory, ctx.store, {
        productVariants: productActiveVariants,
        allInventories: ctx.activeInventories,
      });

      if (type === 'linked_group') {
        variants = variants.slice(0, 1);
      }

      const hasStock =
        type === 'linked_group' ? groupQty > 0 : activeVariants(inventory?.variants || []).length > 0;

      if (!hasStock) {
        const ids = inventory.shopifyId ? [String(inventory.shopifyId)] : [];
        await unlistFromShopify({ inventory, idsToDelete: ids, productId, ctx });
        continue;
      }

      const template = await ctx.loadTemplate(inventory.category);

      if (inventory.productList?.type && inventory.type !== inventory.productList.type) {
        await inventory.update({ type: inventory.productList.type });
        inventory.type = inventory.productList.type;
      }

      const listing = { isWeb: true, label: type === 'linked_group' ? 'web-group' : 'web' };
      const payload = buildShopifyPayload(inventory, variants, ctx.store, template, {
        allInventories: ctx.activeInventories,
        isWeb: true,
        groupQty: type === 'linked_group' ? groupQty : undefined,
        webOnlyGroupKey: webOnlyGroupKey || undefined,
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
    } catch (err: any) {
      const failId = inventory?.id;
      if (failId) {
        failedInventoryIds.push(failId);
        if (isRetryableShopifySyncError(err)) retryableInventoryIds.push(failId);
      }
      console.error(`[web-only] product ${productId}: failed target ${type} inventory ${failId} — ${err.message}`);
    }
  }

  return { syncedCount, failedInventoryIds, retryableInventoryIds };
}
