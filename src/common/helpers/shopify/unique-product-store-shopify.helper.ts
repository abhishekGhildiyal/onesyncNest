import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { ProductRepository } from 'src/db/repository/product.repository';
import { ShopifyService } from 'src/modules/shopify/shopify.service';
import {
  isActiveVariant,
  isLinkedImageFlag,
  isUniqueProductStore,
  resolveStoreSyncType,
} from './shopify-sync-utils';
import { resolveDbEntriesForStore } from './store-sync';
import { findCatalogWeb } from './store-sync/db-entry-selection';

@Injectable()
export class UniqueProductStoreShopifyHelper {
  constructor(private readonly productRepo: ProductRepository) {}

  isUniqueStore(store: { is_unique_product_store?: boolean }) {
    return isUniqueProductStore(store);
  }

  activeVariants(variants: any[] = []) {
    return variants.filter((v) => isActiveVariant(v));
  }

  /** Pre-sync check: which rows need syncing (delegates L1 to store-sync). */
  prepareUniqueProductSync(
    inventories: any[],
    store: {
      is_unique_product_store?: boolean;
      is_web_store?: boolean;
      is_used_only_products_store?: boolean;
    },
    { inventoryIdFilter = null as Set<number> | null } = {},
  ) {
    const rows = inventories;
    const storeType = resolveStoreSyncType(store);
    const toSync = resolveDbEntriesForStore({
      store,
      activeInventories: rows,
      inventoryIdFilter: inventoryIdFilter?.size ? inventoryIdFilter : null,
    });

    const catalogWeb = findCatalogWeb(rows);

    if (toSync.length === 0 && rows.length > 0) {
      console.log(
        `[prepareProductSync] product ${rows[0]?.productId}: nothing to sync — ` +
          `storeType=${storeType}, ` +
          `catalogWeb=${catalogWeb ? `id ${catalogWeb.id} shopifyId=${catalogWeb.shopifyId ?? 'null'}` : 'none'}, ` +
          `rows=${rows.length}`,
      );
    }

    return { inventories: rows, toSync };
  }

  /**
   * Which local variants to send for a given inventory row.
   *   - Catalog web: linked globals only (unique globals excluded).
   *   - Unique global: that row's own variants only.
   */
  getVariantsForSync(
    inventory: any,
    _store: { is_unique_product_store?: boolean },
    { productVariants = [] as any[], allInventories = [] as any[] } = {},
  ) {
    if (inventory.publishedScope === 'web' && isLinkedImageFlag(inventory.linkedImage)) {
      const global = allInventories.find(
        (g) => g.publishedScope === 'global' && g.webBarcode && g.webBarcode === inventory.webBarcode,
      );
      return this.activeVariants(global?.variants || inventory.variants);
    }

    if (inventory.publishedScope === 'web') {
      const linkedGlobals = allInventories.filter(
        (g) => g.publishedScope === 'global' && !isLinkedImageFlag(g.linkedImage),
      );
      const seen = new Set<string>();
      const variants: any[] = [];
      for (const global of linkedGlobals) {
        for (const v of this.activeVariants(global.variants || [])) {
          const key = `${v.option1Value || ''}/${v.option2Value || ''}/${v.option3Value || ''}`;
          if (seen.has(key)) continue;
          seen.add(key);
          variants.push(v);
        }
      }
      if (variants.length) return variants;
      return this.activeVariants(productVariants).filter((v) => !isLinkedImageFlag(v.linkedImage));
    }

    return this.activeVariants(inventory.variants);
  }

  async findUniquePair(inventory: any, scope: string) {
    if (!inventory?.webBarcode) return null;
    return this.productRepo.inventoryModel.findOne({
      where: {
        storeId: inventory.storeId,
        productId: inventory.productId,
        webBarcode: inventory.webBarcode,
        publishedScope: scope,
        linkedImage: true,
      },
    });
  }

  async deleteUniqueListings(shopifyService: ShopifyService, inventory: any, productId: number) {
    const targets = [inventory];
    const otherScope = inventory.publishedScope === 'global' ? 'web' : 'global';
    const pair = await this.findUniquePair(inventory, otherScope);
    if (pair) targets.push(pair);

    const seen = new Set<number>();
    for (const row of targets) {
      if (!row?.shopifyId || seen.has(row.id)) continue;
      seen.add(row.id);
      const results = await shopifyService.deleteItems([row.shopifyId], productId);
      const result = results[0];
      if (result?.success || result?.message === 'Not found') {
        await this.productRepo.inventoryModel.update(
          { shopifyId: null, shopifyStatus: 'Unlisted' },
          { where: { id: row.id } },
        );
      }
    }
  }

  async expandSyncIds(inventoryIds: Set<number>, store: { is_unique_product_store?: boolean }) {
    if (!this.isUniqueStore(store) || !inventoryIds?.size) return inventoryIds;

    const expanded = new Set(inventoryIds);
    for (const id of inventoryIds) {
      const inv = await this.productRepo.inventoryModel.findByPk(id);
      if (!inv?.webBarcode || !inv.linkedImage) continue;

      const pairScope = inv.publishedScope === 'global' ? 'web' : 'global';
      const pair = await this.findUniquePair(inv, pairScope);
      if (pair) expanded.add(Number(pair.id));
    }
    return expanded;
  }

  async syncImagesFromVariant({
    inventory,
    variant,
  }: {
    inventory: any;
    variant: any;
    store?: { is_unique_product_store?: boolean };
    transaction?: Transaction;
  }) {
    if (!isLinkedImageFlag(inventory?.linkedImage)) return;

    const image = String(variant?.variantImage ?? variant?.variant_image ?? '').trim();
    if (!image) return;

    inventory.set('image', image);
  }
}
