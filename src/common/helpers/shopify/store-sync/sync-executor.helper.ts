/**
 * Layer 4 — shared Shopify API side effects for all store types.
 *
 * executeListingSync: create/update product, persist IDs, metafields, collections.
 * unlistFromShopify:   delete from Shopify and clear inventory.shopify_id.
 */
import { ShopifyService } from 'src/modules/shopify/shopify.service';
import { PersistShopifyVariantIdsHelper } from '../persist-shopify-variant-ids.helper';
import { isDualListingInventory } from '../shopify-sync-utils';

export type ListingPass = { isWeb: boolean; label: string };

/** Minimal context for L1 (which DB rows to sync). */
export type DbEntrySelectionContext = {
  store: any;
  activeInventories: any[];
  inventoryIdFilter: Set<number> | null;
};

/** Full context for L1–L4 sync execution. */
export type StoreSyncContext = DbEntrySelectionContext & {
  productId: number;
  bulkSync: boolean;
  shopifyService: ShopifyService;
  productActiveVariants: any[];
  getVariantsForSync: (inventory: any, store: any, opts: any) => any[];
  loadTemplate: (categoryId?: string | number | null) => Promise<any>;
  persistVariantIds: PersistShopifyVariantIdsHelper;
  syncResults?: any[];
};

export async function executeListingSync({
  inventory,
  listing,
  payload,
  activeVariants,
  template,
  ctx,
}: {
  inventory: any;
  listing: ListingPass;
  payload: any;
  activeVariants: any[];
  template: any;
  ctx: StoreSyncContext;
}) {
  const { shopifyService, productId, bulkSync, persistVariantIds } = ctx;
  const { isWeb, label } = listing;

  if (!payload?.product?.variants?.length) {
    console.warn(
      `[store-sync] product ${productId}: skipped inventory ${inventory.id} (${label}) — no syncable variants`,
    );
    return { synced: false as const };
  }

  const result = await shopifyService.syncProduct(payload);
  if (!result?.product?.id) {
    throw new Error(`Shopify sync returned no product ID (inventory ${inventory.id}, ${label})`);
  }

  const shopifyProductId = result.product.id;

  // Web half of dual listing: no shopify_id on DB row (normal unique + item-level stores).
  const virtualWebListing = isWeb && isDualListingInventory(inventory, ctx.store);

  if (!virtualWebListing) {
    await inventory.update({
      shopifyId: String(shopifyProductId),
      shopifyStatus: 'Listed',
    });
  }

  // POS → variant_id; web → web_variant_id (matched by barcode).
  await persistVariantIds.persistShopifyVariantIds({
    shopifyResult: result,
    localVariants: activeVariants,
    isWeb,
  });

  // Bulk sync skips metafields on POS pass to reduce API calls; web pass always runs them.
  const skipMeta = bulkSync && !isWeb;
  if (!skipMeta) {
    try {
      if (inventory.productList) {
        const shouldSyncSizeLocale =
          activeVariants.length > 0 &&
          activeVariants.every((variant) => {
            const condition = String(variant.option2Value || '')
              .trim()
              .toLowerCase();
            return !condition || condition === 'new';
          });

        await shopifyService.upsertStockXMetafields(shopifyProductId, inventory.productList, {
          syncSizeLocale: shouldSyncSizeLocale,
        });
      }

      const shopifyVariants = result.product.variants || [];
      for (const av of activeVariants) {
        const sv = shopifyVariants.find((s: any) => s.sku === inventory.skuNumber && s.option1 === av.option1Value);
        if (sv) await shopifyService.upsertVariantMetafields(sv.id, av);
      }

      if (template?.name) {
        const collection = await shopifyService.findCollectionByTitle(template.name);
        if (collection) await shopifyService.addToCollection(shopifyProductId, collection.id);
      }
    } catch (metaErr: any) {
      console.warn(
        `[store-sync] product ${productId}: metafields failed for ${inventory.id} (${label}) — ${metaErr.message}`,
      );
    }
  }

  if (ctx.syncResults) {
    ctx.syncResults.push({
      inventoryId: inventory.id,
      scope: label,
      shopifyId: shopifyProductId,
      success: true,
    });
  }

  return { synced: true as const, shopifyProductId, label };
}

export async function unlistFromShopify({
  inventory,
  idsToDelete,
  productId,
  ctx,
}: {
  inventory: any;
  idsToDelete: string[];
  productId: number;
  ctx: StoreSyncContext;
}) {
  if (!idsToDelete.length) return;

  console.log(`[store-sync] product ${productId}: unlisting ${idsToDelete.join(', ')} (inventory ${inventory.id})`);
  await ctx.shopifyService.deleteItems(idsToDelete, productId);
  await inventory.update({ shopifyId: null, shopifyStatus: 'Unlisted' });
}
