/**
 * Used-only store sync (is_used_only_products_store=true).
 *
 * Only global inventory rows are synced; each is published as a web product on Shopify.
 * No catalog web row and no POS channel.
 */
import { buildShopifyPayload } from 'src/modules/shopify/shopify.helper';
import { resolveIsWebSync } from '../shopify-sync-utils';
import { isRetryableShopifySyncError } from '../shopify-sync-errors';
import { activeVariants } from './db-entry-selection';
import { executeListingSync, unlistFromShopify, StoreSyncContext, DbEntrySelectionContext } from './sync-executor.helper';

/** L1 — global rows with active variants, or already listed (for update/unlist). */
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

export async function syncUsedOnlyStore(ctx: StoreSyncContext) {
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
        const ids = inventory.shopifyId ? [String(inventory.shopifyId)] : [];
        await unlistFromShopify({ inventory, idsToDelete: ids, productId, ctx });
        continue;
      }

      const template = await ctx.loadTemplate(inventory.category);
      const isWeb = resolveIsWebSync(inventory, ctx.store);
      const listing = { isWeb, label: 'web' };
      const payload = buildShopifyPayload(inventory, variants, ctx.store, template, {
        allInventories: ctx.activeInventories,
        isWeb,
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
      failedInventoryIds.push(inventory.id);
      if (isRetryableShopifySyncError(err)) retryableInventoryIds.push(inventory.id);
      console.error(`[used-only] product ${productId}: failed inventory ${inventory.id} — ${err.message}`);
    }
  }

  return { syncedCount, failedInventoryIds, retryableInventoryIds };
}
