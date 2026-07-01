/**
 * Normal store sync (!is_web_store && !is_used_only_products_store).
 *
 * DB layout:
 *   Linked — 1 catalog web row + N global (POS) rows per size/qty.
 *   Unique — 1 global row (linked_image=true); no separate web DB row.
 *
 * Shopify layout:
 *   Linked — catalog → web product; globals → POS products.
 *   Unique — one global row → POS product + virtual web product (handle -web suffix).
 *            shopify_id on the DB row is the POS listing only.
 */
import { buildShopifyPayload, resolveShopifyHandle } from 'src/modules/shopify/shopify.helper';
import { isUniqueGlobalInventory, resolveIsWebSync } from '../shopify-sync-utils';
import { isRetryableShopifySyncError } from '../shopify-sync-errors';
import { shouldIncludeInventory, findCatalogWeb } from './db-entry-selection';
import {
  executeListingSync,
  unlistFromShopify,
  StoreSyncContext,
  DbEntrySelectionContext,
  ListingPass,
} from './sync-executor.helper';

/** L1 — catalog web + all global rows (skips published_scope=web unique companions). */
export function resolveDbEntries(ctx: DbEntrySelectionContext) {
  const idFilter = ctx.inventoryIdFilter?.size ? ctx.inventoryIdFilter : null;
  const catalogWeb = findCatalogWeb(ctx.activeInventories);
  const entries: any[] = [];

  if (catalogWeb && shouldIncludeInventory(catalogWeb, ctx.activeInventories, catalogWeb, idFilter)) {
    entries.push(catalogWeb);
  }
  for (const inv of ctx.activeInventories) {
    if (inv === catalogWeb || inv.publishedScope === 'web') continue;
    if (shouldIncludeInventory(inv, ctx.activeInventories, catalogWeb, idFilter)) entries.push(inv);
  }
  return entries;
}

/** Unique global always gets its own web listing (separate from catalog web). */
function isDualListing(inventory: any) {
  return isUniqueGlobalInventory(inventory);
}

/** L2 — one pass for linked; two passes (pos + web) for unique globals. */
function resolveListings(inventory: any, ctx: StoreSyncContext): ListingPass[] {
  if (isDualListing(inventory)) {
    return [
      { isWeb: false, label: 'pos' },
      { isWeb: true, label: 'web' },
    ];
  }
  const isWeb = resolveIsWebSync(inventory, ctx.store);
  return [{ isWeb, label: isWeb ? 'web' : 'pos' }];
}

export async function syncNormalStore(ctx: StoreSyncContext) {
  const { getVariantsForSync, productActiveVariants, productId } = ctx;
  let syncedCount = 0;
  const failedInventoryIds: number[] = [];
  const retryableInventoryIds: number[] = [];

  for (const inventory of resolveDbEntries(ctx)) {
    try {
      if (inventory.productList?.isStoreOnly && inventory.publishedScope === 'web') continue;

      const variants = getVariantsForSync(inventory, ctx.store, {
        productVariants: productActiveVariants,
        allInventories: ctx.activeInventories,
      });

      if (!variants.length) {
        const ids: string[] = inventory.shopifyId ? [String(inventory.shopifyId)] : [];
        // Dual unique: web product has no shopify_id on the row — look up by handle.
        if (isDualListing(inventory)) {
          const webHandle = resolveShopifyHandle(inventory, ctx.store, {
            allInventories: ctx.activeInventories,
            isWeb: true,
          });
          if (webHandle) {
            const webProduct = await ctx.shopifyService.findProductByHandle(webHandle);
            if (webProduct?.id) ids.push(String(webProduct.id));
          }
        }
        await unlistFromShopify({ inventory, idsToDelete: ids, productId, ctx });
        continue;
      }

      const template = await ctx.loadTemplate(inventory.category);

      for (const listing of resolveListings(inventory, ctx)) {
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
      console.error(`[normal-store] product ${productId}: failed inventory ${inventory.id} — ${err.message}`);
    }
  }

  return { syncedCount, failedInventoryIds, retryableInventoryIds };
}
